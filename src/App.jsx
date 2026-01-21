import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Home, MapPin, TrendingUp, Filter, RefreshCw, Clock, Database } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = 'http://localhost:5174';

// Base apartment data (will be enriched with prices from backend)
const apartmentData = [
  {
    id: 1,
    name: "Emerson Place",
    address: "1 Emerson Pl",
    lat: 42.3629,
    lng: -71.0677,
    source: "EquityApartments.com",
    url: "https://www.equityapartments.com/boston/west-end/emerson-place-apartments",
    studio: { current: null },
    oneBed: { current: null },
    twoBed: { current: null },
    threeBed: { current: null }
  },
  {
    id: 2,
    name: "Alcott",
    address: "35 Lomasney Way",
    lat: 42.3652,
    lng: -71.0626,
    source: "EquityApartments.com",
    url: "https://www.equityapartments.com/boston/west-end/alcott-apartments",
    studio: { current: null },
    oneBed: { current: null },
    twoBed: { current: null }
  },
  {
    id: 3,
    name: "West End Apartments",
    address: "4 Emerson Pl",
    lat: 42.3636,
    lng: -71.0680,
    source: "EquityApartments.com",
    url: "https://www.equityapartments.com/boston/west-end-apartments",
    studio: { current: null },
    oneBed: { current: null },
    twoBed: { current: null }
  },
  {
    id: 4,
    name: "The Towers at Longfellow Apartments",
    address: "10 Longfellow Pl",
    lat: 42.3649,
    lng: -71.0681,
    source: "EquityApartments.com",
    url: "https://www.equityapartments.com/boston/west-end/the-towers-at-longfellow-apartments",
    studio: { current: null },
    oneBed: { current: null },
    twoBed: { current: null }
  }
];

