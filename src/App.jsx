import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Home, MapPin, TrendingUp, Filter, RefreshCw, Clock, Database, ArchiveRestore, Zap, DollarSign, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const AVAILABLE_CLUSTERS = ['Before June', 'June 1-10', 'June 11-20', 'June 21-30', 'After June', 'Unknown'];
const SQFT_BANDS = [
  { value: 'all', label: 'All Sqft' },
  { value: 'lt700', label: '< 700' },
  { value: '700to899', label: '700 - 899' },
  { value: '900to1099', label: '900 - 1099' },
  { value: 'gte1100', label: '1100+' }
];

// Building data
const buildingsData = [
  {
    id: 1,
    name: "Emerson Place",
    address: "1 Emerson Pl",
    lat: 42.3629,
    lng: -71.0677,
    source: "EquityApartments.com",
    url: "https://www.equityapartments.com/boston/west-end/emerson-place-apartments"
  },
  {
    id: 2,
    name: "Alcott",
    address: "35 Lomasney Way",
    lat: 42.3652,
    lng: -71.0626,
    source: "EquityApartments.com",
    url: "https://www.equityapartments.com/boston/west-end/alcott-apartments"
  },
  {
    id: 3,
    name: "West End Apartments",
    address: "4 Emerson Pl",
    lat: 42.3636,
    lng: -71.0680,
    source: "EquityApartments.com",
    url: "https://www.equityapartments.com/boston/west-end/the-west-end-apartments-asteria-villas-and-vesta"
  },
  {
    id: 4,
    name: "The Towers at Longfellow Apartments",
    address: "10 Longfellow Pl",
    lat: 42.3649,
    lng: -71.0681,
    source: "EquityApartments.com",
    url: "https://www.equityapartments.com/boston/west-end/the-towers-at-longfellow-apartments"
  },
  {
    id: 5,
    name: "Avalon North Station",
    address: "40 Portland St",
    lat: 42.3646,
    lng: -71.0607,
    source: "AvalonCommunities.com",
    url: "https://www.avaloncommunities.com/massachusetts/boston-apartments/avalon-north-station/"
  }
];

