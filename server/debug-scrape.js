import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.equityapartments.com/boston/west-end/emerson-place-apartments', { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null);
  
  const content = await page.content();
  const $ = cheerio.load(content);
  
  // Get apartment elements using same selectors as scraper
  const elements = $('[class*="apartment"], [class*="unit"], [class*="floorplan"], [class*="card"]');
  
  console.log(`\nTotal elements found: ${elements.length}\n`);
  
  // Find an element that contains "2 bed" and "3790" (known 2-bed price)
  let found = false;
  elements.each((i, elem) => {
    if (found) return;
    const $elem = $(elem);
    const text = $elem.text();
    
    if (text.includes('2') && text.includes('bed') && text.includes('3790')) {
      found = true;
      console.log('=== FOUND 2-BED WITH $3790 ===');
      console.log('Text content:');
      console.log(text);
      console.log('\n=== Extracting sqft patterns ===');
      const matches = text.match(/(\d+)\s*(?:sq\.?\s*ft\.?|sqft|sf)/gi);
      console.log('All sqft matches:', matches);
    }
  });
  
  if (!found) {
    console.log('Not found with price $3790. Let me check first card...');
    const first = elements.first();
    if (first.length) {
      console.log('First element text:', first.text().substring(0, 300));
    }
  }
  
  await browser.close();
})();
