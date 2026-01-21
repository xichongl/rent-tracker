import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5174;

app.use(cors());
app.use(express.json());

// Apartment URLs to scrape
const apartments = [
  {
    id: 1,
    name: "Emerson Place",
    url: "https://www.equityapartments.com/boston/west-end/emerson-place-apartments",
    source: "EquityApartments.com",
    availableUnits: ['studio', 'oneBed', 'twoBed', 'threeBed']
  },
  {
    id: 2,
    name: "Alcott",
    url: "https://www.equityapartments.com/boston/west-end/alcott-apartments",
    source: "EquityApartments.com",
    availableUnits: ['studio', 'oneBed', 'twoBed']  // No 3 bed
  },
  {
    id: 3,
    name: "West End Apartments",
    url: "https://www.equityapartments.com/boston/west-end/the-west-end-apartments-asteria-villas-and-vesta",
    source: "EquityApartments.com",
    availableUnits: ['studio', 'oneBed', 'twoBed']  // No 3 bed
  },
  {
    id: 4,
    name: "The Towers at Longfellow Apartments",
    url: "https://www.equityapartments.com/boston/west-end/the-towers-at-longfellow-apartments",
    source: "EquityApartments.com",
    availableUnits: ['studio', 'oneBed', 'twoBed', 'threeBed']
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

// API endpoint to get all apartment prices
app.get('/api/prices', async (req, res) => {
  try {
    const results = [];

    for (const apt of apartments) {
      const prices = await scrapeApartmentPrices(apt.url, apt.availableUnits);
      results.push({
        id: apt.id,
        name: apt.name,
        url: apt.url,
        source: apt.source,
        prices: prices,
        timestamp: new Date().toISOString(),
        scraped: Object.keys(prices).length > 0
      });
    }

    // Save scraped data to JSON file
    savePricesToFile(results);

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prices', details: error.message });
  }
});

// API endpoint to scrape a single apartment
app.get('/api/prices/:id', async (req, res) => {
  try {
    const apt = apartments.find(a => a.id === parseInt(req.params.id));
    if (!apt) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    const prices = await scrapeApartmentPrices(apt.url, apt.availableUnits);
    res.json({
      id: apt.id,
      name: apt.name,
      url: apt.url,
      source: apt.source,
      prices: prices,
      timestamp: new Date().toISOString(),
      scraped: Object.keys(prices).length > 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch price', details: error.message });
  }
});

// API endpoint to get saved price data
app.get('/api/saved-prices', (req, res) => {
  try {
    const savedData = loadLatestPrices();
    if (savedData) {
      res.json(savedData);
    } else {
      res.status(404).json({ error: 'No saved price data found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve saved prices', details: error.message });
  }
});

// API endpoint to list all saved price files
app.get('/api/saved-prices/list', (req, res) => {
  try {
    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('prices-') && f.endsWith('.json'));
    const fileList = files.map(f => ({
      filename: f,
      date: f.replace('prices-', '').replace('.json', '')
    }));
    res.json(fileList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list saved prices', details: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🏢 Rent Tracker Server running on http://localhost:${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/prices`);
});
