import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://www.icar.co.il/%D7%A4%D7%95%D7%9C%D7%A7%D7%A1%D7%95%D7%95%D7%92%D7%9F/%D7%92%D7%95%D7%9C%D7%A3/', { waitUntil: 'networkidle2' });
  
  const title = await page.title();
  console.log('Title:', title);
  
  // Extract all spec rows or something similar
  // We don't know the exact DOM yet, so let's dump the text of the body to see what we get
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
  console.log('Body snippet:', bodyText);
  
  await browser.close();
}
run();
