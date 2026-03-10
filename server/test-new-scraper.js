import scraper from './scraper.js';

(async () => {
  console.log('Testing scraper with new panel-based selectors...\n');
  
  const url = 'https://www.equityapartments.com/boston/west-end/emerson-place-apartments';
  
  console.log(`Scraping: ${url}\n`);
  const units = await scraper.scrapeEquityApartments(url);
  
  console.log(`Found ${units.length} units:\n`);
  
  units.forEach((unit, i) => {
    console.log(`Unit ${i + 1}:`);
    console.log(`  Type: ${unit.unitType}`);
    console.log(`  Bedrooms: ${unit.bedrooms}`);
    console.log(`  Bathrooms: ${unit.bathrooms}`);
    console.log(`  Price: $${unit.price}`);
    console.log(`  Sq Ft: ${unit.squareFeet || 'N/A'}`);
    console.log(`  Floor: ${unit.floor || 'N/A'}`);
    console.log('');
  });
  
  process.exit(0);
})();
