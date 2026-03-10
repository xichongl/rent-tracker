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
    
    // Find all .panel.panel-default elements
    const panels = $('.panel.panel-default');
    console.log(`\nFound ${panels.length} panels\n`);
    
    panels.each((i, elem) => {
      const $panel = $(elem);
      const heading = $panel.find('.panel-heading').text().trim();
      const body = $panel.find('.panel-body').text().trim();
      
      console.log(`\n=== Panel ${i + 1} ===`);
      console.log('Heading:', heading);
      console.log('Body (first 200 chars):', body.substring(0, 200));
      console.log('Body (first 500 chars):', body.substring(0, 500));
      
      // Extract price from heading
      const priceMatch = heading.match(/from\s+\$[\d,]+/i);
      if (priceMatch) {
        console.log('Price found:', priceMatch[0]);
      }
      
      // Check for other data
      console.log('Panel HTML classes:', $panel.attr('class'));
      console.log('Heading HTML:', $panel.find('.panel-heading').html());
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();