const App = () => {
  const [apartments, setApartments] = useState(apartmentData);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [filters, setFilters] = useState({
    bedrooms: 'all',
    minPrice: 0,
    maxPrice: 15000
  });
  const [historicalData, setHistoricalData] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    initializeData();
    
    // Set up daily auto-update (checks every hour if 24hrs passed)
    const interval = setInterval(checkAndUpdate, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const initializeData = async () => {
    setIsLoading(true);
    setStatus('Loading price data...');
    
    try {
      // First, try to load saved data from backend
      setStatus('Loading saved price data...');
      const savedResponse = await fetch(`${API_BASE_URL}/api/saved-prices`);
      if (savedResponse.ok) {
        const savedData = await savedResponse.json();
        const updatedApartments = apartments.map(apt => {
          const scraped = savedData.apartments.find(s => s.id === apt.id);
          if (scraped && scraped.prices) {
            return {
              ...apt,
              studio: scraped.prices.studio || apt.studio,
              oneBed: scraped.prices.oneBed || apt.oneBed,
              twoBed: scraped.prices.twoBed || apt.twoBed,
              threeBed: scraped.prices.threeBed || apt.threeBed
            };
          }
          return apt;
        });
        setApartments(updatedApartments);
        
        // Update last update time from saved data
        if (savedData.timestamp) {
          localStorage.setItem('last-price-update', savedData.timestamp);
          setLastUpdate(new Date(savedData.timestamp));
        }
      }
      
      // Check if we need to collect new data (once per day)
      const lastUpdateString = localStorage.getItem('last-price-update');
      const lastUpdateTime = lastUpdateString ? new Date(lastUpdateString) : null;
      const now = new Date();
      const shouldCollect = !lastUpdateTime || 
        (now - lastUpdateTime) > (24 * 60 * 60 * 1000);
      
      if (shouldCollect) {
        setStatus('Scraping current prices from websites...');
        await collectCurrentPrices();
      }
      
      // Load historical data
      setStatus('Loading price history...');
      await loadHistoricalData();
      
      setStatus(`Last updated: ${(lastUpdateTime || now).toLocaleString()}`);
    } catch (error) {
      console.error('Error initializing:', error);
      setStatus('Error loading data');
    }
    
    setIsLoading(false);
  };

  const collectCurrentPrices = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Fetch prices from backend API
      const response = await fetch(`${API_BASE_URL}/api/prices`);
      if (!response.ok) throw new Error('Failed to fetch prices from server');
      
      const scrapedData = await response.json();
      
      // Update apartment data with scraped prices
      const updatedApartments = apartments.map(apt => {
        const scraped = scrapedData.find(s => s.id === apt.id);
        if (scraped && scraped.prices) {
          return {
            ...apt,
            studio: scraped.prices.studio || apt.studio,
            oneBed: scraped.prices.oneBed || apt.oneBed,
            twoBed: scraped.prices.twoBed || apt.twoBed,
            threeBed: scraped.prices.threeBed || apt.threeBed
          };
        }
        return apt;
      });
      
      setApartments(updatedApartments);
      
      // Store scraped prices in localStorage for historical tracking
      for (const apt of updatedApartments) {
        const priceData = {
          date: today,
          studio: apt.studio?.current || null,
          oneBed: apt.oneBed?.current || null,
          twoBed: apt.twoBed?.current || null,
          threeBed: apt.threeBed?.current || null,
          timestamp: new Date().toISOString()
        };
        
        const key = `rent-tracker:${apt.id}:${today}`;
        localStorage.setItem(key, JSON.stringify(priceData));
      }
      
      localStorage.setItem('last-price-update', new Date().toISOString());
    } catch (error) {
      console.error('Error collecting prices:', error);
      setStatus('⚠️ Could not connect to scraping server. Make sure backend is running on port 5174.');
    }
  };

  const checkAndUpdate = async () => {
    try {
      const lastUpdateString = localStorage.getItem('last-price-update');
      const lastUpdateTime = lastUpdateString ? new Date(lastUpdateString) : null;
      const now = new Date();
      
      if (!lastUpdateTime || (now - lastUpdateTime) > (24 * 60 * 60 * 1000)) {
        await collectCurrentPrices();
        await loadHistoricalData();
        setLastUpdate(now);
      }
    } catch (error) {
      console.error('Auto-update error:', error);
    }
  };

  const loadHistoricalData = async () => {
    const allHistory = {};
    
    for (const apt of apartments) {
      try {
        const history = [];
        
        // Get all keys from localStorage that match this apartment's pattern
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`rent-tracker:${apt.id}:`)) {
            try {
              const value = localStorage.getItem(key);
              if (value) {
                const data = JSON.parse(value);
                history.push(data);
              }
            } catch (err) {
              console.log('Error loading key:', key);
            }
          }
        }
        
        history.sort((a, b) => new Date(a.date) - new Date(b.date));
        allHistory[apt.id] = history;
      } catch (error) {
        console.log(`No history for ${apt.name}`);
        allHistory[apt.id] = [];
      }
    }
    
    setHistoricalData(allHistory);
  };

  const manualRefresh = async () => {
    setIsLoading(true);
    setStatus('Manually scraping prices...');
    await collectCurrentPrices();
    await loadHistoricalData();
    setLastUpdate(new Date());
    setStatus(`Updated: ${new Date().toLocaleString()}`);
    setIsLoading(false);
  };

  const getUnitTypes = (apt) => {
    const types = [];
    if (apt.studio?.current) types.push('Studio');
    if (apt.oneBed?.current) types.push('1 Bed');
    if (apt.twoBed?.current) types.push('2 Bed');
    if (apt.threeBed?.current) types.push('3 Bed');
    return types.join(', ');
  };

  const getPriceRange = (apt) => {
    const prices = [];
    if (apt.studio?.current) prices.push(apt.studio.current);
    if (apt.oneBed?.current) prices.push(apt.oneBed.current);
    if (apt.twoBed?.current) prices.push(apt.twoBed.current);
    if (apt.threeBed?.current) prices.push(apt.threeBed.current);
    if (prices.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  };

  const filteredApartments = useMemo(() => {
    return apartments.filter(apt => {
      const priceRange = getPriceRange(apt);
      
      if (filters.bedrooms !== 'all') {
        if (filters.bedrooms === 'studio' && !apt.studio?.current) return false;
        if (filters.bedrooms === '1' && !apt.oneBed?.current) return false;
        if (filters.bedrooms === '2' && !apt.twoBed?.current) return false;
        if (filters.bedrooms === '3' && !apt.threeBed?.current) return false;
      }
      
      if (priceRange.min > filters.maxPrice || priceRange.max < filters.minPrice) {
        return false;
      }
      
      return true;
    });
  }, [filters, apartments]);

  const getChartData = (apt) => {
    if (!apt || !historicalData[apt.id] || historicalData[apt.id].length === 0) {
      return [];
    }
    
    return historicalData[apt.id].map(entry => ({
      date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Studio: entry.studio || null,
      '1 Bed': entry.oneBed || null,
      '2 Bed': entry.twoBed || null,
      '3 Bed': entry.threeBed || null
    }));
  };

  const getAvailableUnitTypes = (apt) => {
    if (!apt) return [];
    const types = [];
    if (apt.studio?.current) types.push({ key: 'Studio', color: '#ef4444' });
    if (apt.oneBed?.current) types.push({ key: '1 Bed', color: '#3b82f6' });
    if (apt.twoBed?.current) types.push({ key: '2 Bed', color: '#10b981' });
    if (apt.threeBed?.current) types.push({ key: '3 Bed', color: '#f59e0b' });
    return types;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Home className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">Boston West End Rent Tracker</h1>
            </div>
            <button
              onClick={manualRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Update Now</span>
            </button>
          </div>
          <p className="text-gray-600 mb-3">ZIP 02114 - Real-time prices scraped from EquityApartments.com</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 bg-green-50 p-3 rounded-lg border border-green-200">
              <Database className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <strong>Live Scraping:</strong> Prices are automatically scraped from EquityApartments.com and stored daily for trend analysis.
              </div>
            </div>
            <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <strong>Status:</strong> {status}
                {Object.keys(historicalData).length > 0 && ` • ${Object.values(historicalData).reduce((sum, h) => sum + h.length, 0)} data points collected`}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-800">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
              <select 
                value={filters.bedrooms}
                onChange={(e) => setFilters({...filters, bedrooms: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All</option>
                <option value="studio">Studio</option>
                <option value="1">1 Bedroom</option>
                <option value="2">2 Bedrooms</option>
                <option value="3">3 Bedrooms</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Price</label>
              <input 
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters({...filters, minPrice: Number(e.target.value)})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="$0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
              <input 
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters({...filters, maxPrice: Number(e.target.value)})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="$15,000"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map View */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-800">West End Neighborhood Map</h2>
            </div>
            
            <div className="rounded-lg overflow-hidden border border-gray-300 h-[500px]">
              <MapContainer 
                center={[42.3650, -71.0630]} 
                zoom={16} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  maxZoom={19}
                />
                {filteredApartments.map((apt) => {
                  const priceRange = getPriceRange(apt);
                  const defaultIcon = new L.Icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                  });

                  const selectedIcon = new L.Icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                  });

                  return (
                    <Marker
                      key={apt.id}
                      position={[apt.lat, apt.lng]}
                      icon={selectedApartment?.id === apt.id ? selectedIcon : defaultIcon}
                      eventHandlers={{
                        click: () => setSelectedApartment(apt)
                      }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <div className="font-semibold text-gray-800">{apt.name}</div>
                          <div className="text-gray-600 text-xs mb-2">{apt.address}</div>
                          <div className="text-indigo-600 font-semibold">${priceRange.min.toLocaleString()} - ${priceRange.max.toLocaleString()}/mo</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              🔴 Red pins show available apartments • 🔵 Blue pin shows selected apartment • Use mouse to zoom and pan
            </div>
          </div>

          {/* Price Trends Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-800">
                {selectedApartment ? `${selectedApartment.name} - Price Trends` : 'Select an Apartment'}
              </h2>
            </div>
            
            {selectedApartment ? (
              <div>
                <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-semibold">Address:</span> {selectedApartment.address}
                  </p>
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-semibold">Unit Types:</span> {getUnitTypes(selectedApartment)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Data Source:</span> {selectedApartment.source}
                  </p>
                </div>
                
                {getChartData(selectedApartment).length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={getChartData(selectedApartment)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{fontSize: 12}} />
                        <YAxis tick={{fontSize: 12}} />
                        <Tooltip 
                          formatter={(value) => value ? `$${value.toLocaleString()}` : 'N/A'}
                          contentStyle={{borderRadius: '8px'}}
                        />
                        <Legend />
                        {getAvailableUnitTypes(selectedApartment).map(unit => (
                          <Line
                            key={unit.key}
                            type="monotone"
                            dataKey={unit.key}
                            stroke={unit.color}
                            strokeWidth={3}
                            dot={{ fill: unit.color, r: 5 }}
                            activeDot={{ r: 7 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-gray-700">
                        <strong>Real Data Tracking:</strong> Showing {getChartData(selectedApartment).length} data points collected from live apartment websites. Data updates automatically once per day.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="h-80 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="mb-2">No historical data yet</p>
                      <p className="text-sm">Collection started today. Check back tomorrow to see trends!</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Home className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Click on a building in the map to view price trends</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Apartment List */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            All Apartments ({filteredApartments.length})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApartments.map((apt) => {
              const priceRange = getPriceRange(apt);
              const hasHistory = historicalData[apt.id] && historicalData[apt.id].length > 0;
              
              return (
                <button
                  key={apt.id}
                  onClick={() => setSelectedApartment(apt)}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    selectedApartment?.id === apt.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <h3 className="font-semibold text-gray-800 mb-1">{apt.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{apt.address}</p>
                  <div className="text-xs text-gray-500 mb-2">{getUnitTypes(apt)}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-indigo-600">
                      ${priceRange.min.toLocaleString()} - ${priceRange.max.toLocaleString()}
                    </span>
                    {hasHistory && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {historicalData[apt.id].length} days
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;