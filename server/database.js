import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR
  ? (path.isAbsolute(process.env.DATA_DIR)
      ? process.env.DATA_DIR
      : path.resolve(__dirname, '..', process.env.DATA_DIR))
  : path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_FILE = path.join(dataDir, 'apartments-db.json');
const ARCHIVE_FILE = path.join(dataDir, 'archived-apartments.json');

/**
 * Individual apartment unit structure:
 * {
 *   id: "apt-1-studio-001",
 *   buildingId: 1,
 *   buildingName: "Emerson Place",
 *   unitType: "studio",
 *   bedrooms: 0,
 *   bathrooms: 1,
 *   squareFeet: 450,
 *   availableDate: "2026-02-15",
 *   floorPlan: {
 *     name: "Studio A",
 *     sqft: 450,
 *     image: "url"
 *   },
 *   amenities: ["hardwood floors", "in-unit washer/dryer"],
 *   features: {
 *     hasWasherDryer: true,
 *     hasBalcony: false,
 *     hasDishwasher: true
 *   },
 *   priceHistory: [
 *     { date: "2026-01-23", price: 2655, timestamp: "2026-01-23T21:28:01.154Z" }
 *   ],
 *   status: "active", // "active", "archived", "delisted"
 *   lastSeen: "2026-01-23",
 *   delistedDate: null,
 *   createdDate: "2026-01-20"
 * }
 */

class ApartmentDatabase {
  constructor() {
    this.data = this.loadDatabase();
    this.archived = this.loadArchive();
  }

  loadDatabase() {
    try {
      if (fs.existsSync(DB_FILE)) {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      }
    } catch (error) {
      console.error('Error loading database:', error.message);
    }
    return {
      lastUpdated: null,
      apartments: {} // buildingId -> [units]
    };
  }

  loadArchive() {
    try {
      if (fs.existsSync(ARCHIVE_FILE)) {
        return JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf-8'));
      }
    } catch (error) {
      console.error('Error loading archive:', error.message);
    }
    return {
      lastArchived: null,
      apartments: []
    };
  }

  saveDatabase() {
    try {
      this.data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving database:', error.message);
    }
  }

