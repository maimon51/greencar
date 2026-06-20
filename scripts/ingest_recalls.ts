import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 5 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

import { cleanBrandName } from '../src/lib/brandUtils';

async function ingestRecalls() {
  console.log('🚀 Starting Safety Recalls Ingestion...');
  
  // Cache manufacturers
  const allManufacturers = await prisma.manufacturer.findMany();
  const manufacturersWithEnglish = allManufacturers.map(m => {
    const { name: englishName } = cleanBrandName(m.name, m.country || '');
    return { ...m, englishName: englishName.toUpperCase() };
  });
  
  let offset = 2000;
  let totalImported = 0;
  const limit = 500;
  
  while (true) {
    console.log(`Fetching recalls offset ${offset}...`);
    const res = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=2c33523f-87aa-44ec-a736-edbb0a82975e&limit=${limit}&offset=${offset}`);
    if (!res.ok) {
      console.error('Failed to fetch from data.gov.il');
      break;
    }
    
    const data = await res.json();
    const records = data.result?.records;
    
    if (!records || records.length === 0) {
      console.log('✅ Finished importing recalls!');
      break;
    }

    for (const record of records) {
      const {
        RECALL_ID, TOZAR_TEUR, DEGEM, TEUR_TAKALA, BUILD_BEGIN_A
      } = record;

      if (!TOZAR_TEUR || !DEGEM) continue;

      // Find the manufacturer by matching the English name
      const searchTozar = TOZAR_TEUR.trim().toUpperCase();
      const manufacturer = manufacturersWithEnglish.find(m => 
        searchTozar.includes(m.englishName) || m.englishName.includes(searchTozar)
      );

      if (!manufacturer) continue;

      const searchDegem = DEGEM.trim().toUpperCase();
      const carModels = await prisma.carModel.findMany({
        where: { 
          manufacturerId: manufacturer.id
        }
      });
      
      const matchedModels = carModels.filter(m => {
        const engName = (m.name || '').toUpperCase();
        const engComm = (m.commercialName || '').toUpperCase();
        return searchDegem.includes(engName) || searchDegem.includes(engComm) || 
               engName.includes(searchDegem) || engComm.includes(searchDegem);
      });

      // Insert recall for matched models
      for (const model of matchedModels) {
        // Upsert to prevent duplicates
        const recallDate = BUILD_BEGIN_A ? new Date(BUILD_BEGIN_A) : new Date();
        
        try {
          // Recall.id is Int, we cannot use a string ID. 
          // We will search by description and carModelId instead.
          const existing = await prisma.recall.findFirst({
            where: {
              carModelId: model.id,
              description: TEUR_TAKALA || 'קריאת שירות בטיחותית'
            }
          });
          
          if (existing) {
            await prisma.recall.update({
              where: { id: existing.id },
              data: { date: recallDate }
            });
          } else {
            await prisma.recall.create({
              data: {
                description: TEUR_TAKALA || 'קריאת שירות בטיחותית',
                date: recallDate,
                carModelId: model.id
              }
            });
          }
          totalImported++;
        } catch (err) {
          console.error(`Failed upsert for ${model.id}`, err);
        }
      }
      // Brief pause to allow pool to breathe
      await new Promise(r => setTimeout(r, 50));
    }
    
    // Additional pause between batches
    await new Promise(r => setTimeout(r, 1000));
    offset += limit;
  }
  
  console.log(`🎉 Ingested ${totalImported} recalls into the database!`);
}

ingestRecalls()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
