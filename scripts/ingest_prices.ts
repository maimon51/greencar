import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 5 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fetchPrices(offset: number) {
  const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=39f455bf-6db0-4926-859d-017f34eacbcb&limit=32000&offset=${offset}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  return data.result.records;
}

async function run() {
  console.log('Fetching Official Car Prices from Gov.il...');
  let offset = 0;
  let totalRecords = 0;
  let updatedCount = 0;

  while (true) {
    const records = await fetchPrices(offset);
    if (!records || records.length === 0) break;

    totalRecords += records.length;
    console.log(`Fetched ${records.length} price records. Processing...`);

    // Fetch all CarModels into memory to avoid hitting the DB 32,000 times
    const carModels = await prisma.carModel.findMany({
      include: { manufacturer: true }
    });
    
    // Create map of tozeret_cd_degem_cd -> carModel.id
    const carModelMap = new Map<string, number>();
    for (const cm of carModels) {
      carModelMap.set(`${cm.manufacturer.code}_${cm.code}`, cm.id);
    }

    let batchData = [];

    // We process sequentially or in batches
    for (const record of records) {
      const { tozeret_cd, degem_cd, shnat_yitzur, mehir } = record;
      if (!mehir) continue;

      // Find the CarModel id from memory
      const carModelId = carModelMap.get(`${tozeret_cd}_${degem_cd}`);

      if (carModelId) {
        batchData.push(
          prisma.trimLevel.updateMany({
            where: {
              carModelId: carModelId,
              year: shnat_yitzur
            },
            data: {
              msrp: mehir
            }
          })
        );
        
        if (batchData.length >= 100) {
           const resArr = await Promise.all(batchData);
           for (const res of resArr) {
             if (res.count > 0) updatedCount += res.count;
           }
           batchData = [];
           // Sleep to prevent neon rate limiting
           await new Promise(r => setTimeout(r, 100));
        }
      }
    }
    
    if (batchData.length > 0) {
       const resArr = await Promise.all(batchData);
       for (const res of resArr) {
         if (res.count > 0) updatedCount += res.count;
       }
    }
    
    offset += records.length;
  }

  console.log(`Finished processing ${totalRecords} price records.`);
  console.log(`Updated MSRP for ${updatedCount} TrimLevels in DB!`);
}

run().finally(() => prisma.$disconnect());
