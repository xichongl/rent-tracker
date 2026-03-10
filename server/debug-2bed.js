import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const url = 'https://www.equityapartments.com/boston/west-end/emerson-place-apartments';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  try {
    console.log('Fetching page...');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    // Expand all panels
    await page.evaluate(() => {
      const toggles = document.querySelectorAll('[role="button"][data-toggle="collapse"]');
      toggles.forEach(toggle => {
        if (toggle.classList.contains('collapsed')) {
          toggle.click();
        }
      });
    }).catch(() => null);

    await new Promise(resolve => setTimeout(resolve, 3000));

    const content = await page.content();
    const $ = cheerio.load(content);

    // Find a 2-bed unit
    const unitSections = $('.units');
    let found2bed = false;
    
    unitSections.each((sectionIdx, sectionElem) => {
      if (found2bed) return;
      
      const $section = $(sectionElem);
      const unitElements = $section.find('.unit-condensed-table');
      
      if (unitElements.length > 0) {
        // Check if this is 2-bed section
        const firstUnitText = unitElements.first().text();
        if (firstUnitText.includes('2 Bed') || firstUnitText.includes('2 Bath')) {
          found2bed = true;
          
          console.log('=== First 2-Bed Unit ===');
          const firstUnit = unitElements.first();
          const text = firstUnit.text();
          
          console.log('Full text:');
          console.log(text.substring(0, 500));
          
          // Look for sqft patterns
          const sqftMatches = text.match(/(\d+)\s*(?:SQFT|sq\.?\s*ft\.?)/gi);
          console.log('\nAll SQFT matches:', sqftMatches);
        }
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();
