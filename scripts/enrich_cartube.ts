import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as cheerio from 'cheerio';
import 'dotenv/config';
import https from 'https';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Replicate cleanBrandName logic or just clean it here
function getCleanBrandName(name: string): string {
  return name.replace(/\s(גרמניה|בריטניה|טורקיה|יפן|ספרד|צרפת|קוריאה|איטליה|ארה"ב|סלובקיה|סין|צ'כיה|הודו)$/, '').trim();
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHtml(res.headers.location.startsWith('http') ? res.headers.location : `https://www.cartube.co.il${res.headers.location}`).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', err => reject(err));
  });
}

async function scrapeCarSpecs(brand: string, model: string) {
  try {
    const cleanBrandName = getCleanBrandName(brand).replace(/\s+/g, '-');
    const cleanModelName = model.replace(/\s+/g, '-');
    
    // Some cartube URLs omit the manufacturer name in the second part if the model is unique,
    // but the standard is /brand/brand-model
    const url = `https://www.cartube.co.il/מחירון-רכב-חדש/${encodeURIComponent(cleanBrandName)}/${encodeURIComponent(cleanBrandName + '-' + cleanModelName)}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    
    const extraSpecs: Record<string, string> = {};
    let review = "";

    $('.spec-table tr').each((_, el) => {
      const key = $(el).find('th').text().trim();
      const val = $(el).find('td').text().trim();
      if (key && val) extraSpecs[key] = val;
    });

    $('dt').each((_, el) => {
      const key = $(el).text().trim();
      const val = $(el).next('dd').text().trim();
      if (key && val) extraSpecs[key] = val;
    });
    
    review = $('.review-summary, .article-content p').first().text().trim();

    return { review, extraSpecs };
  } catch (e) {
    return null;
  }
}

async function run() {
  console.log('🚀 Starting Comprehensive Specs Enrichment...');
  
  const models = await prisma.carModel.findMany({
    where: { 
      extraSpecs: { equals: Prisma.DbNull } 
    },
    include: { manufacturer: true },
    take: 50
  });

  for (const model of models) {
    const searchName = model.commercialName || model.name;
    const cleanBrand = getCleanBrandName(model.manufacturer.name);
    console.log(`Scraping specs for ${cleanBrand} ${searchName}...`);
    
    const specs = await scrapeCarSpecs(model.manufacturer.name, searchName);
    
    if (specs && Object.keys(specs.extraSpecs).length > 0) {
      await prisma.carModel.update({
        where: { id: model.id },
        data: {
          review: specs.review,
          extraSpecs: specs.extraSpecs
        }
      });
      console.log(`✅ Extracted ${Object.keys(specs.extraSpecs).length} fields!`);
    } else {
      console.log(`⏭️ No structured specs found for ${searchName}`);
      await prisma.carModel.update({
        where: { id: model.id },
        data: { extraSpecs: {} }
      });
    }
    await delay(1500); 
  }
}

run()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
