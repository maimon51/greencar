import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Mock data generator for known issues and reliability
// In production, this would scrape CarIssues.net or use an LLM API
function generateMockReliabilityData(brand: string, model: string) {
  const issuesList = [
    "בלאי מואץ ברפידות בלם קדמיות",
    "התראה שגויה של חיישן לחץ אוויר (TPMS)",
    "רעשים מתיבת ההילוכים בהעברה לראשון",
    "תקלת תוכנה במערכת המולטימדיה המקורית",
    "נזילת שמן קלה ממכסה השסתומים (מופיע לרוב מעל 100,000 ק״מ)",
    "שחיקה מהירה של תותבי משולשים קדמיים",
    "צריכת שמן מוגברת במנועי טורבו מוקדמים"
  ];
  
  // Randomly select 1 to 4 issues
  const numIssues = Math.floor(Math.random() * 4) + 1;
  const shuffled = [...issuesList].sort(() => 0.5 - Math.random());
  const selectedIssues = shuffled.slice(0, numIssues);
  
  // Base reliability 70-100
  const reliabilityScore = Math.floor(Math.random() * 30) + 70;
  
  return {
    reliabilityScore,
    knownIssues: selectedIssues
  };
}

async function run() {
  console.log('🚀 Starting Reliability Data Enrichment...');
  
  const models = await prisma.carModel.findMany({
    where: { 
      reliabilityScore: null
    },
    include: { manufacturer: true },
    take: 50
  });

  for (const model of models) {
    const searchName = model.commercialName || model.name;
    console.log(`Generating reliability data for ${model.manufacturer.name} ${searchName}...`);
    
    const data = generateMockReliabilityData(model.manufacturer.name, searchName);
    
    await prisma.carModel.update({
      where: { id: model.id },
      data: {
        reliabilityScore: data.reliabilityScore,
        knownIssues: data.knownIssues
      }
    });
    
    console.log(`✅ Assigned score ${data.reliabilityScore} with ${data.knownIssues.length} known issues.`);
  }
}

run()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
