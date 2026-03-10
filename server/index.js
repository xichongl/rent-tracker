import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';
import scraper from './scraper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDataDir = path.join(__dirname, '..', 'data');

function resolveDataDir() {
  const configuredDataDir = process.env.DATA_DIR
    ? (path.isAbsolute(process.env.DATA_DIR)
        ? process.env.DATA_DIR
        : path.resolve(__dirname, '..', process.env.DATA_DIR))
    : defaultDataDir;

  try {
    if (!fs.existsSync(configuredDataDir)) {
      fs.mkdirSync(configuredDataDir, { recursive: true });
    }
    return configuredDataDir;
  } catch (error) {
    if (configuredDataDir !== defaultDataDir) {
      console.warn(`⚠️ DATA_DIR not writable (${configuredDataDir}). Falling back to ${defaultDataDir}`);
    }

    if (!fs.existsSync(defaultDataDir)) {
      fs.mkdirSync(defaultDataDir, { recursive: true });
    }
    return defaultDataDir;
  }
}

const dataDir = resolveDataDir();
const frontendDistDir = path.join(__dirname, '..', 'dist');

const app = express();
const PORT = process.env.PORT || 5174;
const ENABLE_DAILY_SCRAPER = process.env.ENABLE_DAILY_SCRAPER !== 'false';
const DAILY_SCRAPE_TIME = process.env.DAILY_SCRAPE_TIME || '09:00';
const DAILY_SCRAPE_RUN_ON_STARTUP = process.env.DAILY_SCRAPE_RUN_ON_STARTUP === 'true';
const parsedSchedulerTime = parseDailyScrapeTime(DAILY_SCRAPE_TIME);

let scrapeInProgress = false;
let dailyScrapeTimer = null;
let nextScheduledRunAt = null;
let schedulerLastRun = null;

app.use(cors());
app.use(express.json());

// Apartment URLs to scrape
const buildings = [
  {
    id: 1,
    name: "Emerson Place",
    url: "https://www.equityapartments.com/boston/west-end/emerson-place-apartments",
    address: "1 Emerson Pl",
    source: "EquityApartments.com"
  },
  {
    id: 2,
    name: "Alcott",
    url: "https://www.equityapartments.com/boston/west-end/alcott-apartments",
    address: "35 Lomasney Way",
    source: "EquityApartments.com"
  },
  {
    id: 3,
    name: "West End Apartments",
    url: "https://www.equityapartments.com/boston/west-end/the-west-end-apartments-asteria-villas-and-vesta",
    address: "4 Emerson Pl",
    source: "EquityApartments.com"
  },
  {
    id: 4,
    name: "The Towers at Longfellow Apartments",
    url: "https://www.equityapartments.com/boston/west-end/the-towers-at-longfellow-apartments",
    address: "10 Longfellow Pl",
    source: "EquityApartments.com"
  },
  {
    id: 5,
    name: "Avalon North Station",
    url: "https://www.avaloncommunities.com/massachusetts/boston-apartments/avalon-north-station/",
    address: "40 Portland St",
    source: "AvalonCommunities.com"
  }
];

