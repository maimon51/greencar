import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import https from 'https';
import dotenv from 'dotenv';
// We need to redefine the map here since we can't easily import ts modules in a node script without ts-node compiling it
const HEBREW_TO_ENGLISH_BRANDS: Record<string, string> = {
  'אאודי': 'Audi', 'אודי': 'Audi', 'פולקסווגן': 'Volkswagen', 'פולקסוגן': 'Volkswagen',
  'טויוטה': 'Toyota', 'איסוזו': 'Isuzu', 'איווקו': 'Iveco', 'אופל': 'Opel',
  'דימלרקריזלר': 'Mercedes-Benz', 'מרצדס': 'Mercedes-Benz', 'ביואיק': 'Buick',
  'אלפא': 'Alfa Romeo', 'מזדה': 'Mazda', 'מאזדה': 'Mazda', 'פורד': 'Ford',
  'סיטרואן': 'Citroen', 'פיאט': 'Fiat', 'פיג\'ו': 'Peugeot', 'פיגו': 'Peugeot',
  'רנו': 'Renault', 'שברולט': 'Chevrolet', 'קיה': 'Kia', 'יונדאי': 'Hyundai',
  'סוזוקי': 'Suzuki', 'ניסאן': 'Nissan', 'ניסן': 'Nissan', 'הונדה': 'Honda',
  'סקודה': 'Skoda', 'מיצובישי': 'Mitsubishi', 'סובארו': 'Subaru', 'סיאט': 'Seat',
  'דאצ\'יה': 'Dacia', 'דאציה': 'Dacia', 'ב.מ.וו': 'BMW', 'במוו': 'BMW',
  'לנד': 'Land Rover', 'וולוו': 'Volvo', 'לקסוס': 'Lexus', 'פורשה': 'Porsche',
  'ג\'יפ': 'Jeep', 'גיפ': 'Jeep', 'סאנגיונג': 'SsangYong', 'סמארט': 'Smart',
  'מיני': 'MINI', 'אינפיניטי': 'Infiniti', 'סאאב': 'Saab', 'לנצ\'יה': 'Lancia',
  'דייהטסו': 'Daihatsu', 'רובר': 'Rover', 'קרייזלר': 'Chrysler', 'דודג\'': 'Dodge',
  'דודג': 'Dodge', 'קאדילק': 'Cadillac', 'קדילאק': 'Cadillac', 'יגואר': 'Jaguar',
  'גי.אמ.סי': 'GMC', 'מזראטי': 'Maserati', 'פרארי': 'Ferrari', 'אסטון': 'Aston Martin',
  'טסלה': 'Tesla'
};

dotenv.config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 5 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function searchWikipedia(query: string) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|extracts&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&pithumbsize=800&exintro=1&explaintext=1`;
  return new Promise<any>((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Greencar/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  console.log('🚀 Starting Image Enrichment with English mappings...');
  const models = await prisma.carModel.findMany({
    where: { imageUrl: null },
    include: { manufacturer: true },
    take: 30
  });

  for (const model of models) {
    const brandFirstWord = model.manufacturer.name.split(/[\s\-\_]+/)[0];
    const englishBrand = HEBREW_TO_ENGLISH_BRANDS[brandFirstWord] || brandFirstWord;
    const modelName = model.commercialName || model.name;
    const query = `${englishBrand} ${modelName}`.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
    
    if (!query || query.length < 3) continue;

    console.log(`Searching Wiki: ${query}`);
    try {
      const data = await searchWikipedia(query);
      if (data.query && data.query.pages) {
        const pages = Object.values(data.query.pages) as any[];
        if (pages.length > 0) {
          const page = pages[0];
          const imageUrl = page.thumbnail?.source || null;
          let description = page.extract ? page.extract.split('\n')[0] : null;
          if (imageUrl || description) {
            await prisma.carModel.update({ where: { id: model.id }, data: { imageUrl, description } });
            console.log(`✅ Found!`);
          } else { console.log(`❌ No image/desc found in page`); }
        } else { console.log(`❌ No pages found`); }
      } else { console.log(`❌ No results`); }
      await new Promise(r => setTimeout(r, 500));
    } catch (err) { console.error(`❌ Failed API call`); }
  }
}
run().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
