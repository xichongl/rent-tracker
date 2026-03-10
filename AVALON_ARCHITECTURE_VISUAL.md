# Avalon North Station - Visual Architecture Guide

## Page Load Flow

```
┌────────────────────────────────────────────────────────┐
│  Browser Requests: https://avaloncommunities.com/... │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│  HTML Response (React SPA)                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │ <head>                                           │  │
│  │   Meta tags, styles                             │  │
│  │ </head>                                         │  │
│  │ <body>                                          │  │
│  │   <div id="root"></div>  ← React mounts here   │  │
│  │   <script id="__FUSION_STATE__">                │  │
│  │     window.Fusion = { store: { ... } }  ✓ DATA │  │
│  │   </script>                                    │  │
│  │ </body>                                        │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│  React Renders Components                              │
│  - Navbar                                              │
│  - Header                                              │
│  - Pricing Overview (summary by bedroom)               │
│  - Listings Grid with filters                          │
│  - Unit Cards (`.unit-item` × 42)                      │
│  - Footer                                              │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│  Interactive Page with Filters                         │
│  User can filter/sort but no new data loads            │
│  All 42 units already in memory from JSON              │
└────────────────────────────────────────────────────────┘
```

---

## Data Hierarchy

```
window.Fusion
│
└── store
    │
    └── communityDetail
        │
        ├── community
        │   ├── name: "Avalon North Station"
        │   ├── address: "1 Nashua Street"
        │   └── ... other community details
        │
        └── units (Array of 42 objects)
            │
            ├── [0] Studio Unit 1915
            ├── [1] Studio Unit 2215
            ├── [2] Studio Unit 2010
            ├── [3] 1-Bedroom Unit 2815
            ├── [4] 2-Bedroom Unit 1702
            └── ... 37 more units
```

---

## DOM Structure for Scraping

```
<body>
  <header class="layout-header">
    [Navigation bar]
  </header>
  
  <main class="community-detail-page">
    
    <!-- Section 1: Community Info -->
    <div class="community-banner">
      [Banner image]
    </div>
    
    <div class="community-description">
      [Description text]
    </div>
    
    <!-- Section 2: Pricing Overview -->
    <div class="community-pricing-overview position-relative">
      <h5>STUDIO FROM $2,865</h5>
      <h5>1 BEDROOM FROM $3,440</h5>
      <h5>2 BEDROOM FROM $4,395</h5>
      <h5>3+ BEDROOM FROM $5,901</h5>
    </div>
    
    <!-- Section 3: Listings (THE IMPORTANT PART) ✓ -->
    <div class="listings-wrapper">
      
      <!-- Filter Bar (sticky) -->
      <div class="sticky-filter-bar-with-google-review">
        <button class="bedroom-wrap">Bedrooms ▼</button>
        <button class="furnish-wrap">Furnishings ▼</button>
        <input class="price-range-slider" />
        <select class="sort-by">Lowest Price</select>
      </div>
      
      <!-- Units Count -->
      <div class="listings-banner">
        Find Your Home
        <div>42 available</div>
      </div>
      
      <!-- Units Grid -->
      <div class="ant-row ant-grid">
        
        ┌─────────────────────────────────────┐
        │ UNIT 1: Studio #1915                │
        ├─────────────────────────────────────┤
        │ .ant-col.ant-col-lg-8 (33.3% width) │
        │  ┌─────────────────────────────────┐│
        │  │ .ant-card.unit-item             ││
        │  │  ┌────────────────────────────┐ ││
        │  │  │ .ant-card-body             │ ││
        │  │  │  ┌──────────────────────┐  │ ││
        │  │  │  │ .unit-item-details   │  │ ││
        │  │  │  │                      │  │ ││
        │  │  │  │ [Virtual tour badge] │  │ ││
        │  │  │  │ h2: "001-1915"       │  │ ││
        │  │  │  │ .description:        │  │ ││
        │  │  │  │ "Studio • 1 bath •   │  │ ││
        │  │  │  │  460 sqft"           │  │ ││
        │  │  │  │                      │  │ ││
        │  │  │  │ .unit-info           │  │ ││
        │  │  │  │  .unit-pricing:      │  │ ││
        │  │  │  │   "$2,865/mo"        │  │ ││
        │  │  │  │  .unit-availability: │  │ ││
        │  │  │  │   "Apr 14"           │  │ ││
        │  │  │  │                      │  │ ││
        │  │  │  │ a.ant-btn:           │  │ ││
        │  │  │  │ "View Details"       │  │ ││
        │  │  │  └──────────────────────┘  │ ││
        │  │  └────────────────────────────┘ ││
        │  └─────────────────────────────────┘│
        │  ┌─────────────────────────────────┐│
        │  │ [UNIT 2: Studio #2215] ...      ││
        │  └─────────────────────────────────┘│
        │  ┌─────────────────────────────────┐│
        │  │ [UNIT 3: Studio #2010] ...      ││
        │  └─────────────────────────────────┘│
        │ [... 39 more units ...]             │
        └─────────────────────────────────────┘
        
      </div> <!-- end .ant-row -->
      
    </div> <!-- end .listings-wrapper -->
    
    <!-- Sections 4+: Amenities, Contact, etc. -->
    [Not relevant for scraping units]
    
  </main>
  
  <footer>
    [Footer content]
  </footer>
  
  <!-- DATA EMBEDDED HERE ✓ -->
  <script id="__FUSION_STATE__">
    window.Fusion = {
      store: {
        communityDetail: {
          units: [
            {
              unitId: "AVB-MA048-001-1915",
              unitName: "1915",
              bedroomNumber: 0,
              bathroomNumber: 1,
              squareFeet: 460,
              // ... 40 more properties
            },
            // ... 41 more units
          ],
          community: { ... }
        }
      }
    };
  </script>
</body>
```