// Helper function to scrape apartment prices using Puppeteer
async function scrapeApartmentPrices(url, availableUnits = ['studio', 'oneBed', 'twoBed', 'threeBed']) {
  let browser;
  try {
    // Launch browser with sandbox disabled for better compatibility
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to the URL with timeout
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for price elements to load
    await page.waitForSelector('[data-price], .price, [class*="price"]', { timeout: 10000 }).catch(() => {
      // Price selector might not exist, continue anyway
    });
    
    // Get the page content
    const content = await page.content();
    const $ = cheerio.load(content);
    
    // Try to find price information in common EquityApartments selectors
    // Look for unit type and price combinations
    const unitTypes = {};
    
    // Look for data attributes with pricing info
    $('[data-price]').each((i, elem) => {
      const price = $(elem).attr('data-price');
      const unitType = $(elem).attr('data-bedrooms') || $(elem).attr('data-bed-count') || $(elem).closest('[class*="unit"]').attr('class');
      
      if (price && !isNaN(parseInt(price))) {
        const priceNum = parseInt(price);
        if (priceNum > 1000 && priceNum < 15000) {
          unitTypes[unitType] = priceNum;
        }
      }
    });
    
    // Extract from text content
    const text = $.text();
    const prices = {};
    
    // Look for price patterns that explicitly state the bedroom type
    // Allow for flexible whitespace/newlines between label and price
    if (availableUnits.includes('studio')) {
      const studioMatch = text.match(/studio[\s\n]*\$?([\d,]+)/i);
      if (studioMatch && studioMatch[1]) {
        const price = parseInt(studioMatch[1].replace(/,/g, ''));
        if (price > 1000 && price < 15000) prices.studio = { current: price };
      }
    }
    
    if (availableUnits.includes('oneBed')) {
      const oneBedMatch = text.match(/1\s*bed[\s\n]*\$?([\d,]+)/i);
      if (oneBedMatch && oneBedMatch[1]) {
        const price = parseInt(oneBedMatch[1].replace(/,/g, ''));
        if (price > 1000 && price < 15000) prices.oneBed = { current: price };
      }
    }
    
    if (availableUnits.includes('twoBed')) {
      const twoBedMatch = text.match(/2\s*bed[\s\n]*\$?([\d,]+)/i);
      if (twoBedMatch && twoBedMatch[1]) {
        const price = parseInt(twoBedMatch[1].replace(/,/g, ''));
        if (price > 1000 && price < 15000) prices.twoBed = { current: price };
      }
    }
    
    if (availableUnits.includes('threeBed')) {
      const threeBedMatch = text.match(/3\s*bed[\s\n]*\$?([\d,]+)/i);
      if (threeBedMatch && threeBedMatch[1]) {
        const price = parseInt(threeBedMatch[1].replace(/,/g, ''));
        if (price > 1000 && price < 15000) prices.threeBed = { current: price };
      }
    }
    
    // Fallback: if patterns didn't work well, extract all prices and assign in order
    // This handles cases where the format is different or patterns don't match
    if (Object.keys(prices).length < 2) {
      // Extract all dollar amounts
      const allMatches = text.match(/\$([\d,]+)/g) || [];
      const priceList = allMatches
        .map(m => parseInt(m.replace(/[$,]/g, '')))
        .filter(p => p > 1000 && p < 10000)
        .sort((a, b) => a - b);
      
      // Remove duplicates while preserving order
      const uniquePrices = [...new Set(priceList)];
      
      // Only assign prices for unit types that are explicitly available
      let priceIndex = 0;
      if (availableUnits.includes('studio') && !prices.studio) {
        prices.studio = { current: uniquePrices[priceIndex] };
        priceIndex++;
      }
      if (availableUnits.includes('oneBed') && !prices.oneBed && priceIndex < uniquePrices.length) {
        prices.oneBed = { current: uniquePrices[priceIndex] };
        priceIndex++;
      }
      if (availableUnits.includes('twoBed') && !prices.twoBed && priceIndex < uniquePrices.length) {
        prices.twoBed = { current: uniquePrices[priceIndex] };
        priceIndex++;
      }
      if (availableUnits.includes('threeBed') && !prices.threeBed && priceIndex < uniquePrices.length) {
        prices.threeBed = { current: uniquePrices[priceIndex] };
        priceIndex++;
      }
    }
    
    await browser.close();
    return prices;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    if (browser) await browser.close();
    return {};
  }
}
// Helper function to save prices to JSON file
function savePricesToFile(results) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    
    // Create file names
    const dateFileName = `prices-${today}.json`;
    const latestFileName = 'latest-prices.json';
    const dateFilePath = path.join(dataDir, dateFileName);
    const latestFilePath = path.join(dataDir, latestFileName);
    
    // Prepare data to save
    const dataToSave = {
      date: today,
      timestamp: timestamp,
      apartments: results
    };
    
    // Save dated file
    fs.writeFileSync(dateFilePath, JSON.stringify(dataToSave, null, 2));
    console.log(`✅ Saved prices to ${dateFileName}`);
    
    // Save latest file (always overwrite)
    fs.writeFileSync(latestFilePath, JSON.stringify(dataToSave, null, 2));
    console.log(`✅ Updated ${latestFileName}`);
  } catch (error) {
    console.error('Error saving prices to file:', error.message);
  }
}

// Helper function to load latest prices from file
function loadLatestPrices() {
  try {
    const latestFilePath = path.join(dataDir, 'latest-prices.json');
    if (fs.existsSync(latestFilePath)) {
      const data = fs.readFileSync(latestFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading prices from file:', error.message);
  }
  return null;
}

function parseDailyScrapeTime(timeValue) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeValue || '');
  if (!match) {
    return { hour: 9, minute: 0, normalized: '09:00', valid: false };
  }

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const isValid = hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;

  if (!isValid) {
    return { hour: 9, minute: 0, normalized: '09:00', valid: false };
  }

  return {
    hour,
    minute,
    normalized: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    valid: true
  };
}

function getNextRunTime(hour, minute) {
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(hour, minute, 0, 0);

  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun;
}

