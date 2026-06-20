import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const ms = await prisma.manufacturer.findMany({take:15});
  ms.forEach(m => console.log(`ID: ${m.id} | Name: "${m.name}" | Country: "${m.country}"`));
}
run().catch(console.error).finally(()=>prisma.$disconnect());