const App = () => {
  const [buildings, setBuildings] = useState(buildingsData);
  const [apartments, setApartments] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [archivedApartments, setArchivedApartments] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [buildingStats, setBuildingStats] = useState({});
  const [priceHistory, setPriceHistory] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [activeView, setActiveView] = useState('units');
  const [filters, setFilters] = useState({
    unitType: 'all',
    minPrice: 0,
    maxPrice: 15000,
    minSqft: 0,
    maxSqft: 5000
  });
  const [trendFilters, setTrendFilters] = useState({
    buildingId: 'all',
    unitType: 'all',
    availableDatePreset: 'all',
    listingSource: 'all',
    sqftBand: 'all'
  });
  const [activeTrendPreset, setActiveTrendPreset] = useState('custom');
  const [trendSort, setTrendSort] = useState({ key: 'domDays', direction: 'desc' });

  useEffect(() => {
    loadData();
    const interval = setInterval(checkAndUpdate, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setStatus('Loading apartment data...');
    try {
      // Load all apartments
      const aptRes = await fetch(`${API_BASE_URL}/api/apartments`);
      if (aptRes.ok) {
        const aptData = await aptRes.json();
        setApartments(aptData.apartments || []);
      }

      // Load archived apartments
      const archRes = await fetch(`${API_BASE_URL}/api/archived-apartments`);
      if (archRes.ok) {
        const archData = await archRes.json();
        setArchivedApartments(archData.archived || []);
      }

      // Load building stats
      const statsRes = await fetch(`${API_BASE_URL}/api/buildings`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        const statsMap = {};
        statsData.forEach(b => {
          statsMap[b.id] = b;
        });
        setBuildingStats(statsMap);
      }

      setStatus('Data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      setStatus('Error loading data');
    }
    setIsLoading(false);
  };

  const checkAndUpdate = async () => {
    const lastUpdateString = localStorage.getItem('last-apartment-update');
    const lastUpdateTime = lastUpdateString ? new Date(lastUpdateString) : null;
    const now = new Date();

    if (!lastUpdateTime || (now - lastUpdateTime) > (24 * 60 * 60 * 1000)) {
      await scrapeApartments();
      localStorage.setItem('last-apartment-update', now.toISOString());
    }
  };

  const scrapeApartments = async () => {
    setIsLoading(true);
    setStatus('Scraping apartments...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes timeout

      const response = await fetch(`${API_BASE_URL}/api/apartments/scrape`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Failed to scrape apartments');

      const data = await response.json();
      setStatus(`✅ Scraped ${data.results.reduce((sum, r) => sum + r.unitsFound, 0)} apartments`);
      localStorage.setItem('last-apartment-update', new Date().toISOString());

      // Reload data after scraping
      await loadData();
    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus('⚠️ Scraping timeout - check server logs');
      } else {
        setStatus('⚠️ Could not connect to server');
      }
      console.error('Scrape error:', error);
    }
    setIsLoading(false);
  };

  const getUnitTypeLabel = (unitType) => {
    const labels = {
      studio: 'Studio',
      oneBed: '1 Bed',
      twoBed: '2 Bed',
      threeBed: '3 Bed'
    };
    return labels[unitType] || unitType;
  };

  const getApartmentPrice = (apt) => {
    return apt.priceHistory[apt.priceHistory.length - 1]?.price || null;
  };

  const getApartmentPriceChange = (apt) => {
    if (apt.priceHistory.length < 2) return null;
    const current = apt.priceHistory[apt.priceHistory.length - 1]?.price;
    const previous = apt.priceHistory[apt.priceHistory.length - 2]?.price;
    if (!current || !previous) return null;
    return current - previous;
  };

  const filteredApartments = useMemo(() => {
    return apartments.filter(apt => {
      if (selectedBuilding && apt.buildingId !== selectedBuilding.id) return false;
      if (filters.unitType !== 'all' && apt.unitType !== filters.unitType) return false;

      const price = getApartmentPrice(apt);
      if (price && (price < filters.minPrice || price > filters.maxPrice)) return false;

      if (apt.squareFeet) {
        if (apt.squareFeet < filters.minSqft || apt.squareFeet > filters.maxSqft) return false;
      }

      return true;
    });
  }, [apartments, selectedBuilding, filters]);

  const getPriceChartData = (apt) => {
    if (!apt || !apt.priceHistory || apt.priceHistory.length === 0) return [];

    return apt.priceHistory.map(entry => ({
      date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: entry.price,
      timestamp: entry.date
    }));
  };

  const parseDateValue = (value) => {
    if (!value || typeof value !== 'string') return null;

    if (value.includes('/')) {
      const [month, day, year] = value.split('/').map(Number);
      if (!month || !day || !year) return null;
      return new Date(year, month - 1, day);
    }

    const normalized = value.includes('T') ? value : `${value}T00:00:00`;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const isJune2026 = (dateValue) => {
    const parsed = parseDateValue(dateValue);
    return parsed && parsed.getFullYear() === 2026 && parsed.getMonth() === 5;
  };

  const getSqftBand = (squareFeet) => {
    if (!Number.isFinite(squareFeet)) return 'unknown';
    if (squareFeet < 700) return 'lt700';
    if (squareFeet < 900) return '700to899';
    if (squareFeet < 1100) return '900to1099';
    return 'gte1100';
  };

  const getAvailableCluster = (availableDate) => {
    if (!availableDate) return 'Unknown';

    const juneStart = new Date(2026, 5, 1);
    const june11 = new Date(2026, 5, 11);
    const june21 = new Date(2026, 5, 21);
    const julyStart = new Date(2026, 6, 1);

    if (availableDate < juneStart) return 'Before June';
    if (availableDate >= juneStart && availableDate < june11) return 'June 1-10';
    if (availableDate >= june11 && availableDate < june21) return 'June 11-20';
    if (availableDate >= june21 && availableDate < julyStart) return 'June 21-30';
    return 'After June';
  };

  const getDaysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    return Math.max(0, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
  };

  const getMedian = (values) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.length % 2 === 0
      ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
      : sorted[Math.floor(sorted.length / 2)];
  };

  const getTrendUnits = useMemo(() => {
    const activeUnits = apartments.map(unit => ({ ...unit, __source: 'active' }));
    const archivedUnits = archivedApartments.map(unit => ({ ...unit, __source: 'archived' }));

    let sourceUnits = [];
    if (trendFilters.listingSource === 'active') {
      sourceUnits = activeUnits;
    } else if (trendFilters.listingSource === 'archived') {
      sourceUnits = archivedUnits;
    } else {
      sourceUnits = [...activeUnits, ...archivedUnits];
    }

    return sourceUnits.filter(unit => {
      if (trendFilters.buildingId !== 'all' && unit.buildingId !== Number(trendFilters.buildingId)) {
        return false;
      }

      if (trendFilters.unitType !== 'all' && unit.unitType !== trendFilters.unitType) {
        return false;
      }

      if (trendFilters.sqftBand !== 'all') {
        const squareFeet = Number(unit.squareFeet);
        if (getSqftBand(squareFeet) !== trendFilters.sqftBand) {
          return false;
        }
      }

      const availableDate = parseDateValue(unit.availableDate);
      if (trendFilters.availableDatePreset === 'june2026') {
        return isJune2026(unit.availableDate);
      }

      if (trendFilters.availableDatePreset === 'beforeJune') {
        return availableDate && availableDate < new Date(2026, 5, 1);
      }

      if (trendFilters.availableDatePreset === 'afterJune') {
        return availableDate && availableDate > new Date(2026, 5, 30);
      }

      return true;
    });
  }, [apartments, archivedApartments, trendFilters]);

  const trendUnitRecords = useMemo(() => {
    const now = new Date();

    return getTrendUnits.map(unit => {
      const createdDate = parseDateValue(unit.createdDate);
      const lastSeenDate = parseDateValue(unit.lastSeen);
      const delistedDate = parseDateValue(unit.delistedDate || unit.archivedDate);
      const availableDate = parseDateValue(unit.availableDate);
      const currentPrice = getApartmentPrice(unit);

      const isArchived = unit.__source === 'archived';
      const endDate = isArchived ? delistedDate : (lastSeenDate || now);
      const observedDom = getDaysBetween(createdDate, endDate);
      const completedDom = isArchived ? observedDom : null;

      return {
        ...unit,
        createdDate,
        availableDate,
        currentPrice,
        availableCluster: getAvailableCluster(availableDate),
        observedDom,
        completedDom,
        isCensored: !isArchived,
        domEventDay: isArchived ? observedDom : null,
        domObservedDay: observedDom
      };
    });
  }, [getTrendUnits]);

  const trendKpis = useMemo(() => {
    const currentPrices = trendUnitRecords
      .map(unit => unit.currentPrice)
      .filter(price => Number.isFinite(price));

    const juneEligibleCount = trendUnitRecords.filter(unit => isJune2026(unit.availableDate)).length;

    const rollingChanges = trendUnitRecords
      .map(unit => {
        const history = [...(unit.priceHistory || [])]
          .filter(entry => entry?.date && Number.isFinite(entry?.price))
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (history.length < 2) return null;
        const latest = history[history.length - 1];
        const latestDate = parseDateValue(latest.date);
        if (!latestDate) return null;

        const cutoff = new Date(latestDate);
        cutoff.setDate(cutoff.getDate() - 30);

        const baseline = history.find(entry => {
          const entryDate = parseDateValue(entry.date);
          return entryDate && entryDate >= cutoff;
        });

        if (!baseline || baseline.date === latest.date) return null;
        return latest.price - baseline.price;
      })
      .filter(change => change !== null);

    const archivedDurations = trendUnitRecords
      .filter(unit => unit.__source === 'archived')
      .map(unit => unit.completedDom)
      .filter(duration => duration !== null)
      .sort((a, b) => a - b);

    const medianDays = getMedian(archivedDurations);

    const fastDelistRate = archivedDurations.length === 0
      ? null
      : Math.round((archivedDurations.filter(days => days <= 14).length / archivedDurations.length) * 100);

    return {
      activeUnitsNow: trendUnitRecords.filter(unit => unit.__source === 'active').length,
      juneEligibleCount,
      currentAvgPrice: currentPrices.length
        ? Math.round(currentPrices.reduce((sum, price) => sum + price, 0) / currentPrices.length)
        : null,
      avg30DayChange: rollingChanges.length
        ? Math.round(rollingChanges.reduce((sum, change) => sum + change, 0) / rollingChanges.length)
        : null,
      medianDaysOnMarket: medianDays,
      fastDelistRate
    };
  }, [trendUnitRecords]);

  const trendPriceData = useMemo(() => {
    const byDate = {};

    trendUnitRecords.forEach(unit => {
      (unit.priceHistory || []).forEach(entry => {
        if (!entry?.date || !Number.isFinite(entry?.price)) return;
        if (!byDate[entry.date]) {
          byDate[entry.date] = [];
        }
        byDate[entry.date].push(entry.price);
      });
    });

    return Object.entries(byDate)
      .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
      .map(([date, prices]) => {
        const sortedPrices = [...prices].sort((a, b) => a - b);
        const avgPrice = Math.round(prices.reduce((sum, value) => sum + value, 0) / prices.length);
        const medianPrice = sortedPrices.length % 2 === 0
          ? Math.round((sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2)
          : sortedPrices[Math.floor(sortedPrices.length / 2)];

        return {
          date,
          label: new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          avgPrice,
          medianPrice,
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          sampleSize: prices.length
        };
      });
  }, [trendUnitRecords]);

  const availabilityByMonth = useMemo(() => {
    const monthMap = {};

    trendUnitRecords.forEach(unit => {
      const availableDate = unit.availableDate;
      const price = unit.currentPrice;
      if (!availableDate) return;

      const monthKey = `${availableDate.getFullYear()}-${String(availableDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { month: monthKey, count: 0, prices: [] };
      }

      monthMap[monthKey].count += 1;
      if (Number.isFinite(price)) {
        monthMap[monthKey].prices.push(price);
      }
    });

    return Object.values(monthMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(monthEntry => ({
        month: monthEntry.month,
        label: new Date(`${monthEntry.month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        count: monthEntry.count,
        avgPrice: monthEntry.prices.length
          ? Math.round(monthEntry.prices.reduce((sum, value) => sum + value, 0) / monthEntry.prices.length)
          : null
      }));
  }, [trendUnitRecords]);

  const juneAvailabilityByDay = useMemo(() => {
    const dayMap = {};

    trendUnitRecords.forEach(unit => {
      const availableDate = unit.availableDate;
      const price = unit.currentPrice;
      if (!availableDate || availableDate.getFullYear() !== 2026 || availableDate.getMonth() !== 5) return;

      const day = availableDate.getDate();
      if (!dayMap[day]) {
        dayMap[day] = { day, count: 0, prices: [] };
      }

      dayMap[day].count += 1;
      if (Number.isFinite(price)) {
        dayMap[day].prices.push(price);
      }
    });

    return Object.values(dayMap)
      .sort((a, b) => a.day - b.day)
      .map(dayEntry => ({
        day: dayEntry.day,
        label: `Jun ${dayEntry.day}`,
        count: dayEntry.count,
        avgPrice: dayEntry.prices.length
          ? Math.round(dayEntry.prices.reduce((sum, value) => sum + value, 0) / dayEntry.prices.length)
          : null
      }));
  }, [trendUnitRecords]);

  const domClusterData = useMemo(() => {
    const clusters = AVAILABLE_CLUSTERS.map(cluster => ({
      cluster,
      domValues: []
    }));

    const clusterMap = Object.fromEntries(clusters.map(entry => [entry.cluster, entry]));

    trendUnitRecords
      .filter(unit => unit.__source === 'archived' && unit.completedDom !== null)
      .forEach(unit => {
        if (!clusterMap[unit.availableCluster]) {
          return;
        }
        clusterMap[unit.availableCluster].domValues.push(unit.completedDom);
      });

    return clusters.map(clusterEntry => {
      const sorted = [...clusterEntry.domValues].sort((a, b) => a - b);
      const avgDom = sorted.length
        ? Math.round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length)
        : null;
      const medianDom = getMedian(sorted);
      const fastDelistRate = sorted.length
        ? Math.round((sorted.filter(day => day <= 14).length / sorted.length) * 100)
        : null;

      return {
        cluster: clusterEntry.cluster,
        count: sorted.length,
        avgDom,
        medianDom,
        fastDelistRate
      };
    });
  }, [trendUnitRecords]);

  const survivalData = useMemo(() => {
    const grouped = {};
    AVAILABLE_CLUSTERS.forEach(cluster => {
      grouped[cluster] = trendUnitRecords.filter(
        unit => unit.availableCluster === cluster && Number.isFinite(unit.domObservedDay)
      );
    });

    const maxDay = Math.max(
      0,
      ...trendUnitRecords
        .map(unit => unit.domObservedDay)
        .filter(day => Number.isFinite(day))
    );

    const maxDayCapped = Math.min(120, maxDay);
    const clustersWithData = AVAILABLE_CLUSTERS.filter(cluster => grouped[cluster].length > 0);
    const survivalState = Object.fromEntries(clustersWithData.map(cluster => [cluster, 1]));

    const rows = [];
    for (let day = 0; day <= maxDayCapped; day += 1) {
      const row = { day };

      clustersWithData.forEach(cluster => {
        const units = grouped[cluster];
        const atRisk = units.filter(unit => unit.domObservedDay >= day).length;
        const events = units.filter(unit => !unit.isCensored && unit.domEventDay === day).length;

        if (day > 0 && atRisk > 0) {
          survivalState[cluster] = survivalState[cluster] * (1 - events / atRisk);
        }

        row[cluster] = Math.round(survivalState[cluster] * 100);
      });

      rows.push(row);
    }

    return rows;
  }, [trendUnitRecords]);

  const trendDrilldownRows = useMemo(() => {
    return trendUnitRecords
      .map(unit => ({
        id: unit.id,
        buildingName: unit.buildingName,
        unitType: getUnitTypeLabel(unit.unitType),
        sqft: unit.squareFeet || '',
        availableDate: unit.availableDate
          ? unit.availableDate.toLocaleDateString('en-US')
          : (unit.availableDate || ''),
        availableDateSort: unit.availableDate ? unit.availableDate.getTime() : null,
        availableCluster: unit.availableCluster,
        source: unit.__source,
        status: unit.__source === 'archived' ? 'Delisted' : 'Active',
        currentPrice: unit.currentPrice,
        domDays: unit.observedDom
      }))
      .sort((a, b) => {
        const domA = Number.isFinite(a.domDays) ? a.domDays : -1;
        const domB = Number.isFinite(b.domDays) ? b.domDays : -1;
        return domB - domA;
      });
  }, [trendUnitRecords]);

  const exportTrendDrilldownCsv = () => {
    if (!trendDrilldownRows.length) return;

    const headers = ['Building', 'Unit Type', 'Sqft', 'Available Date', 'Available Cluster', 'Source', 'Status', 'Current Price', 'DOM Days'];
    const lines = trendDrilldownRows.map(row => [
      row.buildingName,
      row.unitType,
      row.sqft,
      row.availableDate,
      row.availableCluster,
      row.source,
      row.status,
      row.currentPrice ?? '',
      row.domDays ?? ''
    ].map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','));

    const csvContent = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trend-drilldown-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const applyTrendPreset = (preset) => {
    if (preset === 'juneFocus') {
      setTrendFilters({
        buildingId: 'all',
        unitType: 'all',
        availableDatePreset: 'june2026',
        listingSource: 'all',
        sqftBand: 'all'
      });
      setActiveTrendPreset('juneFocus');
      return;
    }

    if (preset === 'competitionWatch') {
      setTrendFilters({
        buildingId: 'all',
        unitType: 'all',
        availableDatePreset: 'june2026',
        listingSource: 'active',
        sqftBand: 'all'
      });
      setActiveTrendPreset('competitionWatch');
      return;
    }

    setTrendFilters({
      buildingId: 'all',
      unitType: 'all',
      availableDatePreset: 'all',
      listingSource: 'all',
      sqftBand: 'all'
    });
    setActiveTrendPreset('reset');
  };

  const updateTrendFilter = (key, value) => {
    setTrendFilters((prev) => ({ ...prev, [key]: value }));
    setActiveTrendPreset('custom');
  };

  const onTrendSort = (key) => {
    setTrendSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: key === 'domDays' || key === 'currentPrice' ? 'desc' : 'asc' };
    });
  };

  const sortedTrendRows = useMemo(() => {
    const rows = [...trendDrilldownRows];
    const { key, direction } = trendSort;
    const factor = direction === 'asc' ? 1 : -1;

    rows.sort((left, right) => {
      const leftValue = left[key];
      const rightValue = right[key];

      if (leftValue === null || leftValue === undefined) return 1;
      if (rightValue === null || rightValue === undefined) return -1;

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * factor;
      }

      return String(leftValue).localeCompare(String(rightValue)) * factor;
    });

    return rows;
  }, [trendDrilldownRows, trendSort]);

  const renderSortIcon = (key) => {
    if (trendSort.key !== key) return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    if (trendSort.direction === 'asc') return <ArrowUp className="w-3 h-3 text-indigo-600" />;
    return <ArrowDown className="w-3 h-3 text-indigo-600" />;
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
            <div className="flex gap-2">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <ArchiveRestore className="w-4 h-4" />
                <span className="text-sm font-medium">Archived ({archivedApartments.length})</span>
              </button>
              <button
                onClick={scrapeApartments}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">Scrape Now</span>
              </button>
            </div>
          </div>
          <p className="text-gray-600 mb-3">ZIP 02114 - Track individual apartments with detailed information and historical pricing</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-2 bg-green-50 p-3 rounded-lg border border-green-200">
              <Database className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <strong>Active Units:</strong> {apartments.length} apartments tracked
              </div>
            </div>
            <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
              <ArchiveRestore className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <strong>Archived:</strong> {archivedApartments.length} delisted units
              </div>
            </div>
            <div className="flex items-start gap-2 bg-purple-50 p-3 rounded-lg border border-purple-200">
              <Clock className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <strong>Status:</strong> {status}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setActiveView('units')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeView === 'units' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Units
            </button>
            <button
              onClick={() => setActiveView('trends')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeView === 'trends' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Trends
            </button>
          </div>
        </div>

        {activeView === 'units' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-800">Filters</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit Type</label>
                  <select
                    value={filters.unitType}
                    onChange={(e) => setFilters({ ...filters, unitType: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All</option>
                    <option value="studio">Studio</option>
                    <option value="oneBed">1 Bedroom</option>
                    <option value="twoBed">2 Bedrooms</option>
                    <option value="threeBed">3 Bedrooms</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Price</label>
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Sqft</label>
                  <input
                    type="number"
                    value={filters.minSqft}
                    onChange={(e) => setFilters({ ...filters, minSqft: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Sqft</label>
                  <input
                    type="number"
                    value={filters.maxSqft}
                    onChange={(e) => setFilters({ ...filters, maxSqft: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Buildings List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Buildings</h2>
            <div className="space-y-2">
              {buildings.map(building => {
                const stats = buildingStats[building.id];
                return (
                  <button
                    key={building.id}
                    onClick={() => setSelectedBuilding(selectedBuilding?.id === building.id ? null : building)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedBuilding?.id === building.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-800">{building.name}</h3>
                    <p className="text-xs text-gray-600 mb-2">{building.address}</p>
                    {stats && (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium text-green-600">{stats.totalActiveUnits} active</span>
                        {stats.totalArchivedUnits > 0 && (
                          <span className="font-medium text-gray-500 ml-2">
                            {stats.totalArchivedUnits} archived
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Apartments List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Individual Units ({filteredApartments.length})
              </h2>

              {filteredApartments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No apartments match your filters</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredApartments.map((apt) => {
                    const price = getApartmentPrice(apt);
                    const priceChange = getApartmentPriceChange(apt);

                    return (
                      <button
                        key={apt.id}
                        onClick={() => setSelectedApartment(selectedApartment?.id === apt.id ? null : apt)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedApartment?.id === apt.id
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">
                              {getUnitTypeLabel(apt.unitType)} - {apt.bedrooms} bed {apt.bathrooms} bath
                            </h3>
                            <p className="text-xs text-gray-600">{apt.buildingName}</p>
                            {apt.squareFeet && (
                              <p className="text-xs text-gray-600">{apt.squareFeet} sqft</p>
                            )}
                            {apt.floor && (
                              <p className="text-xs text-gray-600">Floor {apt.floor}</p>
                            )}
                            {apt.availableDate && (
                              <p className="text-xs text-gray-600">Available: {apt.availableDate}</p>
                            )}
                            {apt.floorPlan?.name && (
                              <p className="text-xs text-indigo-600">{apt.floorPlan.name}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {price && (
                              <>
                                <div className="text-sm font-semibold text-indigo-600">
                                  ${price.toLocaleString()}
                                </div>
                                {priceChange !== null && (
                                  <div className={`text-xs font-medium ${
                                    priceChange >= 0 ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {priceChange >= 0 ? '+' : ''}{priceChange}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

            {/* Selected Apartment Details */}
            {selectedApartment && (
              <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  {getUnitTypeLabel(selectedApartment.unitType)} - {selectedApartment.buildingName}
                </h2>
                <p className="text-gray-600">{selectedApartment.address}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <div className="text-xs text-gray-600 mb-1">Current Price</div>
                <div className="text-2xl font-bold text-indigo-600">
                  ${getApartmentPrice(selectedApartment)?.toLocaleString()}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-xs text-gray-600 mb-1">Bedrooms</div>
                <div className="text-2xl font-bold text-blue-600">{selectedApartment.bedrooms}</div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-xs text-gray-600 mb-1">Bathrooms</div>
                <div className="text-2xl font-bold text-green-600">{selectedApartment.bathrooms}</div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-xs text-gray-600 mb-1">Square Feet</div>
                <div className="text-2xl font-bold text-purple-600">
                  {selectedApartment.squareFeet || 'N/A'}
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="text-xs text-gray-600 mb-1">Price Per Sqft</div>
                <div className="text-2xl font-bold text-orange-600">
                  {selectedApartment.squareFeet
                    ? '$' + Math.round(getApartmentPrice(selectedApartment) / selectedApartment.squareFeet)
                    : 'N/A'}
                </div>
              </div>
            </div>

            {/* Floor and Availability */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {selectedApartment.floor && (
                <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                  <div className="text-xs text-gray-600 mb-1">Floor</div>
                  <div className="text-2xl font-bold text-cyan-600">{selectedApartment.floor}</div>
                </div>
              )}
              {selectedApartment.availableDate && (
                <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
                  <div className="text-xs text-gray-600 mb-1">Available Date</div>
                  <div className="text-2xl font-bold text-rose-600">{selectedApartment.availableDate}</div>
                </div>
              )}
            </div>

            {/* Amenities and Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {selectedApartment.amenities && selectedApartment.amenities.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedApartment.amenities.map((amenity, idx) => (
                      <span key={idx} className="bg-indigo-100 text-indigo-800 text-xs font-medium px-3 py-1 rounded-full">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedApartment.features && Object.keys(selectedApartment.features).length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Features</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedApartment.features).map(([key, value]) => (
                      value && (
                        <div key={key} className="flex items-center gap-2 text-sm text-gray-700">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          {key.replace(/([A-Z])/g, ' $1').replace('has', '')}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Price History Chart */}
            {getPriceChartData(selectedApartment).length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Price History</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getPriceChartData(selectedApartment)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ fill: '#4f46e5', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
              </div>
            )}

            {/* Archived Apartments */}
            {showArchived && (
              <div className="bg-white rounded-xl shadow-lg p-6 mt-6 border-2 border-gray-300">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Archived Apartments ({archivedApartments.length})</h2>

                {archivedApartments.length === 0 ? (
                  <p className="text-gray-600">No archived apartments yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {archivedApartments.map((apt) => {
                      const price = apt.priceHistory?.[apt.priceHistory.length - 1]?.price;
                      return (
                        <div key={apt.id} className="p-4 rounded-lg bg-gray-50 border border-gray-300">
                          <h3 className="font-semibold text-gray-800 mb-1">
                            {getUnitTypeLabel(apt.unitType)} - {apt.buildingName}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">{apt.address}</p>
                          {price && (
                            <p className="text-sm text-gray-700 mb-2">
                              Last Price: <span className="font-semibold">${price.toLocaleString()}</span>
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Delisted: {apt.delistedDate}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeView === 'trends' && (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-800">Trends Filters</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Building</label>
                  <select
                    value={trendFilters.buildingId}
                    onChange={(e) => updateTrendFilter('buildingId', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Buildings</option>
                    {buildings.map(building => (
                      <option key={building.id} value={building.id}>{building.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit Type</label>
                  <select
                    value={trendFilters.unitType}
                    onChange={(e) => updateTrendFilter('unitType', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All</option>
                    <option value="studio">Studio</option>
                    <option value="oneBed">1 Bedroom</option>
                    <option value="twoBed">2 Bedrooms</option>
                    <option value="threeBed">3 Bedrooms</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Available Date</label>
                  <select
                    value={trendFilters.availableDatePreset}
                    onChange={(e) => updateTrendFilter('availableDatePreset', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Dates</option>
                    <option value="june2026">June 2026 Only</option>
                    <option value="beforeJune">Before June 2026</option>
                    <option value="afterJune">After June 2026</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Listing Source</label>
                  <select
                    value={trendFilters.listingSource}
                    onChange={(e) => updateTrendFilter('listingSource', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Active + Archived</option>
                    <option value="active">Active Only</option>
                    <option value="archived">Archived Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sqft Band</label>
                  <select
                    value={trendFilters.sqftBand}
                    onChange={(e) => updateTrendFilter('sqftBand', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {SQFT_BANDS.map((band) => (
                      <option key={band.value} value={band.value}>{band.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => applyTrendPreset('juneFocus')}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                >
                  June Focus
                </button>
                <button
                  onClick={() => applyTrendPreset('competitionWatch')}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  June Competition Watch
                </button>
                <button
                  onClick={() => applyTrendPreset('reset')}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Reset Presets
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Active preset: {
                  activeTrendPreset === 'juneFocus'
                    ? 'June Focus'
                    : activeTrendPreset === 'competitionWatch'
                      ? 'June Competition Watch'
                      : activeTrendPreset === 'reset'
                        ? 'Reset (All Data)'
                        : 'Custom'
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-4 border border-green-200">
                <div className="text-xs text-gray-600 mb-1">Active Units Now</div>
                <div className="text-2xl font-bold text-green-600">{trendKpis.activeUnitsNow}</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4 border border-blue-200">
                <div className="text-xs text-gray-600 mb-1">June-Eligible Units</div>
                <div className="text-2xl font-bold text-blue-600">{trendKpis.juneEligibleCount}</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4 border border-indigo-200">
                <div className="text-xs text-gray-600 mb-1">Current Avg Price</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {trendKpis.currentAvgPrice ? `$${trendKpis.currentAvgPrice.toLocaleString()}` : 'N/A'}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4 border border-purple-200">
                <div className="text-xs text-gray-600 mb-1">30d Avg Change</div>
                <div className={`text-2xl font-bold ${
                  trendKpis.avg30DayChange === null
                    ? 'text-gray-500'
                    : trendKpis.avg30DayChange >= 0
                      ? 'text-red-600'
                      : 'text-green-600'
                }`}>
                  {trendKpis.avg30DayChange === null
                    ? 'N/A'
                    : `${trendKpis.avg30DayChange >= 0 ? '+' : ''}$${trendKpis.avg30DayChange.toLocaleString()}`}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4 border border-orange-200">
                <div className="text-xs text-gray-600 mb-1">Median DOM (Archived)</div>
                <div className="text-2xl font-bold text-orange-600">
                  {trendKpis.medianDaysOnMarket === null ? 'N/A' : `${trendKpis.medianDaysOnMarket}d`}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4 border border-rose-200">
                <div className="text-xs text-gray-600 mb-1">Fast Delist (≤14d)</div>
                <div className="text-2xl font-bold text-rose-600">
                  {trendKpis.fastDelistRate === null ? 'N/A' : `${trendKpis.fastDelistRate}%`}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Average Listing Price Over Time</h3>
              <p className="text-xs text-gray-500 mb-3">
                Points with small sample size (n &lt; 3) are less stable for pricing decisions.
              </p>
              {trendPriceData.length === 0 ? (
                <p className="text-gray-500">No price history available for current filters.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trendPriceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, key) => {
                        if (typeof value === 'number') {
                          const labelMap = {
                            avgPrice: 'Average',
                            medianPrice: 'Median',
                            minPrice: 'Min',
                            maxPrice: 'Max'
                          };
                          return [`$${value.toLocaleString()}`, labelMap[key] || key];
                        }
                        return [value, key];
                      }}
                      labelFormatter={(label, payload) => {
                        const record = payload?.[0]?.payload;
                        return `${label}${record?.sampleSize ? ` • n=${record.sampleSize}` : ''}`;
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="avgPrice" name="Average" stroke="#4f46e5" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="medianPrice" name="Median" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="minPrice" name="Min" stroke="#93c5fd" strokeWidth={1} dot={false} />
                    <Line type="monotone" dataKey="maxPrice" name="Max" stroke="#fca5a5" strokeWidth={1} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Available Units by Month</h3>
                {availabilityByMonth.length === 0 ? (
                  <p className="text-gray-500">No available-date records for current filters.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={availabilityByMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value.toLocaleString()}`} />
                      <Tooltip formatter={(value, key) => {
                        if (key === 'avgPrice' && typeof value === 'number') return [`$${value.toLocaleString()}`, 'Avg Price'];
                        return [value, 'Count'];
                      }} />
                      <Legend />
                      <Bar dataKey="count" name="Units" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">June 2026 Availability by Day</h3>
                {juneAvailabilityByDay.length === 0 ? (
                  <p className="text-gray-500">No June 2026 availability found for current filters.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={juneAvailabilityByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={70} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value, key) => {
                        if (key === 'avgPrice' && typeof value === 'number') return [`$${value.toLocaleString()}`, 'Avg Price'];
                        return [value, 'Units'];
                      }} />
                      <Bar dataKey="count" name="Units" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Days Listed by Available-Date Cluster</h3>
                {domClusterData.every(item => item.count === 0) ? (
                  <p className="text-gray-500">No archived listing-duration data for current filters.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={domClusterData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="cluster" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value, key, item) => {
                        if (key === 'fastDelistRate') return [`${value}%`, 'Fast Delist'];
                        if (key === 'count') return [value, 'Listings'];
                        return [value, key === 'avgDom' ? 'Avg DOM' : 'Median DOM'];
                      }} labelFormatter={(label, payload) => {
                        const count = payload?.[0]?.payload?.count;
                        return `${label}${count ? ` • n=${count}` : ''}`;
                      }} />
                      <Legend />
                      <Bar dataKey="avgDom" name="Avg DOM" fill="#fb923c" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="medianDom" name="Median DOM" fill="#f97316" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Listing Survival by Available-Date Cluster</h3>
                <p className="text-xs text-gray-500 mb-3">Shows probability a listing remains active after N days on market.</p>
                {survivalData.length <= 1 ? (
                  <p className="text-gray-500">Not enough data to generate survival curves.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={survivalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Still Listed']} labelFormatter={(value) => `Day ${value}`} />
                      <Legend />
                      <Line type="monotone" dataKey="Before June" stroke="#6366f1" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="June 1-10" stroke="#0ea5e9" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="June 11-20" stroke="#10b981" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="June 21-30" stroke="#f59e0b" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="After June" stroke="#ef4444" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="Unknown" stroke="#6b7280" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Trend Drilldown (Unit-Level)</h3>
                <button
                  onClick={exportTrendDrilldownCsv}
                  disabled={trendDrilldownRows.length === 0}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>

              {sortedTrendRows.length === 0 ? (
                <p className="text-gray-500">No records for current filter set.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-600">
                        <th className="py-2 pr-3">
                          <button onClick={() => onTrendSort('buildingName')} className="inline-flex items-center gap-1 hover:text-indigo-700">
                            Building {renderSortIcon('buildingName')}
                          </button>
                        </th>
                        <th className="py-2 pr-3">
                          <button onClick={() => onTrendSort('unitType')} className="inline-flex items-center gap-1 hover:text-indigo-700">
                            Unit Type {renderSortIcon('unitType')}
                          </button>
                        </th>
                        <th className="py-2 pr-3">
                          <button onClick={() => onTrendSort('sqft')} className="inline-flex items-center gap-1 hover:text-indigo-700">
                            Sqft {renderSortIcon('sqft')}
                          </button>
                        </th>
                        <th className="py-2 pr-3">
                          <button onClick={() => onTrendSort('availableDateSort')} className="inline-flex items-center gap-1 hover:text-indigo-700">
                            Available {renderSortIcon('availableDateSort')}
                          </button>
                        </th>
                        <th className="py-2 pr-3">
                          <button onClick={() => onTrendSort('availableCluster')} className="inline-flex items-center gap-1 hover:text-indigo-700">
                            Cluster {renderSortIcon('availableCluster')}
                          </button>
                        </th>
                        <th className="py-2 pr-3">
                          <button onClick={() => onTrendSort('status')} className="inline-flex items-center gap-1 hover:text-indigo-700">
                            Status {renderSortIcon('status')}
                          </button>
                        </th>
                        <th className="py-2 pr-3">
                          <button onClick={() => onTrendSort('currentPrice')} className="inline-flex items-center gap-1 hover:text-indigo-700">
                            Current Price {renderSortIcon('currentPrice')}
                          </button>
                        </th>
                        <th className="py-2 pr-3">
                          <button onClick={() => onTrendSort('domDays')} className="inline-flex items-center gap-1 hover:text-indigo-700">
                            DOM {renderSortIcon('domDays')}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTrendRows.slice(0, 150).map((row) => (
                        <tr key={row.id} className="border-b border-gray-100 text-gray-700">
                          <td className="py-2 pr-3">{row.buildingName}</td>
                          <td className="py-2 pr-3">{row.unitType}</td>
                          <td className="py-2 pr-3">{row.sqft || 'N/A'}</td>
                          <td className="py-2 pr-3">{row.availableDate || 'N/A'}</td>
                          <td className="py-2 pr-3">{row.availableCluster}</td>
                          <td className="py-2 pr-3">{row.status}</td>
                          <td className="py-2 pr-3">{Number.isFinite(row.currentPrice) ? `$${row.currentPrice.toLocaleString()}` : 'N/A'}</td>
                          <td className="py-2 pr-3">{Number.isFinite(row.domDays) ? `${row.domDays}d` : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sortedTrendRows.length > 150 && (
                    <p className="text-xs text-gray-500 mt-3">
                      Showing first 150 rows. Export CSV for full dataset ({sortedTrendRows.length} rows).
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;