async function runDetailedApartmentScrape(trigger = 'manual') {
  if (scrapeInProgress) {
    const error = new Error('Scrape already in progress');
    error.code = 'SCRAPE_IN_PROGRESS';
    throw error;
  }

  scrapeInProgress = true;
  const runStartedAt = new Date().toISOString();

  try {
    console.log(`🔄 Starting detailed apartment scrape (${trigger})...`);
    const results = [];
    const errors = [];

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
        errors.push({
          buildingId: building.id,
          buildingName: building.name,
          error: scrapeError
        });
        console.error(`❌ ${building.name} scrape failed: ${scrapeError}`);
      }

      const scrapedUnits = [];
      const unitIds = [];

      units.forEach((unit) => {
        const stableId = `${building.id}-${unit.bedrooms}bd-${unit.bathrooms}ba-${unit.squareFeet || 'unknown'}-f${unit.floor || 'x'}`;
        const unitId = stableId;
        unitIds.push(unitId);

        const apartmentData = {
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
        };

        db.upsertApartment(apartmentData);
        scrapedUnits.push(apartmentData);
      });

      if (!scrapeError) {
        db.archiveDelistedApartments(building.id, unitIds);
      } else {
        console.warn(`⚠️ Skipping archive update for ${building.name} due to scrape error`);
      }

      results.push({
        buildingId: building.id,
        buildingName: building.name,
        unitsFound: scrapedUnits.length,
        units: scrapedUnits,
        error: scrapeError
      });

      console.log(`✅ ${building.name}: ${scrapedUnits.length} units found`);
    }

    const totalUnits = results.reduce((sum, r) => sum + r.unitsFound, 0);
    const responseSuccess = errors.length === 0;

    const response = {
      success: responseSuccess,
      timestamp: new Date().toISOString(),
      totalUnits,
      errors,
      results
    };

    schedulerLastRun = {
      trigger,
      startedAt: runStartedAt,
      finishedAt: response.timestamp,
      success: responseSuccess,
      totalUnits,
      error: errors.length > 0 ? `${errors.length} building scrape(s) failed` : null,
      errors
    };

    return response;
  } catch (error) {
    schedulerLastRun = {
      trigger,
      startedAt: runStartedAt,
      finishedAt: new Date().toISOString(),
      success: false,
      totalUnits: 0,
      error: error.message
    };
    throw error;
  } finally {
    scrapeInProgress = false;
  }
}

function scheduleDailyScrape() {
  if (!ENABLE_DAILY_SCRAPER) {
    nextScheduledRunAt = null;
    console.log('📅 Daily scraper is disabled (ENABLE_DAILY_SCRAPER=false)');
    return;
  }

  const parsedTime = parsedSchedulerTime;
  if (!parsedTime.valid) {
    console.warn(`⚠️ Invalid DAILY_SCRAPE_TIME="${DAILY_SCRAPE_TIME}". Falling back to 09:00.`);
  }

  const scheduleNext = () => {
    if (dailyScrapeTimer) {
      clearTimeout(dailyScrapeTimer);
    }

    const nextRun = getNextRunTime(parsedTime.hour, parsedTime.minute);
    nextScheduledRunAt = nextRun.toISOString();
    const delayMs = nextRun.getTime() - Date.now();

    console.log(`📅 Next daily scrape scheduled for ${nextRun.toISOString()} (${parsedTime.normalized} local time)`);

    dailyScrapeTimer = setTimeout(async () => {
      try {
        const result = await runDetailedApartmentScrape('scheduled');
        const totalUnits = result.results.reduce((sum, r) => sum + r.unitsFound, 0);
        console.log(`✅ Scheduled scrape completed: ${totalUnits} units processed`);
      } catch (error) {
        if (error.code === 'SCRAPE_IN_PROGRESS') {
          console.log('⏳ Scheduled scrape skipped because another scrape is in progress');
        } else {
          console.error('❌ Scheduled scrape failed:', error.message);
        }
      } finally {
        scheduleNext();
      }
    }, delayMs);
  };

  scheduleNext();
}

function getSchedulerStatus() {
  return {
    enabled: ENABLE_DAILY_SCRAPER,
    configuredTime: parsedSchedulerTime.normalized,
    configuredTimeWasValid: parsedSchedulerTime.valid,
    runOnStartup: DAILY_SCRAPE_RUN_ON_STARTUP,
    scrapeInProgress,
    nextScheduledRunAt,
    lastRun: schedulerLastRun,
    now: new Date().toISOString()
  };
}

