import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { cleanBrandName } from '../src/lib/brandUtils';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL, max: 5 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

import { execSync } from 'child_process';

async function downloadImage(url: string, destPath: string) {
  execSync(`curl -s -L -A "Greencar/1.0" -o "${destPath}" "${url}"`);
}

async function run() {
  console.log('Fetching Wikipedia logos...');
  const url = 'https://he.wikipedia.org/wiki/%D7%92%D7%9C%D7%A8%D7%99%D7%99%D7%AA_%D7%A1%D7%9E%D7%9C%D7%99_%D7%99%D7%A6%D7%A8%D7%A0%D7%99_%D7%A8%D7%9B%D7%91';
  const res = await fetch(url, { headers: { 'User-Agent': 'Greencar/1.0 (contact@example.com)' } });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const logosDir = path.join(__dirname, '../public/logos');
  if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

  const wikiMap = new Map<string, string>();
  $('li.gallerybox').each((i, el) => {
    let name = $(el).find('.gallerytext').text().trim();
    // Some texts have english inside parenthesis, e.g. "אאודי (Audi)"
    name = name.split('(')[0].trim();
    let img = $(el).find('img').attr('src');
    
    if (name && img) {
      if (img.startsWith('//')) img = 'https:' + img;
      wikiMap.set(name, img);
    }
  });

  console.log(`Found ${wikiMap.size} logos on Wikipedia.`);

  // Get all unique active manufacturers in our DB
  const manufacturers = await prisma.manufacturer.findMany();
  
  for (const brand of manufacturers) {
    const { name: englishName } = cleanBrandName(brand.name, brand.country);
    const firstWord = brand.name.split(/[\s\-\_]+/)[0];
    
    // Check if we have this brand in the wiki map
    // We try to match the first hebrew word, e.g. "פולקסווגן"
    let matchedImgUrl = null;
    for (const [wikiName, imgUrl] of wikiMap.entries()) {
      if (wikiName.includes(firstWord) || firstWord.includes(wikiName)) {
        matchedImgUrl = imgUrl;
        break;
      }
    }

    if (matchedImgUrl) {
      const ext = path.extname(matchedImgUrl).split('?')[0] || '.png';
      const destPath = path.join(logosDir, `${englishName.toLowerCase().replace(/\s+/g, '_')}${ext}`);
      
      if (!fs.existsSync(destPath)) {
        console.log(`Downloading logo for ${englishName} (${brand.name})...`);
        try {
          await downloadImage(matchedImgUrl, destPath);
        } catch(e) {
          console.error(`Failed to download ${matchedImgUrl}`);
        }
      }
    }
  }
  
  console.log('Done downloading logos!');
}
run().finally(() => prisma.$disconnect());
