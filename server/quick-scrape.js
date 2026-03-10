import scraper from './scraper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

const buildings = [
  {
    id: 1,
    name: "Emerson Place",
    url: "https://www.equityapartments.com/boston/west-end/emerson-place-apartments"
  },
  {
    id: 2,
    name: "Alcott",
    url: "https://www.equityapartments.com/boston/west-end/alcott-apartments"
  },
  {
    id: 3,
    name: "West End Apartments",
    url: "https://www.equityapartments.com/boston/west-end/the-west-end-apartments-asteria-villas-and-vesta"
  },
  {
    id: 4,
    name: "The Towers at Longfellow Apartments",
    url: "https://www.equityapartments.com/boston/west-end/the-towers-at-longfellow-apartments"
  }
];

(async () => {
  console.log('🔄 Starting apartment scrape...\n');
  const results = [];

  for (const building of buildings) {
    console.log(`Scraping ${building.name}...`);
    const units = await scraper.scrapeEquityApartments(building.url);
    
    results.push({
      buildingId: building.id,
      buildingName: building.name,
      unitsFound: units.length,
      units: units
    });

    console.log(`✅ ${building.name}: ${units.length} units found\n`);
  }

  // Save the results to a file
  const today = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString();
  
  const dateFileName = `prices-${today}.json`;
  const latestFileName = 'latest-prices.json';
  const dateFilePath = path.join(dataDir, dateFileName);
  const latestFilePath = path.join(dataDir, latestFileName);
  
  const dataToSave = {
    date: today,
    timestamp: timestamp,
    apartments: results.flatMap(r => r.units)
  };
  
  fs.writeFileSync(dateFilePath, JSON.stringify(dataToSave, null, 2));
  console.log(`✅ Saved prices to ${dateFileName}`);
  
  fs.writeFileSync(latestFilePath, JSON.stringify(dataToSave, null, 2));
  console.log(`✅ Updated ${latestFileName}`);
  
  console.log(`\n🎉 Scraping complete!`);
  process.exit(0);
})();