---

## Data Flow: From JSON to Display

```
┌─────────────────────────────┐
│ Unit JSON Object            │
├─────────────────────────────┤
│ unitName: "1915"            │
│ bedroomNumber: 0            │
│ bathroomNumber: 1           │
│ squareFeet: 460             │
│ availableDateUnfurnished:   │
│   "2026-04-14T04:00:00..."  │
│ startingAtPricesUnfurnished:│
│   .prices.netEffectivePrice:│
│   2800                      │
└────────┬────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ React Component Receives │
│ unit prop                │
└────────┬─────────────────┘
         │
         ▼
┌───────────────────────────────────────┐
│ JSX Renders:                          │
│                                       │
│ <div className="unit-item">           │
│   <h2>{unit.unitName}</h2>            │
│   <div className="description">       │
│     {bedroom} • {bathroom} bath •     │
│     {sqft} sqft                       │
│   </div>                              │
│   <div className="unit-pricing">      │
│     ${unit.price}                     │
│   </div>                              │
│   <div className="unit-availability"> │
│     {format(unit.availableDate)}      │
│   </div>                              │
│ </div>                                │
└────────┬────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ Browser Renders HTML:          │
├────────────────────────────────┤
│ <div class="ant-card unit-item"│
│   <h2>001-1915</h2>           │
│   <div class="description">    │
│     Studio • 1 bath • 460 sqft │
│   </div>                       │
│   <div class="unit-pricing">   │
│     $2,865                     │
│   </div>                       │
│   <div class="unit-avail...">  │
│     Available starting Apr 14  │
│   </div>                       │
│ </div>                         │
└────────┬────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ User Sees Card on Page:            │
│ ┌──────────────────────────────┐  │
│ │ 001-1915                     │  │
│ │ Avalon North Station         │  │
│ │                              │  │
│ │ Studio • 1 bath • 460 sqft   │  │
│ │                              │  │
│ │ $2,865 / 12 mo. lease        │  │
│ │ Available starting Apr 14    │  │
│ │                              │  │
│ │ [View Details]               │  │
│ └──────────────────────────────┘  │
└────────────────────────────────────┘
```

---

## Pricing Calculation Flow

```
JSON Price Object:
┌───────────────────────────────────────────┐
│ startingAtPricesUnfurnished: {             │
│   moveInDate: "2026-04-14T04:00:00...",   │
│   leaseTerm: 12,                          │
│   appliedDiscount: 0,                     │
│   prices: {                               │
│     price: 2800,              ← Base      │
│     totalPrice: 2865,         ← + Taxes   │
│     netEffectivePrice: 2800   ← Display   │
│   }                                       │
│ }                                         │
└──────────────┬────────────────────────────┘
               │
               ├─→ Display: "$2,865"
               ├─→ Term: "/ 12 mo. lease"
               └─→ After Discount: No discount text
                   (because appliedDiscount: 0)

When appliedDiscount > 0:
┌───────────────────────────────────────────┐
│ startingAtPricesUnfurnished: {             │
│   prices: {                               │
│     price: 5836,              ← After $   │
│     totalPrice: 5901,         │ discount  │
│     netEffectivePrice: 5836   │           │
│   },                                      │
│   appliedDiscount: 364        ← $364/mo  │
│ }                                         │
└──────────────┬────────────────────────────┘
               │
               ├─→ Display: "$5,836"
               ├─→ Original: ~$6,200 (calculated)
               └─→ Savings: "$364/mo" (from promotions)
```

