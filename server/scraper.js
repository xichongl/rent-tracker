import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

/**
 * Enhanced apartment scraper that extracts individual units with details
 */
class ApartmentScraper {
  constructor() {
    this.unitTypeMap = {
      'studio': 0,
      'one bedroom': 1,
      '1 bed': 1,
      '1br': 1,
      'two bedroom': 2,
      '2 bed': 2,
      '2br': 2,
      'three bedroom': 3,
      '3 bed': 3,
      '3br': 3
    };
  }

  getBrowserLaunchOptions() {
    return {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote'
      ]
    };
  }

  /**
   * Parse unit type from text
   */
  parseUnitType(text) {
    const lower = text.toLowerCase().trim();
    for (const [key, bedrooms] of Object.entries(this.unitTypeMap)) {
      if (lower.includes(key)) {
        return { bedrooms, type: key };
      }
    }
    // If no bedroom info found, default to studio (0 bedrooms)
    return { bedrooms: 0, type: 'studio' };
  }

  /**
   * Extract square footage from text
   */
  parseSquareFeet(text) {
    const matches = text.match(/(\d+)\s*(?:sq\.?\s*ft\.?|sf|square feet)/i);
    return matches ? parseInt(matches[1]) : null;
  }

  /**
   * Extract price from text
   */
  parsePrice(text) {
    const matches = text.match(/\$\s*([\d,]+)/);
    return matches ? parseInt(matches[1].replace(/,/g, '')) : null;
  }

  /**
   * Parse bathroom count
   */
  parseBathrooms(text) {
    const matches = text.match(/(\d+(?:\.\d+)?)\s*(?:ba|bath|bathrooms?)/i);
    return matches ? parseFloat(matches[1]) : 1;
  }

  /**
   * Extract floor number from text
   */
  parseFloor(text) {
    const matches = text.match(/(?:floor|fl\.?)\s*(\d+)|(\d+)(?:st|nd|rd|th)\s+(?:floor|fl\.?)/i);
    return matches ? parseInt(matches[1] || matches[2]) : null;
  }

  /**
   * Extract available date from text
   */
  parseAvailableDate(text) {
    // Look for date patterns like "1/29/2026", "3/13/2026", etc.
    // This will match dates in M/D/YYYY or MM/DD/YYYY format
    const datePatterns = [
      // Look for explicit "Available" text with dates
      /available\s+(?:now|immediately)/i,
      /available\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
      // Look for move-in dates like "1/29/2026" or "Move-in: 3/13/2026"
      /(?:move[- ]?in|available)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      // Just look for any date pattern M/D/YYYY or MM/DD/YYYY
      /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[0].toLowerCase().includes('now') || match[0].toLowerCase().includes('immediately')) {
          return new Date().toISOString().split('T')[0];
        }
        if (match[1]) {
          return match[1];
        }
        // For the last pattern which doesn't have a capture group, use the whole match
        if (pattern.source.includes('\\b') && /\d{1,2}\/\d{1,2}\/\d{4}/.test(match[0])) {
          return match[0];
        }
      }
    }
    return null;
  }

  /**
   * Scrape apartments from EquityApartments
   */
  async scrapeEquityApartments(url) {
    let browser;
    try {
      browser = await puppeteer.launch(this.getBrowserLaunchOptions());

      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for unit listings or price panels
      await page.waitForSelector('.panel.panel-default, [class*="unit"], [data-test*="unit"]', 
        { timeout: 10000 }).catch(() => null);

      // Expand all collapsible panels to reveal unit details
      await page.evaluate(() => {
        // Click all collapse toggles to expand panels
        const toggles = document.querySelectorAll('[role="button"][data-toggle="collapse"]');
        toggles.forEach(toggle => {
          if (toggle.classList.contains('collapsed')) {
            toggle.click();
          }
        });
      }).catch(() => null);

      // Wait for panels to expand and content to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      const content = await page.content();
      const $ = cheerio.load(content);

      const units = [];
      let unitCounter = 0;

      // EquityApartments structure: .units section contains individual .unit-condensed-table elements
      // Each unit has pricing, bed/bath, sqft, and floor info
      const unitSections = $('.units');
      
      if (unitSections.length > 0) {
        unitSections.each((sectionIdx, sectionElem) => {
          const $section = $(sectionElem);
          
          // Get parent panel for bedroom type
          const $panel = $section.closest('.panel');
          const headingText = $panel.find('.panel-heading').text();
          const unitTypeInfo = this.parseUnitType(headingText);

          // Find all individual units in this section
          const unitElements = $section.find('.unit-condensed-table');
          
          unitElements.each((unitIdx, unitElem) => {
            const $unit = $(unitElem);
            const unitText = $unit.text();

            // Extract price
            const priceMatch = unitText.match(/\$\s*([\d,]+)/);
            let price = null;
            if (priceMatch) {
              price = parseInt(priceMatch[1].replace(/,/g, ''));
            }

            // Only process if we found a valid price
            if (!price || price < 1000 || price > 15000) {
              return; // Skip invalid prices
            }

            // Extract square footage - look for pattern like "610 SQFT" or "1,220 SQFT"
            let squareFeet = null;
            const sqftMatch = unitText.match(/(\d{1,2},\d{3}|\d+)\s*(?:SQFT|sq\.?\s*ft\.?|sqft|sf)/i);
            if (sqftMatch) {
              squareFeet = parseInt(sqftMatch[1].replace(/,/g, ''));
            }

            // Extract floor - look for "Floor X" pattern
            let floor = null;
            const floorMatch = unitText.match(/Floor\s+(\d+)/i);
            if (floorMatch) {
              floor = parseInt(floorMatch[1]);
            }

            // Extract bathrooms from bed/bath info
            const bathrooms = this.parseBathrooms(unitText);

            // Get available date
            const availableDate = this.parseAvailableDate(unitText);

            // Extract amenities
            const amenities = [];
            const amenityKeywords = [
              'hardwood', 'washer', 'dryer', 'dishwasher', 'air conditioning', 'a/c',
              'balcony', 'patio', 'parking', 'gym', 'pool', 'pet', 'furnished', 'laundry'
            ];
            
            amenityKeywords.forEach(keyword => {
              if (unitText.toLowerCase().includes(keyword)) {
                amenities.push(keyword);
              }
            });

            // Only add if we got meaningful data
            if (price && price > 1000 && price < 15000) {
              unitCounter++;
              units.push({
                id: `unit-${unitCounter}`,
                bedrooms: unitTypeInfo.bedrooms,
                bathrooms: bathrooms,
                squareFeet: squareFeet,
                floor: floor,
                availableDate: availableDate,
                unitType: this.getUnitTypeString(unitTypeInfo.bedrooms),
                floorPlan: {
                  name: `${unitTypeInfo.type} - Floor ${floor || 'N/A'}`,
                  sqft: squareFeet
                },
                price: price,
                amenities: [...new Set(amenities)], // Remove duplicates
                features: this.extractFeatures(unitText)
              });
            }
          });
        });
      }

      // Fallback: if we didn't find units via panels, try other selectors
      if (units.length === 0) {
        const unitSelectors = [
          '[class*="apartment"]',  // Generic apartment container
          '[class*="unit"]',        // Generic unit container
          '[class*="floorplan"]',   // Floor plan specific
          'article',                // Article elements
          '[class*="card"]'         // Card layout
        ];

        for (const selector of unitSelectors) {
          const elements = $(selector);
          if (elements.length > 0) {
            elements.each((i, elem) => {
              const $elem = $(elem);
              const fullText = $elem.text();

              // Extract price - look for $ sign followed by numbers
              const priceMatch = fullText.match(/\$\s*[\d,]+/);
              let price = null;
              if (priceMatch) {
                price = this.parsePrice(priceMatch[0]);
              }

              // Only process if we found a valid price
              if (!price || price < 1000 || price > 15000) {
                return; // Skip invalid prices
              }

              // Extract unit type from text
              const unitTypeInfo = this.parseUnitType(fullText);

              // Extract square footage
              let squareFeet = null;
              const sqftWithLabel = fullText.match(/(\d{1,2},\d{3}|\d{3,4})\s*(?:sq\.?\s*ft\.?|sqft|sf)/gi);
              if (sqftWithLabel && sqftWithLabel.length > 0) {
                const values = sqftWithLabel.map(m => {
                  const num = m.match(/(\d+)/g);
                  return num ? parseInt(num.join('')) : null;
                }).filter(n => n && n >= 300 && n <= 5000);
                if (values.length > 0) {
                  squareFeet = Math.max(...values);
                }
              }

              // Extract floor
              let floor = null;
              const floorMatch = fullText.match(/(?:floor|fl\.?)\s*(\d+)|(\d+)(?:st|nd|rd|th)\s+floor/i);
              if (floorMatch) {
                floor = parseInt(floorMatch[1] || floorMatch[2]);
              }

              // Extract available date
              const availableDate = this.parseAvailableDate(fullText);

              // Get bathrooms
              const bathrooms = this.parseBathrooms(fullText);

              // Extract amenities
              const amenities = [];
              const amenityKeywords = [
                'hardwood', 'washer', 'dryer', 'dishwasher', 'air conditioning', 'a/c',
                'balcony', 'patio', 'parking', 'gym', 'pool', 'pet', 'furnished', 'laundry'
              ];
              
              amenityKeywords.forEach(keyword => {
                if (fullText.toLowerCase().includes(keyword)) {
                  amenities.push(keyword);
                }
              });

              // Only add if we got meaningful data
              if (price && price > 1000 && price < 15000) {
                unitCounter++;
                units.push({
                  id: `unit-${unitCounter}`,
                  bedrooms: unitTypeInfo.bedrooms,
                  bathrooms: bathrooms,
                  squareFeet: squareFeet,
                  floor: floor,
                  availableDate: availableDate,
                  unitType: this.getUnitTypeString(unitTypeInfo.bedrooms),
                  floorPlan: {
                    name: '',
                    sqft: squareFeet
                  },
                  price: price,
                  amenities: [...new Set(amenities)],
                  features: this.extractFeatures(fullText)
                });
              }
            });

            if (units.length > 0) break; // Found units, don't try other selectors
          }
        }
      }

      await browser.close();
      return units;

    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
      if (browser) {
        await browser.close().catch(() => null);
      }
      throw new Error(`Equity scrape failed: ${error.message}`);
    }
  }

  /**
   * Extract features from text
   */
  extractFeatures(text) {
    const features = {};
    const lowerText = text.toLowerCase();

    features.hasWasherDryer = /washer|dryer|laundry|w\/d|in-unit/i.test(lowerText);
    features.hasBalcony = /balcony|patio|terrace|deck/i.test(lowerText);
    features.hasDishwasher = /dishwasher/i.test(lowerText);
    features.hasAC = /air conditioning|a\/c|air-conditioned|central air/i.test(lowerText);
    features.hasParkingIncluded = /parking\s+included|free\s+parking|included\s+parking/i.test(lowerText);
    features.hasGym = /fitness|gym|workout|exercise/i.test(lowerText);
    features.hasPool = /pool|swimming/i.test(lowerText);
    features.hasHardwood = /hardwood|wood|flooring/i.test(lowerText);
    features.isPetFriendly = /pet|dog|cat|friendly/i.test(lowerText);

    return features;
  }

  /**
   * Convert bedroom count to unit type string
   */
  getUnitTypeString(bedrooms) {
    const typeMap = {
      0: 'studio',
      1: 'oneBed',
      2: 'twoBed',
      3: 'threeBed'
    };
    return typeMap[bedrooms] || `bed${bedrooms}`;
  }

  /**
   * Scrape apartments from Avalon Communities
   * Extracts data from embedded JSON in window.Fusion.globalContent.units
   */
  async scrapeAvalon(url) {
    let browser;
    try {
      browser = await puppeteer.launch(this.getBrowserLaunchOptions());

      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for page to fully load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract units from embedded JSON
      const units = await page.evaluate(() => {
        try {
          const globalContent = window.Fusion?.globalContent;
          if (!globalContent || !globalContent.units) {
            return [];
          }
          return globalContent.units;
        } catch (e) {
          console.error('Error extracting Avalon data:', e);
          return [];
        }
      });

      await browser.close();

      // Transform Avalon data to our format
      const processedUnits = units.map((unit, index) => {
        // Determine unit type string based on bedroom number
        let unitType = this.getUnitTypeString(unit.bedroomNumber || 0);
        
        // Extract price - use startingAtPricesUnfurnished by default
        let price = 0;
        if (unit.startingAtPricesUnfurnished && unit.startingAtPricesUnfurnished.prices) {
          price = unit.startingAtPricesUnfurnished.prices.netEffectivePrice || 
                  unit.startingAtPricesUnfurnished.prices.price || 0;
        }

        // Parse available date
        let availableDate = null;
        if (unit.availableDateUnfurnished) {
          const date = new Date(unit.availableDateUnfurnished);
          availableDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
        }

        // Extract amenities from characteristics if available
        const amenities = [];
        if (unit.floorPlan && unit.floorPlan.name) {
          amenities.push(unit.floorPlan.name);
        }
        if (unit.characteristics && Array.isArray(unit.characteristics)) {
          amenities.push(...unit.characteristics);
        }

        // Build unit object
        return {
          id: `unit-${index}`,
          bedrooms: unit.bedroomNumber || 0,
          bathrooms: unit.bathroomNumber || 1,
          squareFeet: unit.squareFeet || null,
          floor: unit.floorNumber ? parseInt(unit.floorNumber) : null,
          availableDate: availableDate,
          unitType: unitType,
          floorPlan: {
            name: unit.floorPlan?.name || '',
            sqft: unit.squareFeet || null
          },
          price: Math.floor(price),
          amenities: [...new Set(amenities)],
          features: this.extractFeatures(unit.floorPlan?.name || ''),
          unitNumber: unit.unitName || null,
          status: unit.unitStatus || 'active'
        };
      }).filter(unit => {
        // Only include units with valid prices
        return unit.price > 1000 && unit.price < 15000;
      });

      return processedUnits;

    } catch (error) {
      console.error(`Error scraping Avalon ${url}:`, error.message);
      if (browser) {
        await browser.close().catch(() => null);
      }
      throw new Error(`Avalon scrape failed: ${error.message}`);
    }
  }
}

export default new ApartmentScraper();
