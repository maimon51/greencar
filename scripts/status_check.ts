import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import https from 'https';
import 'dotenv/config';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fetchGovTotal(): Promise<number> {
  const url = 'https://data.gov.il/api/3/action/datastore_search?resource_id=142afde2-6228-49f9-8a29-9b6c3a0cbe40&limit=1';
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.result.total || 0);
        } catch (e) {
          resolve(0);
        }
      });
    }).on('error', err => reject(err));
  });
}

async function run() {
  while (true) {
    const totalGovRecords = await fetchGovTotal();
    const dbTrims = await prisma.trimLevel.count();
    const dbModels = await prisma.carModel.count();
    const dbBrands = await prisma.manufacturer.count();
    
    const modelsWithSpecs = await prisma.carModel.count({
      where: { extraSpecs: { not: null } }
    });
    
    const modelsWithReliability = await prisma.carModel.count({
      where: { reliabilityScore: { not: null } }
    });

    console.log(`\n=== IMPORTERS STATUS REPORT [${new Date().toISOString()}] ===`);
    console.log(`1. GOV.IL API (Trims): ${dbTrims} / ${totalGovRecords} (${((dbTrims/totalGovRecords)*100).toFixed(1)}%)`);
    console.log(`   - Total Car Models Extracted: ${dbModels}`);
    console.log(`   - Total Brands Extracted: ${dbBrands}`);
    console.log(`2. Enrichment - Extra Specs (Global/Local): ${modelsWithSpecs} / ${dbModels} (${((modelsWithSpecs/dbModels)*100).toFixed(1)}%)`);
    console.log(`3. Enrichment - Reliability Scores: ${modelsWithReliability} / ${dbModels} (${((modelsWithReliability/dbModels)*100).toFixed(1)}%)`);
    
    // Sleep for 2 minutes (120,000 ms)
    await new Promise(r => setTimeout(r, 120000));
  }
}

run()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
