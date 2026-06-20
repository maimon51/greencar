import * as cheerio from 'cheerio';

async function run() {
  const url = 'https://he.wikipedia.org/wiki/%D7%92%D7%9C%D7%A8%D7%99%D7%99%D7%AA_%D7%A1%D7%9E%D7%9C%D7%99_%D7%99%D7%A6%D7%A8%D7%A0%D7%99_%D7%A8%D7%9B%D7%91';
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const logos: any[] = [];
  $('li.gallerybox').each((i, el) => {
    const text = $(el).find('.gallerytext p').text().trim();
    const img = $(el).find('img').attr('src');
    if (text && img) {
      logos.push({ name: text, img: img.startsWith('//') ? 'https:' + img : img });
    }
  });
  console.log(logos.slice(0, 10));
  console.log(`Total logos found: ${logos.length}`);
}
run();
