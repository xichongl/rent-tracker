import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const url = 'https://www.equityapartments.com/boston/west-end/emerson-place-apartments';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  try {
    console.log('Fetching page with full wait...');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    // Click first panel toggle
    await page.click('[role="button"][data-toggle="collapse"]').catch(() => null);
    
    // Wait longer for Angular to render
    await new Promise(resolve => setTimeout(resolve, 3000));

    const content = await page.content();
    const $ = cheerio.load(content);

    // Look for units divs
    const units = $('.units');
    console.log(`Found ${units.length} units sections`);

    units.each((u, elem) => {
      console.log(`\n=== Units Section ${u + 1} ===`);
      
      // Look for unit rows
      const rows = $(elem).find('.unit-condensed-table, [class*="unit-"]');
      console.log(`Found ${rows.length} unit items`);
      
      rows.each((i, row) => {
        if (i >= 2) return; // Just show first 2
        
        const text = $(row).text().trim();
        console.log(`\nUnit ${i + 1}:`);
        console.log(text.substring(0, 200));
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();
