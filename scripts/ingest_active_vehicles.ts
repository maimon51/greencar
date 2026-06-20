import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 5 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fetchActiveVehicles(offset: number) {
  const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=053cea08-09bc-40ec-8f7a-156f0677aff3&limit=32000&offset=${offset}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const data = await response.json();
  return data.result.records;
}

async function run() {
  console.log('Fetching Active Vehicles from API via Pagination...');
  
  const tally = new Map<string, number>();

  let offset = 0;
  let totalRecords = 0;
  
  while (true) {
    console.log(`Fetching from offset ${offset}...`);
    try {
      const records = await fetchActiveVehicles(offset);
      if (!records || records.length === 0) break;
      
      totalRecords += records.length;
      
      for (const row of records) {
        const tozeret = row.tozeret_cd;
        const degem = row.degem_cd;
        const year = row.shnat_yitzur;
        
        if (tozeret && degem && year) {
          const key = `${tozeret}|${degem}|${year}`;
          tally.set(key, (tally.get(key) || 0) + 1);
        }
      }
      
      offset += records.length;
      
      // Safety break to not kill the VM
      if (totalRecords > 4000000) break;
    } catch (e) {
      console.error('Fetch error:', e);
      break;
    }
  }

  console.log(`Finished processing ${totalRecords} records from API.`);
  console.log(`Aggregated into ${tally.size} unique Model+Year combinations.`);
  
  console.log('Fetching all TrimLevels from database...');
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
    
    if (batchData.length >= 100) {
      await Promise.all(batchData);
      batchData = [];
      console.log(`Committed ${updatedDbRows} trim updates to DB...`);
    }
  }
  
  if (batchData.length > 0) {
    await Promise.all(batchData);
    console.log(`Committed ${updatedDbRows} trim updates to DB...`);
  }
  
  console.log(`Successfully mapped and updated activeCount for ${updatedDbRows} Trims!`);
  prisma.$disconnect();
}

run();
