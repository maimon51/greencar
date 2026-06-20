import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 5 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', err => reject(err));
  });
}

function parseBool(val: any): boolean {
  return val === 1 || val === '1' || val === true;
}

function parseNum(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const parsed = Number(val);
  return isNaN(parsed) ? null : parsed;
}

async function run() {
  console.log('🚀 Starting Full Data Ingestion from Gov.il API...');
  
  const resourceId = '142afde2-6228-49f9-8a29-9b6c3a0cbe40';
  const limit = 1000;
  let offset = 7000; // resuming where we left off
  let hasMore = true;
  let totalProcessed = 7000;

  while (hasMore) {
    const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${resourceId}&limit=${limit}&offset=${offset}`;
    console.log(`Fetching offset ${offset}...`);
    
    const response = await fetchJson(url);
    if (!response.success) {
      console.error('❌ Failed to fetch data. Retrying in 5 seconds...');
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    const records = response.result.records;
    if (records.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`✅ Fetched ${records.length} records. Syncing to Database...`);

    // Process sequentially to avoid connection pool exhaustion
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        const manufacturer = await prisma.manufacturer.upsert({
          where: { code: parseNum(record.tozeret_cd) || 0 },
          update: {
            name: String(record.tozeret_nm || 'Unknown').trim(),
            country: record.tozeret_eretz_nm ? String(record.tozeret_eretz_nm).trim() : null,
          },
          create: {
            code: parseNum(record.tozeret_cd) || 0,
            name: String(record.tozeret_nm || 'Unknown').trim(),
            country: record.tozeret_eretz_nm ? String(record.tozeret_eretz_nm).trim() : null,
          }
        });

        const carModelCode = parseNum(record.degem_cd) || 0;
        const carModel = await prisma.carModel.upsert({
          where: {
            manufacturerId_code: {
              manufacturerId: manufacturer.id,
              code: carModelCode,
            }
          },
          update: {
            name: String(record.degem_nm || 'Unknown').trim(),
            commercialName: record.kinuy_mishari ? String(record.kinuy_mishari).trim() : null,
          },
          create: {
            manufacturerId: manufacturer.id,
            code: carModelCode,
            name: String(record.degem_nm || 'Unknown').trim(),
            commercialName: record.kinuy_mishari ? String(record.kinuy_mishari).trim() : null,
          }
        });

        const trimName = String(record.ramat_gimur || 'Standard').trim();
        const trimYear = parseNum(record.shnat_yitzur) || 0;
        const gearboxType = parseBool(record.automatic_ind) ? 'Automatic' : 'Manual';
        
        await prisma.trimLevel.upsert({
          where: {
            carModelId_name_year: {
              carModelId: carModel.id,
              name: trimName,
              year: trimYear,
            }
          },
          update: {
            engineSize: parseNum(record.nefah_manoa),
            horsepower: parseNum(record.koah_sus),
            fuelType: record.delek_nm ? String(record.delek_nm).trim() : null,
            gearbox: gearboxType,
            weight: parseNum(record.mishkal_kolel),
            seats: parseNum(record.mispar_moshavim),
            doors: parseNum(record.mispar_dlatot),
            abs: parseBool(record.abs_ind),
            airbags: parseNum(record.mispar_kariot_avir) || 0,
            adaptiveCruise: parseBool(record.bakarat_shyut_adaptivit_ind),
            laneDeparture: parseBool(record.bakarat_stiya_menativ_ind),
            blindSpot: parseBool(record.zihuy_beshetah_nistar_ind),
            autoBrake: parseBool(record.maarechet_ezer_labalam_ind),
            pedestrianId: parseBool(record.zihuy_holchey_regel_ind),
            reverseCamera: parseBool(record.matzlemat_reverse_ind),
            safetyScore: parseNum(record.nikud_betihut),
            greenIndex: parseNum(record.madad_yarok),
            co2Wltp: parseNum(record.CO2_WLTP),
          },
          create: {
            carModelId: carModel.id,
            name: trimName,
            year: trimYear,
            engineSize: parseNum(record.nefah_manoa),
            horsepower: parseNum(record.koah_sus),
            fuelType: record.delek_nm ? String(record.delek_nm).trim() : null,
            gearbox: gearboxType,
            weight: parseNum(record.mishkal_kolel),
            seats: parseNum(record.mispar_moshavim),
            doors: parseNum(record.mispar_dlatot),
            abs: parseBool(record.abs_ind),
            airbags: parseNum(record.mispar_kariot_avir) || 0,
            adaptiveCruise: parseBool(record.bakarat_shyut_adaptivit_ind),
            laneDeparture: parseBool(record.bakarat_stiya_menativ_ind),
            blindSpot: parseBool(record.zihuy_beshetah_nistar_ind),
            autoBrake: parseBool(record.maarechet_ezer_labalam_ind),
            pedestrianId: parseBool(record.zihuy_holchey_regel_ind),
            reverseCamera: parseBool(record.matzlemat_reverse_ind),
            safetyScore: parseNum(record.nikud_betihut),
            greenIndex: parseNum(record.madad_yarok),
            co2Wltp: parseNum(record.CO2_WLTP),
          }
        });

      } catch (e) {
        // Suppress individual errors to avoid log spam, but could log them if needed
      }
    }
    
    totalProcessed += records.length;
    console.log(`✅ Processed ${totalProcessed} records so far...`);
    offset += limit;
  }

  console.log(`🎉 Ingestion fully completed! Processed ${totalProcessed} total records.`);
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

run()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
