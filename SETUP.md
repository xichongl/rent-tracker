# 🏢 Boston West End Rent Tracker

A real-time rental price tracking application for apartments in Boston's West End neighborhood, with live web scraping from EquityApartments.com.

## 🚀 Features

- **Live Price Scraping**: Automatically scrapes current rental prices from apartment websites
- **Price History Tracking**: Stores daily prices for trend analysis
- **Interactive Map**: Visual representation of apartment locations
- **Price Trends Chart**: Historical price visualization with Recharts
- **Responsive Design**: Beautiful Tailwind CSS styling that works on all devices
- **Auto-Updates**: Automatically collects new prices once per day

## 📋 Prerequisites

- Node.js 16+ installed
- npm or yarn package manager

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies (already done, but if needed)
cd server && npm install
```

### 2. Run Both Frontend and Backend Simultaneously

```bash
npm run dev:all
```

This command runs:
- **Backend Server**: http://localhost:5174 (scraping API)
- **Frontend App**: http://localhost:5173 (React app)

### 3. Alternative: Run Separately

**Terminal 1 - Backend Server:**
```bash
npm run dev:server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## 🌐 Monitored Apartments

The application currently scrapes prices from:

1. **West End Apartments**
   - https://www.equityapartments.com/boston/west-end-apartments
   
2. **Alcott Apartments**
   - https://www.equityapartments.com/boston/west-end/alcott-apartments
   
3. **Emerson Place Apartments**
   - https://www.equityapartments.com/boston/west-end/emerson-place-apartments
   
4. **The Towers at Longfellow Apartments**
   - https://www.equityapartments.com/boston/west-end/the-towers-at-longfellow-apartments

## 📊 API Endpoints

### Get All Apartment Prices
```
GET http://localhost:5174/api/prices
```

Returns scraped prices for all apartments.

### Get Single Apartment Price
```
GET http://localhost:5174/api/prices/:id
```

Returns scraped price for a specific apartment (1-4).

### Health Check
```
GET http://localhost:5174/health
```

Verifies server is running.

## 🏗️ Project Structure

```
rent-tracker/
├── src/                      # React frontend
│   ├── App.jsx              # Main app component with scraping logic
│   ├── App.css              # App styles
│   ├── index.css            # Global styles with Tailwind
│   └── main.jsx             # Entry point
├── server/                  # Node.js backend
│   ├── index.js            # Express server with scraping logic
│   └── package.json        # Server dependencies
├── package.json            # Frontend dependencies & scripts
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── README.md               # This file
```

## 🔄 How It Works

1. **Frontend** loads and checks if prices were scraped today
2. **Frontend** calls **Backend API** at `http://localhost:5174/api/prices`
3. **Backend** uses Cheerio to scrape the EquityApartments.com pages
4. **Backend** extracts prices and returns JSON data
5. **Frontend** displays scraped prices and saves to localStorage for history
6. **Daily updates** happen automatically (or click "Update Now" button)

## ⚠️ Important Notes

- The backend must be running for scraping to work
- If you see "Could not connect to scraping server" error, make sure backend is running
- Prices are scraped once per day automatically
- Historical data is stored in browser's localStorage
- Clearing browser data will reset price history

## 🛠️ Troubleshooting

**Issue**: "Could not connect to scraping server"
- **Solution**: Make sure `npm run dev:server` is running on port 5174

**Issue**: Prices show as null
- **Solution**: 
  - Check that backend is running
  - Verify internet connection
  - Check browser console for errors
  - The website structure may have changed (CSS selectors may need updating)

**Issue**: CORS errors
- **Solution**: Backend has CORS enabled for localhost - ensure you're accessing from http://localhost:5173

## 📦 Build for Production

```bash
npm run build
npm run preview
```

## 📝 License

MIT
