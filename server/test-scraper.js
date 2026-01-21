import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

async function testScraper() {
  const url = "https://www.equityapartments.com/boston/west-end/emerson-place-apartments";
  
  let browser;
  try {
    console.log('🔍 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log(`📄 Loading ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const content = await page.content();
    const $ = cheerio.load(content);
    const text = $.text();
    
    console.log('\n✅ Page loaded successfully\n🔎 Testing patterns:\n');
    
    // Test patterns with flexible whitespace and newlines
    const studioMatch = text.match(/studio[\s\n]*\$?([\d,]+)/i);
    const oneBedMatch = text.match(/1\s*bed[\s\n]*\$?([\d,]+)/i);
    const twoBedMatch = text.match(/2\s*bed[\s\n]*\$?([\d,]+)/i);
    const threeBedMatch = text.match(/3\s*bed[\s\n]*\$?([\d,]+)/i);
    
    const prices = {};
    
    console.log('Pattern Matches:');
    if (studioMatch && studioMatch[1]) {
      const price = parseInt(studioMatch[1].replace(/,/g, ''));
      prices.studio = { current: price };
      console.log(`✓ Studio: $${price.toLocaleString()}`);
    } else {
      console.log('✗ Studio: NOT FOUND');
    }
    
    if (oneBedMatch && oneBedMatch[1]) {
      const price = parseInt(oneBedMatch[1].replace(/,/g, ''));
      prices.oneBed = { current: price };
      console.log(`✓ 1 Bed: $${price.toLocaleString()}`);
    } else {
      console.log('✗ 1 Bed: NOT FOUND');
    }
    
    if (twoBedMatch && twoBedMatch[1]) {
      const price = parseInt(twoBedMatch[1].replace(/,/g, ''));
      prices.twoBed = { current: price };
      console.log(`✓ 2 Bed: $${price.toLocaleString()}`);
    } else {
      console.log('✗ 2 Bed: NOT FOUND');
    }
    
    if (threeBedMatch && threeBedMatch[1]) {
      const price = parseInt(threeBedMatch[1].replace(/,/g, ''));
      prices.threeBed = { current: price };
      console.log(`✓ 3 Bed: $${price.toLocaleString()}`);
    } else {
      console.log('✗ 3 Bed: NOT FOUND');
    }
    
    console.log('\n💰 Final extracted prices:');
    console.log(JSON.stringify(prices, null, 2));
    
    await browser.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (browser) await browser.close();
  }
}

testScraper();