---

## Availability Date Parsing Flow

```
ISO 8601 Format (from JSON):
┌──────────────────────────────────────┐
│ "2026-04-14T04:00:00+00:00"          │
│  Year─┬Month─┬Day┬Time┬UTC Offset   │
│       │      │   │    │             │
└───────┼──────┼───┼────┼─────────────┘
        │      │   │    │
        ▼      ▼   ▼    ▼
    2026   04   14   04  +00:00 (UTC)
     │     │    │    │
     │     │    │    └─ 4:00 AM UTC
     │     │    └────── 14th day
     │     └─────────── April month
     └────────────────── 2026 year


JavaScript Date Object:
┌────────────────────────────────────────┐
│ new Date("2026-04-14T04:00:00+00:00")  │
│                                        │
│ Properties:                            │
│ - getFullYear(): 2026                 │
│ - getMonth(): 3 (April = month 3)     │
│ - getDate(): 14                        │
│ - getTime(): milliseconds since epoch  │
└────────────────────────────────────────┘


Format for Display:
┌────────────────────────────────────┐
│ date.toLocaleDateString('en-US', { │
│   month: 'short',    ← "Apr"        │
│   day: 'numeric'     ← "14"         │
│ })                                  │
│                                    │
│ Result: "Apr 14" ✓                 │
└────────────────────────────────────┘
```

---

## Extraction Strategy Decision Tree

```
                    ┌─ START ─┐
                    │          │
                    ▼
        ┌───────────────────────────┐
        │ Data Source Available?    │
        └───────────────────────────┘
         YES ↓           ↓ NO
            │            │
            ▼            ▼
     ┌──────────────┐  ┌──────────────────┐
     │ JSON API     │  │ HTML Parse       │
     │ RECOMMENDED  │  │ Fallback Method  │
     │              │  │                  │
     │ Pros:        │  │ Cons:            │
     │ • Reliable   │  │ • Fragile        │
     │ • Complete   │  │ • Limited data   │
     │ • Fast       │  │ • Slow           │
     │ • Easy       │  │ • Error-prone    │
     │              │  │                  │
     │ Code:        │  │ Code:            │
     │ const data = │  │ const cards =    │
     │   window     │  │ querySelectorAll │
     │   .Fusion    │  │ ('.unit-item')   │
     │   .store...  │  │ cards.forEach... │
     │              │  │                  │
     └──────────────┘  └──────────────────┘
         │ YES           │ NO
         │               │
         ▼               ▼
    ┌─────────┐    ┌──────────┐
    │ SUCCESS │    │ FAIL ✗   │
    │ 42 units│    │ Try HTML │
    │ found ✓ │    │          │
    └─────────┘    └──────────┘
```

---

## Unit Card Layout Breakdown

```
Desktop (lg): 3 columns per row
┌──────────────────┬──────────────────┬──────────────────┐
│   33.3% width    │   33.3% width    │   33.3% width    │
│ .ant-col-lg-8    │ .ant-col-lg-8    │ .ant-col-lg-8    │
│                  │                  │                  │
│ ┌──────────────┐ │ ┌──────────────┐ │ ┌──────────────┐ │
│ │ Unit Card 1  │ │ │ Unit Card 2  │ │ │ Unit Card 3  │ │
│ └──────────────┘ │ └──────────────┘ │ └──────────────┘ │
├──────────────────┼──────────────────┼──────────────────┤
│ ┌──────────────┐ │ ┌──────────────┐ │ ┌──────────────┐ │
│ │ Unit Card 4  │ │ │ Unit Card 5  │ │ │ Unit Card 6  │ │
│ └──────────────┘ │ └──────────────┘ │ └──────────────┘ │
└──────────────────┴──────────────────┴──────────────────┘

Tablet (md): 2 columns per row
┌──────────────────────────┬──────────────────────────┐
│        50% width         │       50% width          │
│ .ant-col-md-12          │ .ant-col-md-12           │
│ ┌────────────────────┐  │ ┌────────────────────┐   │
│ │ Unit Card 1        │  │ │ Unit Card 2        │   │
│ └────────────────────┘  │ └────────────────────┘   │
├──────────────────────────┼──────────────────────────┤
│ ┌────────────────────┐  │ ┌────────────────────┐   │
│ │ Unit Card 3        │  │ │ Unit Card 4        │   │
│ └────────────────────┘  │ └────────────────────┘   │
└──────────────────────────┴──────────────────────────┘

Mobile (xs): 1 column per row
┌──────────────────────────────────┐
│       100% width                 │
│ .ant-col-xs-24                   │
│ ┌──────────────────────────────┐ │
│ │ Unit Card 1                  │ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ Unit Card 2                  │ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ Unit Card 3                  │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

**Recommendation**: Always scrape with viewport width ≥ 1200px to get 3-column desktop layout

---

## CSS Cascade for Unit Card

```
.ant-col                           (Width: 33.3%)
  └── .ant-card                    (Border, padding)
      └── .ant-card-body           (Inner spacing)
          └── .unit-item-details   (Main content area)
              ├── img              (Virtual tour thumbnail)
              ├── .ant-card-meta-title  (Unit name)
              ├── .description     (Specs: bed/bath/sqft)
              ├── .unit-info       (Price + availability)
              │   ├── .unit-pricing
              │   │   └── price span + lease term span
              │   └── .unit-availability
              │       ├── .available-when label
              │       └── date span
              └── a.ant-btn        (View Details link)

