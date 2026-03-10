# 🏢 Boston West End Rent Tracker

A real-time rental price tracking application for apartments in Boston's West End neighborhood, with live web scraping from EquityApartments.com. **Now tracks individual apartments with floor plans, amenities, and archives delisted units!**

## 🚀 New Features (v2.0)

- **Individual Unit Tracking**: Tracks every apartment (100+ units) instead of just aggregate prices
- **Floor Plan Details**: Captures floor plan names, square footage, bedroom/bathroom counts
- **Amenities & Features**: Extracts amenities (hardwood floors, washer/dryer) and features (AC, parking, pet-friendly)
- **Archive System**: Automatically archives delisted apartments with historical pricing
- **Price Per Unit**: Complete price history for each specific apartment
- **Advanced Analytics**: Lowest price per type, statistics, price trends
- **Enhanced UI**: View individual apartments, filter by specs, track delisting dates

## 📋 Prerequisites

- Node.js 16+ installed
- npm or yarn package manager

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies (already done, but if needed)
cd server && npm install && cd ..
```

### 2. Run Both Frontend and Backend Simultaneously

```bash
npm run dev:all
```

This command runs:
- **Backend Server**: http://localhost:5174 (scraping API with database)
- **Frontend App**: http://localhost:5173 (React app with UI)

### 3. Alternative: Run Separately

**Terminal 1 - Backend Server:**
```bash
npm run dev:server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 4. Configure Server-Side Daily Scrape (Optional)

The backend now supports a built-in daily scheduler that runs even if the frontend is not open.

Environment variables (set before starting the server):

- `ENABLE_DAILY_SCRAPER` (`true` by default): set to `false` to disable automatic daily scraping
- `DAILY_SCRAPE_TIME` (`09:00` by default): 24-hour local time when the scrape should run
- `DAILY_SCRAPE_RUN_ON_STARTUP` (`false` by default): set to `true` to run one scrape immediately at server start

Examples:

```bash
# Run server with daily scrape at 08:30 local time
cd server
DAILY_SCRAPE_TIME=08:30 npm run dev

# Disable scheduler entirely
ENABLE_DAILY_SCRAPER=false npm run dev

# Run once on startup + continue daily schedule
DAILY_SCRAPE_RUN_ON_STARTUP=true npm run dev
```

## 🌐 Monitored Buildings

The application scrapes individual apartments from:

1. **Emerson Place**
   - https://www.equityapartments.com/boston/west-end/emerson-place-apartments
   
2. **Alcott Apartments**
   - https://www.equityapartments.com/boston/west-end/alcott-apartments
   
3. **West End Apartments**
   - https://www.equityapartments.com/boston/west-end/the-west-end-apartments-asteria-villas-and-vesta
   
4. **The Towers at Longfellow Apartments**
   - https://www.equityapartments.com/boston/west-end/the-towers-at-longfellow-apartments

## 📊 API Endpoints

### Core Data
```
GET http://localhost:5174/api/apartments
GET http://localhost:5174/api/apartments/:id
GET http://localhost:5174/api/apartments/:id/price-history
POST http://localhost:5174/api/apartments/scrape
```

### Building Analytics
```
GET http://localhost:5174/api/buildings
GET http://localhost:5174/api/buildings/:buildingId/apartments
GET http://localhost:5174/api/buildings/:buildingId/lowest-prices
GET http://localhost:5174/api/buildings/:buildingId/stats/:unitType
GET http://localhost:5174/api/buildings/:buildingId/price-trends/:unitType
```

### Archive Management
```
GET http://localhost:5174/api/archived-apartments
GET http://localhost:5174/api/archived-apartments?buildingId=1
```

### Health Check
```
GET http://localhost:5174/health
GET http://localhost:5174/api/scheduler-status
```

## 🏗️ Project Structure

```
rent-tracker/
├── src/                      # React frontend
│   ├── App.jsx              # Main app - individual unit tracking
│   ├── App.css              # App styles
│   ├── index.css            # Global styles with Tailwind
│   └── main.jsx             # Entry point
├── server/                  # Node.js backend
│   ├── index.js            # Express server & API endpoints
│   ├── database.js         # Individual apartment database layer
│   ├── scraper.js          # Enhanced scraper for unit details
│   └── package.json        # Server dependencies
├── data/                    # Data storage
│   ├── apartments-db.json  # Active apartments with histories
│   ├── archived-apartments.json  # Delisted units
│   └── prices-YYYY-MM-DD.json  # Daily snapshots
├── package.json            # Frontend dependencies & scripts
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── SETUP.md                # This file
├── ENHANCEMENTS.md         # Detailed v2.0 features
└── README.md               # Original readme
```

## 🔄 How It Works

1. **Frontend** loads and displays all apartments from database
2. **User** clicks "Scrape Now" or waits for automatic daily scrape
3. **Backend** scrapes each building's apartment listings
4. **Scraper** extracts individual unit details (floor plan, amenities, features)
5. **Database** stores/updates each apartment with price history
6. **Archive** automatically moves delisted units
7. **Frontend** refreshes to show new/updated apartments
8. **User** can view details, price history, and compare units

## 💾 Data Storage

All data persists in JSON files:

- **apartments-db.json**: All active apartments with complete details
- **archived-apartments.json**: Delisted apartments for comparison
- **prices-YYYY-MM-DD.json**: Daily price snapshots (legacy format)

## 🎯 Using the Interface

### Filter Apartments
- **Unit Type**: Studio, 1 Bed, 2 Bed, 3 Bed
- **Price Range**: Min and max monthly rent
- **Square Footage**: Min and max sqft
- Click building to filter by complex

### View Apartment Details
1. Click any apartment in the list
2. See full specs: bedrooms, bathrooms, sqft, price/sqft
3. View amenities and features
4. Track price history over time
5. Compare with other units

### Monitor Delisting
- Click "Archived" button to see removed apartments
- Shows delisting date and last known price
- Helps track building renovations or conversions

## ⚠️ Important Notes

- The backend must be running for scraping to work
- Daily updates can run server-side via scheduler, or manually via "Scrape Now"
- Data is stored locally in `/data/` directory
- Each apartment tracked individually for accurate trends
- Delisted apartments automatically archived with full history

## 🛠️ Troubleshooting

**Issue**: "Could not connect to scraping server"
- **Solution**: Make sure `npm run dev:server` is running on port 5174

**Issue**: No apartments showing
- **Solution**: Click "Scrape Now" to fetch initial data
- Check that backend is running
- Check browser console for errors

**Issue**: Price history missing
- **Solution**: Need at least 2 scrapes on different days
- Data accumulates over time for trend analysis
- Check that `data/apartments-db.json` exists

**Issue**: CORS errors
- **Solution**: Backend has CORS enabled for localhost - ensure accessing http://localhost:5173

**Issue**: Website structure changed (no units found)
- **Solution**: Update CSS selectors in `server/scraper.js`
- Check browser DevTools to find new element structure
- Update `scrapeEquityApartments()` method

## 📦 Build for Production

```bash
npm run build
npm run preview
```

## 🚀 What's New in v2.0

✅ Individual apartment tracking (was: aggregate by type)  
✅ Floor plan details and square footage  
✅ Amenities and features extraction  
✅ Automatic archive of delisted units  
✅ Price history per unit (not per building)  
✅ Advanced filtering by specs  
✅ Building analytics and statistics  
✅ UI redesigned for unit-level comparison  

See [ENHANCEMENTS.md](ENHANCEMENTS.md) for complete documentation.

## 📝 License

MIT
