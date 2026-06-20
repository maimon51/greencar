import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 5 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const models = await prisma.carModel.findMany({
    where: { imageUrl: { not: null } },
    take: 10
  });
  console.log(`Found ${models.length} models with images:`);
  models.forEach(m => console.log(`${m.name} -> ${m.imageUrl}`));
}
run().catch(console.error).finally(()=>prisma.$disconnect());
