# Historical Trends Dashboard Plan (June 2026 Apartment Search)

## Goal
Track current + historical rental trends to find the best June 2026 move-in options by:
- Rental property (building)
- Unit type (studio, 1 bed, 2 bed, 3 bed)

This plan is designed around your existing data model in `data/apartments-db.json` and `data/archived-apartments.json`.

---

## What you can already measure from current data
You already have fields needed for trend analytics:
- `buildingId`, `buildingName`
- `unitType`, `bedrooms`, `bathrooms`, `squareFeet`
- `availableDate`
- `createdDate`, `lastSeen`, `delistedDate`, `status`
- `priceHistory[]` (`date`, `price`)

This is enough to compute:
1. Average listing price for similar apartments over time
2. Available-date distribution (especially June 2026)
3. Listing duration (time on market before delist), clustered by available date

---

## Similar-apartment definition (important)
Use a tiered definition so metrics stay stable with sparse data:

### Default grouping
- `buildingId + unitType`

### Optional finer grouping (when sample size is large enough)
- `buildingId + unitType + sqftBand`
- Example bands: `<700`, `700-899`, `900-1099`, `1100+`

Recommendation: start with `building + unitType` and expose sqft-banding as an optional toggle later.

---

## Core KPI cards (top of dashboard)
For current filters (`building`, `unitType`, `available-date window`):
- **Active units now**
- **June-eligible units now** (available in June 2026)
- **Current avg price**
- **30-day avg price change** (up/down)
- **Median days-on-market (DOM)** for delisted units
- **Share of units delisted in <=14 days**

---

## Required visualizations

## 1) Average listing price over time (historical)
### User question answered
"Are similar units getting cheaper or more expensive over time?"

### Chart
- **Line chart**
- X-axis: scrape date (daily)
- Y-axis: price ($)
- Series options:
  - Average price (main line)
  - Median price (optional)
  - Min/max ribbon (shaded band)
- Facet/filter by building and unit type

### Data transform
For each date `d` and group `g` (`building + unitType`):
- `prices_d_g = all observed priceHistory entries for units in g at date d`
- `avgPrice_d_g = mean(prices_d_g)`
- `medianPrice_d_g = median(prices_d_g)`
- `minPrice_d_g`, `maxPrice_d_g`
- `sampleSize_d_g = count(prices_d_g)`

Display sample size in tooltip to avoid misreading low-volume dates.

---

## 2) Available-date trend and June focus
### User question answered
"How many units are opening in June, and when exactly in June?"

### Charts
- **Stacked bar (or grouped bar):** counts by available month (Mar/Apr/May/Jun/Jul)
  - Split by unit type
- **June heatmap/calendar strip:** count of units by day in June 2026
  - Optional color by median price that day
- **Scatter plot:** available date vs current price (one dot per unit)
  - Helps identify cheaper move-in dates in June

### Data transform
Normalize `availableDate` to ISO date first.
- `availableMonth = YYYY-MM`
- `isJuneTarget = availableDate in [2026-06-01, 2026-06-30]`

Compute:
- `countByMonth(building, unitType)`
- `countByJuneDay(building, unitType, day)`
- `priceDistributionForJuneDates`

---

## 3) Time-on-market / delist speed clustered by available date
### User question answered
"How long do listings stay up before being delisted, and does that depend on move-in date?"

### Charts
- **Box plot (preferred) or violin/column:** days listed by available-date bucket
- **Survival curve (advanced but very useful):** probability listing remains active vs days listed
  - Separate line per available-date bucket (e.g., April, May, June)

### Available-date clusters
Start simple:
- `Before June` (< 2026-06-01)
- `June 1-10`
- `June 11-20`
- `June 21-30`
- `After June`

### Days-on-market definitions
For delisted units:
- `DOM = delistedDate - createdDate`

For active units (right-censored):
- `DOM_so_far = today - createdDate`
- Include only in survival analysis; do not mix directly with completed delists in simple averages.

### KPI outputs
- Median DOM per available-date cluster
- 25th/75th percentile DOM
- Fast-delist rate (`DOM <= 14 days`)

---

## Interaction design (single analytics page)
Use one dedicated **Trends** tab in frontend with controls pinned on top.

### Controls
- Building selector (`All` + each building)
- Unit type selector (`All`, Studio, 1 Bed, 2 Bed, 3 Bed)
- Available-date filter presets:
  - `All`
  - `June 2026 only`
  - `Before June`
  - `After June`
- Price range slider
- Toggle: `Include archived`, `Active only`, `Archived only`

### Layout
1. KPI row
2. Price trend line chart
3. Available-date month/day views
4. DOM-by-available-date chart + survival curve
5. Drilldown table (unit-level)

---

## Backend/API additions recommended
You already have `/api/buildings/:buildingId/price-trends/:unitType`.
Add these to avoid heavy client-side recompute:

1. `GET /api/analytics/trends`
- Params: `buildingId`, `unitType`, `startDate`, `endDate`, `availableDateStart`, `availableDateEnd`
- Returns daily aggregates: avg/median/min/max/count

2. `GET /api/analytics/availability`
- Returns counts by month/day and optional price summaries for available dates

3. `GET /api/analytics/listing-duration`
- Returns DOM stats by available-date cluster and survival series

4. `GET /api/analytics/kpis`
- Returns top-card metrics for current filter set

---

## Data quality safeguards
Because IDs are built from beds/baths/sqft/floor, occasional identity drift can happen when source metadata changes.

Add checks:
- If same building + floor plan + nearly same sqft appears with changed floor metadata, flag potential ID split.
- Track `firstSeenTimestamp` and `lastSeenTimestamp` consistently (ISO) for robust DOM.
- Parse `availableDate` once and persist normalized date field (`availableDateISO`).

---

## Minimal implementation roadmap (fastest path)

### Phase 1 (MVP, 1–2 days)
- Add Trends tab
- Implement KPI row
- Implement avg price-over-time line chart
- Implement available month chart + June-only filter

### Phase 2 (next)
- Add listing-duration analytics endpoint
- Add DOM chart clustered by available-date buckets
- Add drilldown table and CSV export

### Phase 3 (advanced)
- Add survival curve for active + archived combined analysis
- Add sqft-band toggle and confidence indicators for low sample size

---

## Decision guidance for your June 2026 goal
When evaluating building + unit type combinations, prioritize:
1. Lower current avg price **and** downward 30-day trend
2. Higher June inventory count (more options)
3. Longer median DOM for June-available units (more negotiation room)
4. Lower fast-delist rate for June buckets (less competition pressure)

This gives a practical “value + timing + competition” view for move-in planning.
