# Quick Start - Testing the Enhancements

## 1. Start the Application

```bash
# From root directory
npm run dev:all
```

This starts both:
- Backend on http://localhost:5174
- Frontend on http://localhost:5173

## 2. First Time Setup

When you first load http://localhost:5173, you'll see:
- 4 buildings listed on the left
- "Scrape Now" button at top right
- Empty apartments list (no data yet)

## 3. Scrape Initial Data

Click the **"Scrape Now"** button and wait 2-3 minutes for scraping to complete.

You should see:
- Status changing to "Scraping apartments..."
- Number of units found increasing
- Apartments appearing in the list once scrape completes

## 4. Explore the Features

### View Individual Apartments
Click any apartment card to see:
- Current price
- Bedrooms, bathrooms, square footage
- Price per square foot
- Floor plan name
- Amenities (green badges)
- Features checklist (washer/dryer, AC, pet-friendly, etc.)
- Price history chart (if multiple days of data)

### Use Filters
Adjust filters at top:
- **Unit Type**: Focus on specific bedroom count
- **Price Range**: Min and max monthly rent
- **Square Footage**: Min and max sqft range

### Select by Building
Click building names on left to filter apartments to that complex only

### View Archived Apartments
Click **"Archived (0)"** button to see:
- Apartments that are no longer listed
- When they were delisted
- Their last known price
- Full price history before delisting

## 5. What to Expect

### Initial Scrape
First scrape captures **~100 individual apartments** across all buildings with:
- Floor plan information
- Amenities and features
- Complete pricing

### Subsequent Scrapes (Daily)
Each day when you scrape:
- Prices may change (shown with ↑ or ↓)
- New apartments may appear
- Apartments no longer listed → archived automatically

### Data Accumulation
- 2nd day: See price history starting to build
- 1 week: Nice trends emerge
- 1 month: Strong historical data for analysis

## 6. Example Use Cases

### Find Cheapest Studio
1. Filter to "Studio" unit type
2. Look at prices in list (lowest at top when sorted)
3. Click to see full details and price history

### Track Specific Apartment
1. Find apartment by building and floor plan
2. Click to select
3. Watch price history chart over time
4. Note when price increases/decreases

### Compare Buildings
1. Click different buildings to filter
2. See unit availability and price ranges
3. Compare lowest prices per type
4. Identify best deals by complex

### Spot Delisted Units
1. Click "Archived" button
2. See when apartments were removed
3. Identify buildings with high turnover
4. Monitor for reopenings (new listings)

## 7. Data Locations

### Files Created/Updated
- `data/apartments-db.json` - All active apartments
- `data/archived-apartments.json` - Delisted apartments
- `data/prices-2026-01-XX.json` - Daily snapshots

### Clear Data (Start Fresh)
```bash
rm data/apartments-db.json
rm data/archived-apartments.json
# Then scrape again
```

## 8. Common Questions

**Q: Why is no price showing for some apartments?**
A: Prices only show after they're successfully scraped. Run "Scrape Now" to get initial data.

**Q: When will I see the archive?**
A: Archive only populates when apartments disappear from the websites. You'll see activity over time.

**Q: How do I know if a unit is new or old?**
A: Check the "createdDate" field in the apartment data. New apartments appear only after scraping finds them.

**Q: Can I see historical prices?**
A: Yes! Click an apartment, then scroll to see the "Price History" chart. It builds over multiple days of scraping.

**Q: How often do prices update automatically?**
A: Once per day. Click "Scrape Now" anytime to get immediate updates.

## 9. Next Steps

Explore the:
- [ENHANCEMENTS.md](ENHANCEMENTS.md) - Full feature documentation
- [SETUP.md](SETUP.md) - Installation and API reference
- Source code:
  - `server/database.js` - Data layer
  - `server/scraper.js` - Scraping logic
  - `src/App.jsx` - UI components

## 10. Troubleshooting

**Apartments not appearing after scrape?**
1. Check browser console for errors
2. Verify server is still running
3. Try scraping again
4. Check `data/apartments-db.json` exists

**Backend server won't start?**
1. Check port 5174 is available
2. Try: `npm install` in server directory
3. Check Node.js version: `node --version` (need 16+)

**Website structure changed (no units found)?**
1. Website HTML may have changed
2. Update selectors in `server/scraper.js`
3. Use browser DevTools to find new element structure
4. Modify `scrapeEquityApartments()` method accordingly

## Ready!

You're all set! Start scraping and enjoy tracking individual apartments with detailed information and historical pricing. 🏢📊
