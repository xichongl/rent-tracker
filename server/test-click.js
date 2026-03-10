import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const url = 'https://www.equityapartments.com/boston/west-end/emerson-place-apartments';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  try {
    console.log('Fetching page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Get the first panel and click it
    console.log('Clicking first panel toggle...');
    await page.click('[role="button"][data-toggle="collapse"]', { timeout: 5000 }).catch(() => console.log('Click failed'));

    // Wait longer for any AJAX/loading
    console.log('Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const content = await page.content();
    const $ = cheerio.load(content);

    const firstPanel = $('.panel.panel-default').first();
    const headingText = firstPanel.find('.panel-heading').text().trim();
    const bodyText = firstPanel.find('.panel-body').text().trim();
    
    console.log('\n=== First Panel ===');
    console.log('Heading:', headingText.substring(0, 50));
    console.log('Body length:', bodyText.length);
    if (bodyText.length > 0) {
      console.log('Body content (first 300 chars):');
      console.log(bodyText.substring(0, 300));
    } else {
      console.log('Body is still empty - checking for nested structure...');
      
      // Check if body is nested differently
      const allDivs = firstPanel.find('div');
      console.log(`Panel has ${allDivs.length} divs`);
      
      // Look for any text in the panel
      const panelText = firstPanel.text().trim();
      console.log(`Full panel text length: ${panelText.length}`);
      console.log('Full panel text:', panelText.substring(0, 500));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();
