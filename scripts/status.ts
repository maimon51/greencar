import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 5 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function status() {
  const m = await prisma.carModel.count();
  const t = await prisma.trimLevel.count();
  const mEnriched = await prisma.carModel.count({ where: { extraSpecs: { not: null } } });
  const tPrices = await prisma.trimLevel.count({ where: { msrp: { not: null } } });
  const tActive = await prisma.trimLevel.count({ where: { activeCount: { gt: 0 } } });
  
  console.log('--- DATABASE STATUS ---');
  console.log(`Total Models: ${m}`);
  console.log(`Models Enriched: ${mEnriched} (${Math.round((mEnriched/m)*100)}%)`);
  console.log(`Total Trims: ${t}`);
  console.log(`Trims with MSRP: ${tPrices}`);
  console.log(`Trims with Active Count: ${tActive}`);
}

status().finally(() => prisma.$disconnect());
