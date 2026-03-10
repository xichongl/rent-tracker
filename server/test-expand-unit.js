import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const url = 'https://www.equityapartments.com/boston/west-end/emerson-place-apartments';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  try {
    console.log('Fetching page...');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    // Expand first bedroom type
    await page.click('[data-target="#bedroom-type-0"]').catch(() => null);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Click the first unit to expand it
    console.log('Clicking first unit...');
    await page.click('.unit-condensed-table').catch(() => null);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const content = await page.content();
    const $ = cheerio.load(content);

    // Get the first unit's full content
    const firstUnit = $('.unit-condensed-table').first();
    const fullHTML = firstUnit.html();
    
    console.log('First unit HTML (first 1500 chars):');
    console.log(fullHTML?.substring(0, 1500));
    
    // Also check parent for expanded content
    const parent = firstUnit.parent();
    const parentText = parent.text().trim();
    console.log('\n\nParent content (first 500 chars):');
    console.log(parentText.substring(0, 500));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();
