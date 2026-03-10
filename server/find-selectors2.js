import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const url = 'https://www.equityapartments.com/boston/west-end/emerson-place-apartments';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  try {
    console.log('Fetching page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const content = await page.content();
    const $ = cheerio.load(content);
    
    // Save a snippet to inspect manually
    const html = content;
    
    // Try different selectors to find apartment cards
    const selectors = [
      '[class*="floorplan"]',
      '[class*="floor-plan"]',
      '[class*="unit-card"]',
      '[class*="apartment-card"]',
      '[class*="price-card"]',
      '.fp-',
      '[data-floorplan]',
      'div[role="button"]',
      '[class*="apartment-item"]',
      'section[class*="floor"]'
    ];
    
    console.log('\n=== Testing selectors ===');
    selectors.forEach(sel => {
      const count = $(sel).length;
      if (count > 0) {
        console.log(`✓ "${sel}": ${count} elements`);
        
        // Show first element details
        const first = $(sel).first();
        const text = first.text().substring(0, 150);
        console.log(`  First element text: ${text.replace(/\n/g, ' ').trim()}`);
      }
    });
    
    // Look for text "from $" which is a common pattern
    console.log('\n=== Looking for "from $" pattern ===');
    const body = $('body');
    const matches = body.html().match(/from\s+\$[\d,]+/gi) || [];
    console.log(`Found ${matches.length} matches for "from $XXX"`);
    console.log('Examples:', matches.slice(0, 5));
    
    // Find the container that has "from $2,655"
    console.log('\n=== Finding container with pricing pattern ===');
    const allDivs = $('div');
    let found = false;
    
    allDivs.each((i, elem) => {
      if (found) return;
      const text = $(elem).text();
      
      if (text.includes('from') && text.includes('$') && text.length < 500 && text.length > 50) {
        const priceMatch = text.match(/from\s+\$[\d,]+/i);
        if (priceMatch) {
          found = true;
          console.log('Found pricing section!');
          console.log('Classes:', $(elem).attr('class'));
          console.log('Parent tag:', $(elem).parent()[0].name);
          console.log('Parent classes:', $(elem).parent().attr('class'));
          console.log('Content preview:', text.substring(0, 300));
        }
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();