Colors/Themes Applied:
.text-community              ← Brand color
.font-primary              ← Primary font
.bg-theme-shade-8          ← Background
.text-default              ← Default text color
```

---

## Filter Interaction Flow (for reference - NOT needed for scraping)

```
User clicks "Bedrooms" button
    ▼
Dropdown menu appears
    ├─ All
    ├─ Studio
    ├─ 1 Bed
    ├─ 2 Bed
    └─ 3+ Bed
    ▼
User selects "1 Bed"
    ▼
Client-side filter applied (NO page reload)
    ▼
Units array filtered to bedroomNumber === 1
    ▼
React re-renders only 1-bed units
    ▼
User sees filtered results

BUT: When scraping with Puppeteer, we have
access to ALL units in JSON regardless of filters!
No need to interact with filters.
```

---

## Throttling & Rate Limiting Considerations

```
Single page scrape: 1 request
  └─ Full page load: ~2-5 seconds
     └─ All 42 units available
        └─ No additional requests needed

Recommendations:
  ✓ Single page.goto() call
  ✓ page.evaluate() to extract JSON
  ✓ No pagination clicks needed
  ✓ No filter interaction needed
  ✓ Minimal resource usage
  ✓ Fast execution (< 10 seconds total)

Rate limiting: Low risk
  • 1 property = 1 request
  • 10 properties = 10 requests per scrape
  • No need for throttling unless scraping many times daily
```

---

## Data Quality Indicators

```
✅ Completeness:
   • All 42 units present
   • All fields populated
   • No missing prices
   • Complete address info

✅ Accuracy:
   • Prices match display
   • Dates consistent
   • Bedroom counts match specs
   • URLs lead to valid pages

✅ Freshness:
   Timestamp in Fusion.store:
   • lastModified: milliseconds since epoch
   • expires: cache expiration time
   
   Check with:
   const modified = new Date(fusion.lastModified);
   const isStale = Date.now() > fusion.expires;

✅ Reliability:
   • Consistent JSON structure
   • No DOM parsing errors
   • No missing properties
   • Normalized data format
```

---

## Troubleshooting Guide

```
Problem: Can't find window.Fusion
Solution: 
  • Page not fully loaded - use waitUntil: 'networkidle2'
  • Script may not have executed
  • Try: await page.waitForFunction(() => !!window.Fusion, {timeout: 10000})

Problem: Empty units array
Solution:
  • Check if Fusion exists: window.Fusion?.store?.communityDetail?.units
  • Try alternative path: window.Fusion.store.communityDetail.units
  • Verify page loaded (check title)

Problem: Missing or wrong prices
Solution:
  • Use netEffectivePrice not price
  • Check appliedDiscount field
  • Some units may have promotions
  • Furnished prices different from unfurnished

Problem: Date parsing fails
Solution:
  • Dates in ISO 8601 format
  • Always parse with: new Date(isoString)
  • JavaScript dates are UTC
  • Local timezone handled automatically

Problem: Unit count mismatch
Solution:
  • Check filter state (shouldn't matter for JSON)
  • Count in listings-banner should match units array length
  • Filter bar might be hiding some units on display
  • JSON contains ALL units regardless
```

