import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 5 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function report() {
  const manufacturers = await prisma.manufacturer.findMany({
    include: {
      models: {
        include: {
          trims: true
        }
      }
    }
  });

  const stats = manufacturers.map(m => {
    let activeCars = 0;
    for (const model of m.models) {
      for (const trim of model.trims) {
        activeCars += trim.activeCount || 0;
      }
    }
    return { name: m.name, activeCars };
  });

  stats.sort((a, b) => b.activeCars - a.activeCars);

  console.log('--- ACTIVE CARS ON ROAD BY MANUFACTURER ---');
  let totalActive = 0;
  for (let i = 0; i < stats.length; i++) {
    totalActive += stats[i].activeCars;
    if (i < 20) {
      console.log(`${i+1}. ${stats[i].name.padEnd(20)} : ${stats[i].activeCars.toLocaleString()}`);
    }
  }
  console.log(`\nTotal Active Cars on Road: ${totalActive.toLocaleString()}`);
}

report().finally(() => prisma.$disconnect());
