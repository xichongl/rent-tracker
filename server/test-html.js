import puppeteer from 'puppeteer';

const url = 'https://www.equityapartments.com/boston/west-end/emerson-place-apartments';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  try {
    console.log('Fetching page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Click first panel toggle
    await page.click('[role="button"][data-toggle="collapse"]').catch(() => null);
    
    // Wait for content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get the actual HTML of the first panel
    const panelHTML = await page.evaluate(() => {
      const panel = document.querySelector('.panel.panel-default');
      if (panel) {
        return panel.outerHTML.substring(0, 2000);
      }
      return 'Not found';
    });
    
    console.log('First panel HTML (first 2000 chars):');
    console.log(panelHTML);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();