  saveArchive() {
    try {
      this.archived.lastArchived = new Date().toISOString();
      fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(this.archived, null, 2));
    } catch (error) {
      console.error('Error saving archive:', error.message);
    }
  }

  /**
   * Upsert an apartment unit
   */
  upsertApartment(apartment) {
    const buildingId = apartment.buildingId;
    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    
    if (!this.data.apartments[buildingId]) {
      this.data.apartments[buildingId] = [];
    }

    const existing = this.data.apartments[buildingId].find(apt => apt.id === apartment.id);
    
    if (existing) {
      // Update existing apartment
      // Preserve price history and maintain one snapshot per day
      if (!existing.priceHistory) {
        existing.priceHistory = [];
      }

      const lastEntry = existing.priceHistory[existing.priceHistory.length - 1];

      if (apartment.price) {
        if (!lastEntry || lastEntry.date !== today) {
          existing.priceHistory.push({
            date: today,
            price: apartment.price,
            timestamp: nowIso
          });
        } else if (lastEntry.price !== apartment.price) {
          // Same-day refresh: keep latest observed price for today
          lastEntry.price = apartment.price;
          lastEntry.timestamp = nowIso;
        }
      }

      // Update fields
      Object.assign(existing, {
        ...apartment,
        priceHistory: existing.priceHistory,
        lastSeen: today,
        status: 'active' // Mark as active if we still see it
      });
    } else {
      // New apartment
      this.data.apartments[buildingId].push({
        ...apartment,
        status: 'active',
        lastSeen: today,
        createdDate: today,
        priceHistory: apartment.price ? [{
          date: today,
          price: apartment.price,
          timestamp: nowIso
        }] : []
      });
    }

    this.saveDatabase();
  }

  /**
   * Mark apartments as delisted and archive them
   */
  archiveDelistedApartments(buildingId, currentUnitIds) {
    if (!this.data.apartments[buildingId]) return;

    const building = this.data.apartments[buildingId];
    const toArchive = building.filter(apt => 
      apt.status === 'active' && !currentUnitIds.includes(apt.id)
    );

    toArchive.forEach(apt => {
      apt.status = 'archived';
      apt.delistedDate = new Date().toISOString().split('T')[0];
      this.archived.apartments.push({
        ...apt,
        archivedDate: new Date().toISOString().split('T')[0]
      });
    });

    // Remove archived from main database
    this.data.apartments[buildingId] = building.filter(apt => apt.status === 'active');

    this.saveDatabase();
    this.saveArchive();
  }

  /**
   * Get all active apartments for a building
   */
  getApartmentsByBuilding(buildingId) {
    return this.data.apartments[buildingId] || [];
  }

  /**
   * Get all apartments across all buildings
   */
  getAllApartments() {
    const all = [];
    Object.values(this.data.apartments).forEach(building => {
      all.push(...building);
    });
    return all;
  }

  /**
   * Get lowest price for each unit type in a building
   */
  getLowestPricesByType(buildingId) {
    const apartments = this.getApartmentsByBuilding(buildingId);
    const pricesByType = {};

    apartments.forEach(apt => {
      const type = apt.unitType;
      const currentPrice = apt.priceHistory[apt.priceHistory.length - 1]?.price;
      
      if (currentPrice) {
        if (!pricesByType[type]) {
          pricesByType[type] = {
            price: currentPrice,
            unit: apt
          };
        } else if (currentPrice < pricesByType[type].price) {
          pricesByType[type] = {
            price: currentPrice,
            unit: apt
          };
        }
      }
    });

    return pricesByType;
  }

  /**
   * Get price statistics for a unit type in a building
   */
  getPriceStats(buildingId, unitType) {
    const apartments = this.getApartmentsByBuilding(buildingId)
      .filter(apt => apt.unitType === unitType);

    const prices = apartments
      .map(apt => apt.priceHistory[apt.priceHistory.length - 1]?.price)
      .filter(p => p !== undefined);

    if (prices.length === 0) return null;

    prices.sort((a, b) => a - b);
    
    return {
      unitType,
      buildingId,
      count: apartments.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      median: prices.length % 2 === 0 
        ? Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
        : prices[Math.floor(prices.length / 2)]
    };
  }

  /**
   * Get archived apartments
   */
  getArchivedApartments(buildingId = null) {
    if (buildingId) {
      return this.archived.apartments.filter(apt => apt.buildingId === buildingId);
    }
    return this.archived.apartments;
  }

  /**
   * Get price history for an apartment
   */
  getPriceHistory(apartmentId) {
    const all = this.getAllApartments();
    const apt = all.find(a => a.id === apartmentId);
    return apt ? apt.priceHistory : [];
  }

  /**
   * Get historical prices for a building and unit type
   */
  getPriceHistoryByType(buildingId, unitType) {
    const apartments = this.getApartmentsByBuilding(buildingId)
      .filter(apt => apt.unitType === unitType);

    // Collect all dates
    const allDates = new Set();
    apartments.forEach(apt => {
      apt.priceHistory.forEach(entry => {
        allDates.add(entry.date);
      });
    });

    // Build time series with min price for each date
    const timeSeries = Array.from(allDates).sort().map(date => {
      const pricesOnDate = apartments
        .map(apt => {
          const entry = apt.priceHistory.find(p => p.date === date);
          return entry ? entry.price : null;
        })
        .filter(p => p !== null);

      return {
        date,
        min: Math.min(...pricesOnDate),
        max: Math.max(...pricesOnDate),
        avg: Math.round(pricesOnDate.reduce((a, b) => a + b, 0) / pricesOnDate.length),
        count: pricesOnDate.length
      };
    });

    return timeSeries;
  }
}

export default new ApartmentDatabase();