// API endpoint to scrape all apartments with detailed unit information
app.get('/api/apartments/scrape', async (req, res) => {
  try {
    const response = await runDetailedApartmentScrape('api');
    res.json(response);
  } catch (error) {
    if (error.code === 'SCRAPE_IN_PROGRESS') {
      return res.status(429).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to scrape apartments', details: error.message });
  }
});

// API endpoint to get all active apartments
app.get('/api/apartments', (req, res) => {
  try {
    const all = db.getAllApartments();
    res.json({
      total: all.length,
      apartments: all
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch apartments', details: error.message });
  }
});

// API endpoint to get apartments for a specific building
app.get('/api/buildings/:buildingId/apartments', (req, res) => {
  try {
    const buildingId = parseInt(req.params.buildingId);
    const apartments = db.getApartmentsByBuilding(buildingId);
    const building = buildings.find(b => b.id === buildingId);

    res.json({
      buildingId,
      buildingName: building?.name,
      address: building?.address,
      totalUnits: apartments.length,
      apartments
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch building apartments', details: error.message });
  }
});

// API endpoint to get apartment details
app.get('/api/apartments/:id', (req, res) => {
  try {
    const all = db.getAllApartments();
    const apartment = all.find(a => a.id === req.params.id);

    if (!apartment) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    res.json(apartment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch apartment', details: error.message });
  }
});

// API endpoint to get price history for an apartment
app.get('/api/apartments/:id/price-history', (req, res) => {
  try {
    const history = db.getPriceHistory(req.params.id);
    res.json({
      apartmentId: req.params.id,
      priceHistory: history
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch price history', details: error.message });
  }
});

// API endpoint to get lowest price per unit type in a building
app.get('/api/buildings/:buildingId/lowest-prices', (req, res) => {
  try {
    const buildingId = parseInt(req.params.buildingId);
    const lowestPrices = db.getLowestPricesByType(buildingId);
    const building = buildings.find(b => b.id === buildingId);

    res.json({
      buildingId,
      buildingName: building?.name,
      lowestPrices
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lowest prices', details: error.message });
  }
});

// API endpoint to get price statistics for a unit type
app.get('/api/buildings/:buildingId/stats/:unitType', (req, res) => {
  try {
    const buildingId = parseInt(req.params.buildingId);
    const unitType = req.params.unitType;
    const stats = db.getPriceStats(buildingId, unitType);

    if (!stats) {
      return res.status(404).json({ error: 'No data found for this unit type' });
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
  }
});

// API endpoint to get price history trends for a unit type
app.get('/api/buildings/:buildingId/price-trends/:unitType', (req, res) => {
  try {
    const buildingId = parseInt(req.params.buildingId);
    const unitType = req.params.unitType;
    const trends = db.getPriceHistoryByType(buildingId, unitType);

    res.json({
      buildingId,
      unitType,
      trends
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch price trends', details: error.message });
  }
});

// API endpoint to get archived apartments
app.get('/api/archived-apartments', (req, res) => {
  try {
    const buildingId = req.query.buildingId ? parseInt(req.query.buildingId) : null;
    const archived = db.getArchivedApartments(buildingId);

    res.json({
      total: archived.length,
      archived
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch archived apartments', details: error.message });
  }
});

// API endpoint to get building summaries
app.get('/api/buildings', (req, res) => {
  try {
    const buildingSummaries = buildings.map(building => {
      const apartments = db.getApartmentsByBuilding(building.id);
      const unitTypes = {};

      apartments.forEach(apt => {
        if (!unitTypes[apt.unitType]) {
          unitTypes[apt.unitType] = { count: 0, minPrice: Infinity };
        }
        unitTypes[apt.unitType].count++;

        const currentPrice = apt.priceHistory[apt.priceHistory.length - 1]?.price;
        if (currentPrice && currentPrice < unitTypes[apt.unitType].minPrice) {
          unitTypes[apt.unitType].minPrice = currentPrice;
        }
      });

      return {
        id: building.id,
        name: building.name,
        address: building.address,
        totalActiveUnits: apartments.length,
        totalArchivedUnits: db.getArchivedApartments(building.id).length,
        unitTypeSummary: unitTypes,
        url: building.url
      };
    });

    res.json(buildingSummaries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch buildings', details: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Daily scheduler status endpoint
app.get('/api/scheduler-status', (req, res) => {
  res.json(getSchedulerStatus());
});

if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDistDir)) {
  app.use(express.static(frontendDistDir));

  app.get(/^\/(?!api|health).*/, (req, res) => {
    res.sendFile(path.join(frontendDistDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏢 Rent Tracker Server running on http://0.0.0.0:${PORT}`);
  console.log(`📍 API endpoint: http://0.0.0.0:${PORT}/api/prices`);

  scheduleDailyScrape();

  if (DAILY_SCRAPE_RUN_ON_STARTUP) {
    runDetailedApartmentScrape('startup')
      .then((result) => {
        const totalUnits = result.results.reduce((sum, r) => sum + r.unitsFound, 0);
        console.log(`✅ Startup scrape completed: ${totalUnits} units processed`);
      })
      .catch((error) => {
        if (error.code === 'SCRAPE_IN_PROGRESS') {
          console.log('⏳ Startup scrape skipped because another scrape is in progress');
          return;
        }
        console.error('❌ Startup scrape failed:', error.message);
      });
  }
});
