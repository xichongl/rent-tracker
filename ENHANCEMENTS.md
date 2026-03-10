# Rent Tracker Enhancements - Implementation Guide

## Overview

Your rent tracker has been significantly upgraded to track **individual apartments** with detailed information instead of just aggregated prices by unit type. The system now captures floor plans, amenities, square footage, and maintains complete historical pricing for each apartment.

## Key Improvements

### 1. ✅ Individual Apartment Tracking
- **Before**: Tracked average prices per building (1 Studio, 1 One-Bed, etc.)
- **After**: Tracks every individual apartment unit (100+ total units across buildings)
- Each apartment has unique ID, floor plan, amenities, and features

### 2. ✅ Enhanced Data Capture
The scraper now extracts:
- **Floor Plan Details**: Name, square footage
- **Unit Specifications**: Bedrooms, bathrooms, square feet
- **Amenities**: Hardwood floors, in-unit washer/dryer, balcony, etc.
- **Features**: AC, parking included, pet-friendly, pool, gym, dishwasher, etc.

### 3. ✅ Archive System for Delisted Apartments
- Automatically detects when apartments are no longer listed
- Moves them to archive with last known price and delisting date
- Preserves historical data for comparison and analysis
- View all archived units separately

### 4. ✅ Price History Per Unit
- Complete historical pricing for each individual apartment
- Track price changes over time for specific units
- Calculate price trends and identify best deals
- See which apartments hold value best

### 5. ✅ Advanced Analytics
New endpoints provide:
- **Lowest prices per unit type** within each building
- **Price statistics** (min, max, avg, median)
- **Price trends** showing min/max/avg over time
- **Price per square foot** for efficiency comparison

## New Files Created

### Backend
- **[server/database.js](server/database.js)** - Core database layer
  - `ApartmentDatabase` class with full CRUD operations
  - Price history management
  - Archive functionality
  - Statistical calculations

- **[server/scraper.js](server/scraper.js)** - Enhanced scraper module
  - `ApartmentScraper` class
  - Intelligent unit extraction from HTML
  - Amenity and feature detection
  - Handles multiple website structures

### Frontend
- **[src/App.jsx](src/App.jsx)** - Completely redesigned UI
  - Building selection sidebar
  - Individual apartment list with detailed info
  - Selected apartment detail view
  - Archived apartments viewer
  - Price history charts per unit
  - Advanced filters (price range, sqft, unit type)

## Database Schema

### Main Database Structure
```json
{
  "lastUpdated": "2026-01-24T12:00:00Z",
  "apartments": {
    "1": [
      {
        "id": "apt-1-studio-001",
        "buildingId": 1,
        "buildingName": "Emerson Place",
        "unitType": "studio",
        "bedrooms": 0,
        "bathrooms": 1,
        "squareFeet": 450,
        "floorPlan": {
          "name": "Studio A",
          "sqft": 450
        },
        "amenities": ["hardwood floors", "in-unit washer/dryer"],
        "features": {
          "hasWasherDryer": true,
          "hasBalcony": false,
          "hasDishwasher": true,
          "hasAC": true,
          "hasParkingIncluded": false,
          "hasGym": true,
          "hasPool": false,
          "hasHardwood": true,
          "isPetFriendly": true
        },
        "priceHistory": [
          { "date": "2026-01-23", "price": 2655, "timestamp": "2026-01-23T21:28:01.154Z" }
        ],
        "status": "active",
        "lastSeen": "2026-01-23",
        "delistedDate": null,
        "createdDate": "2026-01-20"
      }
    ]
  }
}
```

### Archive Structure
```json
{
  "lastArchived": "2026-01-24T12:00:00Z",
  "apartments": [
    {
      "id": "apt-1-studio-002",
      "buildingId": 1,
      "buildingName": "Emerson Place",
      ...similar to above...,
      "status": "archived",
      "delistedDate": "2026-01-24",
      "archivedDate": "2026-01-24T12:00:00Z"
    }
  ]
}
```

## New API Endpoints

### Scraping & Data
- `POST /api/apartments/scrape` - Trigger full scrape and store all individual units
- `GET /api/apartments` - Get all active apartments
- `GET /api/apartments/:id` - Get specific apartment details
- `GET /api/apartments/:id/price-history` - Get price history for one apartment

