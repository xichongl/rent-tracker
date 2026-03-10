import db from './database.js';
import scraper from './scraper.js';

const buildings = [
  {
    id: 1,
    name: 'Emerson Place',
    url: 'https://www.equityapartments.com/boston/west-end/emerson-place-apartments',
    address: '1 Emerson Pl',
    source: 'EquityApartments.com'
  },
  {
    id: 2,
    name: 'Alcott',
    url: 'https://www.equityapartments.com/boston/west-end/alcott-apartments',
    address: '35 Lomasney Way',
    source: 'EquityApartments.com'
  },
  {
    id: 3,
    name: 'West End Apartments',
    url: 'https://www.equityapartments.com/boston/west-end/the-west-end-apartments-asteria-villas-and-vesta',
    address: '4 Emerson Pl',
    source: 'EquityApartments.com'
  },
  {
    id: 4,
    name: 'The Towers at Longfellow Apartments',
    url: 'https://www.equityapartments.com/boston/west-end/the-towers-at-longfellow-apartments',
    address: '10 Longfellow Pl',
    source: 'EquityApartments.com'
  },
  {
    id: 5,
    name: 'Avalon North Station',
    url: 'https://www.avaloncommunities.com/massachusetts/boston-apartments/avalon-north-station/',
    address: '40 Portland St',
    source: 'AvalonCommunities.com'
  }
];

async function runOnce() {
  console.log('🔄 Running scheduled scrape job...');
  let totalUnits = 0;

  for (const building of buildings) {
    console.log(`Scraping ${building.name}...`);

    let units = [];
    let scrapeError = null;

    try {
      if (building.source === 'AvalonCommunities.com') {
        units = await scraper.scrapeAvalon(building.url);
      } else {
        units = await scraper.scrapeEquityApartments(building.url);
      }
    } catch (error) {
      scrapeError = error.message;
      console.error(`❌ ${building.name} failed: ${scrapeError}`);
    }

    if (!scrapeError) {
      const unitIds = [];

      units.forEach((unit) => {
        const unitId = `${building.id}-${unit.bedrooms}bd-${unit.bathrooms}ba-${unit.squareFeet || 'unknown'}-f${unit.floor || 'x'}`;
        unitIds.push(unitId);

        db.upsertApartment({
          id: unitId,
          buildingId: building.id,
          buildingName: building.name,
          address: building.address,
          unitType: unit.unitType,
          bedrooms: unit.bedrooms,
          bathrooms: unit.bathrooms,
          squareFeet: unit.squareFeet,
          floor: unit.floor,
          availableDate: unit.availableDate,
          floorPlan: unit.floorPlan,
          amenities: unit.amenities,
          features: unit.features,
          price: unit.price,
          source: building.source,
          url: building.url
        });
      });

      db.archiveDelistedApartments(building.id, unitIds);
      totalUnits += units.length;
      console.log(`✅ ${building.name}: ${units.length} units`);
    }
  }

  console.log(`✅ Scheduled scrape finished. Total units processed: ${totalUnits}`);
}

runOnce().catch((error) => {
  console.error('❌ Scheduled scrape failed:', error);
  process.exit(1);
});
