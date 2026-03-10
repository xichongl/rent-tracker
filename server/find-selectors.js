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
    
    // Find all elements containing prices
    const body = $('body').text();
    const prices = body.match(/\$\s*[\d,]+/g) || [];
    const uniquePrices = [...new Set(prices.slice(0, 10))];
    console.log('\n=== Found prices ===');
    console.log(uniquePrices);
    
    // Try to find what contains a price
    console.log('\n=== Looking for element containing "$2,975" ===');
    const allElements = $('*');
    let found = false;
    
    allElements.each((i, elem) => {
      if (found) return;
      const text = $(elem).text();
      
      // Look for an element that has a price
      if (text.includes('2,975') && text.includes('Studio')) {
        found = true;
        console.log('Found element!');
        console.log('Tag:', elem.name);
        console.log('Classes:', $(elem).attr('class'));
        console.log('ID:', $(elem).attr('id'));
        console.log('Data attributes:', $(elem).attr('data-test'), $(elem).attr('data-floorplan'));
        
        // Get parent info
        const parent = $(elem).parent();
        console.log('\nParent tag:', parent[0]?.name);
        console.log('Parent classes:', parent.attr('class'));
        console.log('Parent ID:', parent.attr('id'));
        
        // Get siblings
        const sibling = $(elem).prev();
        if (sibling.length) {
          console.log('\nPrevious sibling text (first 200 chars):');
          console.log(sibling.text().substring(0, 200));
        }
        
        // Show full element HTML
        console.log('\nFull element HTML:');
        console.log($(elem).html().substring(0, 500));
      }
    });
    
    if (!found) {
      console.log('Could not find element with 2,975 and Studio');
    }
    
    // Also try to find by role or data-test
    console.log('\n=== Looking for elements by role/data attributes ===');
    const buttons = $('[role="button"]');
    console.log(`Found ${buttons.length} elements with role="button"`);
    
    const dataTest = $('[data-test]');
    console.log(`Found ${dataTest.length} elements with data-test attribute`);
    if (dataTest.length > 0) {
      dataTest.each((i, elem) => {
        if (i < 5) {
          console.log(`  - data-test="${$(elem).attr('data-test')}"`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();
