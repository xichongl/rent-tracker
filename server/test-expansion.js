import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const url = 'https://www.equityapartments.com/boston/west-end/emerson-place-apartments';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  try {
    console.log('Fetching page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Expand all collapsible panels
    console.log('Expanding panels...');
    await page.evaluate(() => {
      const toggles = document.querySelectorAll('[role="button"][data-toggle="collapse"]');
      console.log(`Found ${toggles.length} toggles`);
      toggles.forEach(toggle => {
        if (toggle.classList.contains('collapsed')) {
          toggle.click();
        }
      });
    }).catch(() => null);

    // Wait for expansion
    await new Promise(resolve => setTimeout(resolve, 2000));

    const content = await page.content();
    const $ = cheerio.load(content);

    // Find panels
    const panels = $('.panel.panel-default');
    console.log(`Found ${panels.length} panels\n`);
    
    panels.each((i, elem) => {
      const $panel = $(elem);
      const headingText = $panel.find('.panel-heading').text().trim();
      const bodyText = $panel.find('.panel-body').text().trim();
      
      console.log(`Panel ${i+1}:`);
      console.log('Heading:', headingText.substring(0, 50));
      console.log('Body (first 150 chars):', bodyText.substring(0, 150));
      
      if (bodyText.length > 0) {
        console.log('✓ Body has content');
      } else {
        console.log('✗ Body is empty');
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();
