import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import https from 'https';

import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 5 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log('Downloading Active Vehicles CSV...');
  
  const filePath = '/tmp/rechev_peil.csv';
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }
  
  // Create an in-memory map: "tozeret_cd|degem_cd|shnat_yitzur" -> count
  const tally = new Map<string, number>();

  let processedCount = 0;
  
  // Stream directly into csv-parser
  fs.createReadStream(filePath)
    .pipe(csv({ separator: '|' }))
    .on('data', (row) => {
      processedCount++;
      if (processedCount % 100000 === 0) {
        console.log(`Streamed ${processedCount} rows...`);
      }
      
      const tozeret = row.tozeret_cd;
      const degem = row.degem_cd;
      const year = row.shnat_yitzur;
      
      if (tozeret && degem && year) {
        const key = `${tozeret}|${degem}|${year}`;
        tally.set(key, (tally.get(key) || 0) + 1);
      }
    })
    .on('end', async () => {
      console.log(`Finished processing ${processedCount} records from CSV.`);
      console.log(`Aggregated into ${tally.size} unique Model+Year combinations.`);
      
      console.log('Fetching all TrimLevels from database...');
      // We need to map our TrimLevels to the keys
      const trims = await prisma.trimLevel.findMany({
        include: {
          carModel: {
            include: { manufacturer: true }
          }
        }
      });
      
      console.log(`Found ${trims.length} Trims in DB. Updating activeCounts...`);
      let updatedDbRows = 0;
      let batchData = [];
      
      for (const trim of trims) {
        const key = `${trim.carModel.manufacturer.code}|${trim.carModel.code}|${trim.year}`;
        const count = tally.get(key) || 0;
        
        if (count > 0) {
          batchData.push(
            prisma.trimLevel.update({
              where: { id: trim.id },
              data: { activeCount: count }
            })
          );
          updatedDbRows++;
        }
        
        if (batchData.length >= 500) {
          await prisma.$transaction(batchData);
          batchData = [];
          console.log(`Committed ${updatedDbRows} trim updates to DB...`);
        }
      }
      
      if (batchData.length > 0) {
        await prisma.$transaction(batchData);
        console.log(`Committed ${updatedDbRows} trim updates to DB...`);
      }
      
      console.log(`Successfully mapped and updated activeCount for ${updatedDbRows} Trims!`);
      prisma.$disconnect();
    });
}

run();
