import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.equityapartments.com/boston/west-end/alcott-apartments', { waitUntil: 'networkidle2' });
  const html = await page.content();
  const $ = cheerio.load(html);
  
  // Look for pricing table or floor plan
  const allText = $.text();
  
  // Find patterns for each bed type with their prices
  const studioMatches = allText.match(/studio[\s\S]{0,100}?\$?([\d,]+)/gi);
  const oneBedMatches = allText.match(/1[\s\n]*bed[\s\S]{0,100}?\$?([\d,]+)/gi);
  const twoBedMatches = allText.match(/2[\s\n]*bed[\s\S]{0,100}?\$?([\d,]+)/gi);
  const threeBedMatches = allText.match(/3[\s\n]*bed[\s\S]{0,100}?\$?([\d,]+)/gi);
  
  console.log('Studio matches:', studioMatches);
  console.log('1 Bed matches:', oneBedMatches);
  console.log('2 Bed matches:', twoBedMatches);
  console.log('3 Bed matches:', threeBedMatches);
  
  // Extract actual prices near "Floor Plans" section
  const floorPlansIndex = allText.indexOf('Floor Plans');
  if (floorPlansIndex > 0) {
    const priceSection = allText.substring(floorPlansIndex, floorPlansIndex + 2000);
    console.log('\n=== Floor Plans Section ===');
    console.log(priceSection.substring(0, 800));
  }
  
  await browser.close();
})();
