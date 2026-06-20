import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 1 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const recallCount = await prisma.recall.count();
  const carCount = await prisma.carModel.count();
  const imageCount = await prisma.carModel.count({ where: { imageUrl: { not: null } } });
  
  console.log(`Recalls: ${recallCount}`);
  console.log(`Images Enriched: ${imageCount} / ${carCount}`);
}
run().finally(() => prisma.$disconnect());