### Building Data
- `GET /api/buildings` - Building summaries with stats
- `GET /api/buildings/:buildingId/apartments` - All apartments in a building
- `GET /api/buildings/:buildingId/lowest-prices` - Lowest price per unit type
- `GET /api/buildings/:buildingId/stats/:unitType` - Statistics for unit type
- `GET /api/buildings/:buildingId/price-trends/:unitType` - Historical price trends

### Archive
- `GET /api/archived-apartments` - All or building-specific archived units

## Frontend Features

### Building Selector
- Click buildings to filter apartments
- Shows active/archived unit counts per building
- Visual feedback for selected building

### Apartment List
- Shows every individual unit available
- Filters by: unit type, price range, square footage
- Displays: unit type, bedrooms, bathrooms, floor plan, current price
- Shows price changes (↑↓) from previous day

### Detail View (Click Apartment)
Displays:
- Current price with large display
- Bed/bath/sqft specifications
- Price per sqft for efficiency comparison
- Amenities badges
- Features checklist
- Price history chart showing trends

### Archived Section
- Toggle to view all delisted apartments
- Shows when units were delisted
- Last known price before delisting
- Helps identify building trends

## Usage

### Start the Application
```bash
# Root directory
npm run dev:all

# Or separately:
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev
```

### Scrape Apartments
Click "Scrape Now" button in UI or wait for automatic daily scrape.

System will:
1. Visit each building's page
2. Extract all individual unit listings
3. Capture floor plan, amenities, features
4. Update prices for existing units
5. Archive units no longer listed

## Analytics & Insights

You can now answer questions like:
- Which specific apartment is cheapest for each type?
- Which apartments hold value best (least price increase)?
- How many units are available by type in each building?
- What amenities come with specific price points?
- When did specific units appear/disappear?
- Historical comparison: cheapest studios across all dates?

## Data Files

All data stored in `/data/`:
- `apartments-db.json` - Main database with all active apartments
- `archived-apartments.json` - All delisted apartments with history
- `prices-YYYY-MM-DD.json` - Daily price snapshots (kept for backward compatibility)

## Next Steps (Optional Enhancements)

1. **Notifications**: Alert when favorite apartment is delisted
2. **Export**: Download price history as CSV
3. **Comparison**: Side-by-side unit comparison
4. **Trends**: Building-wide trend analysis and predictions
5. **Search**: Full-text search across amenities and features
6. **API Keys**: Secure authenticated API access

## Technical Details

### Database Module (`database.js`)
- Persistent JSON storage
- Transaction-like operations (save after each change)
- Handles orphaned records during archival
- Efficient date sorting and filtering

### Scraper Module (`scraper.js`)
- Regex-based unit type detection (studio, 1bed, 2bed, 3bed)
- Flexible HTML selector matching
- Feature detection via keyword matching
- Fallback strategies for site structure changes

### Frontend State Management
- React hooks for state (apartments, filters, selections)
- Usememo for efficient filtering
- Real-time price change calculation
- LocalStorage for scrape timestamps

## Backward Compatibility

Old API endpoints still supported:
- `/api/prices` - Returns old format (for transition period)
- `/api/historical-prices` - Works as before
- `/api/saved-prices` - Returns latest price snapshot

## Troubleshooting

**No apartments showing after scrape?**
- Check browser console for errors
- Ensure server is running (`npm run dev:server`)
- Check that websites still use expected HTML structure
- May need to update CSS selectors if websites changed

**Archived apartments not showing?**
- Click "Archived" button to toggle visibility
- Check data/archived-apartments.json exists
- Ensure you've run at least one scrape

**Price history not appearing for unit?**
- Need at least 2 data points (2 different dates)
- Wait until next day's scrape or manually trigger
- Check apartment status is "active"

## Questions?

The system is designed to be maintainable. Feel free to customize:
- Scraper selectors in `scraper.js` if website structure changes
- Feature detection keywords in `extractFeatures()`
- Database queries in `database.js` for custom analytics
- UI components in `App.jsx` for different views
