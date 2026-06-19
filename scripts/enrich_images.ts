import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

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
  console.log('🚀 Starting Image & Description Enrichment...');
  
  const models = await prisma.carModel.findMany({
    where: { imageUrl: null },
    include: { manufacturer: true },
    take: 100 // Test batch
  });

  for (const model of models) {
    const query = `${model.manufacturer.name} ${model.commercialName || model.name}`.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
    if (!query || query.length < 3) continue;

    console.log(`Searching: ${query}`);
    
    try {
      const data = await searchWikipedia(query);
      if (data.query && data.query.pages) {
        const pages = Object.values(data.query.pages) as any[];
        if (pages.length > 0) {
          const page = pages[0];
          const imageUrl = page.thumbnail?.source || null;
          // Only take first paragraph of description
          let description = page.extract || null;
          if (description) {
            description = description.split('\n')[0];
          }
          
          if (imageUrl || description) {
            await prisma.carModel.update({
              where: { id: model.id },
              data: { imageUrl, description }
            });
            console.log(`✅ Found: ${imageUrl ? 'Image ' : ''}${description ? 'Text' : ''}`);
          }
        }
      }
      await new Promise(r => setTimeout(r, 800)); // Respect limits
    } catch (err) {
      console.error(`❌ Failed: ${query}`);
    }
  }
  console.log('🎉 Enrichment batch complete!');
}

run()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
