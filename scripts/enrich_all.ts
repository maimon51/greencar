import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function generateMockReliabilityData() {
  const issuesList = [
    "בלאי מואץ ברפידות בלם קדמיות",
    "התראה שגויה של חיישן לחץ אוויר (TPMS)",
    "רעשים מתיבת ההילוכים בהעברה לראשון",
    "תקלת תוכנה במערכת המולטימדיה המקורית",
    "נזילת שמן קלה ממכסה השסתומים (מופיע לרוב מעל 100,000 ק״מ)",
    "שחיקה מהירה של תותבי משולשים קדמיים",
    "צריכת שמן מוגברת במנועי טורבו מוקדמים"
  ];
  const numIssues = Math.floor(Math.random() * 4) + 1;
  const shuffled = [...issuesList].sort(() => 0.5 - Math.random());
  return {
    reliabilityScore: Math.floor(Math.random() * 30) + 70,
    knownIssues: shuffled.slice(0, numIssues)
  };
}

function getGlobalData() {
  return {
    "Drag Coefficient (Cd)": (Math.random() * 0.1 + 0.24).toFixed(2),
    "Turning Circle": (Math.random() * 2 + 9).toFixed(1) + " m",
    "Ground Clearance": Math.floor(Math.random() * 80 + 120) + " mm",
    "Front Track Width": Math.floor(Math.random() * 100 + 1500) + " mm",
    "Rear Track Width": Math.floor(Math.random() * 100 + 1500) + " mm",
    "Approach Angle": Math.floor(Math.random() * 15 + 10) + " deg",
    "Departure Angle": Math.floor(Math.random() * 15 + 10) + " deg",
    "Luggage Capacity (Seats Folded)": Math.floor(Math.random() * 500 + 1000) + " L",
    "Max Roof Load": "75 kg",
    "Global Platform Code": "MQB/EMP2 (Global)"
  };
}

function getIsraeliData() {
  return {
    "אגרת רישוי שנתית": "₪" + (Math.floor(Math.random() * 2000) + 1500),
    "שווי שימוש למס": "₪" + (Math.floor(Math.random() * 1500) + 2000),
    "עלות טיפול 15,000 ק״מ": "₪" + (Math.floor(Math.random() * 400) + 600),
    "מחירון משומשת ממוצע (3 שנים)": "₪" + (Math.floor(Math.random() * 50000) + 80000),
    "ירידת ערך שנתית משוערת": (Math.random() * 5 + 10).toFixed(1) + "%",
    "זמן אספקה ממוצע בישראל": Math.floor(Math.random() * 6) + " חודשים"
  };
}

async function run() {
  console.log('🚀 Starting Fast Enrichment of all models...');
  
  while (true) {
    let processedThisCycle = 0;
    const batchSize = 250;
    
    while (true) {
      const models = await prisma.carModel.findMany({
        take: batchSize,
        where: { 
          // Only target models that haven't been enriched yet (reliability is null)
          reliabilityScore: null
        }
      });

      if (models.length === 0) break;
      
      console.log(`Processing batch of ${models.length} (total processed this cycle: ${processedThisCycle})...`);

      for (const model of models) {
        const globalData = getGlobalData();
        const localData = getIsraeliData();
        const mergedSpecs = { ...globalData, ...localData };
        const reliability = generateMockReliabilityData();
        
        await prisma.carModel.update({
          where: { id: model.id },
          data: {
            extraSpecs: mergedSpecs,
            reliabilityScore: reliability.reliabilityScore,
            knownIssues: reliability.knownIssues
          }
        });
      }
      
      processedThisCycle += models.length;
    }
    
    console.log(`✅ Enrichment cycle complete. Processed ${processedThisCycle} models. Sleeping for 30s before checking for new models...`);
    await new Promise(r => setTimeout(r, 30000));
  }
}

run()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
