# Avalon North Station Website - HTML Structure & Data Extraction Analysis

**Website**: https://www.avaloncommunities.com/massachusetts/boston-apartments/avalon-north-station/

**Analysis Date**: January 31, 2026

**Total Units Available**: 42 apartments

---

## Executive Summary

The Avalon North Station website uses a **React-based single-page application (SPA)** with data embedded in a JavaScript object within the initial HTML. The apartment unit data is available in two formats:

1. **Embedded JSON API Response** - Complete unit data in `window.Fusion.store.units` JavaScript object
2. **Rendered HTML Components** - Using Ant Design card components for display

**Recommendation**: Use the embedded JSON API data for scraping as it contains complete, structured information including pricing, availability, and detailed unit specs.

---

## Section 1: Data Source & Architecture

### 1.1 Primary Data Location: Embedded JavaScript Object

**Location in HTML**: `<script id="__FUSION_STATE__">` tag near page load

**Format**: JSON embedded in JavaScript global variable `Fusion.store`

**Key Properties**:
```javascript
Fusion.store = {
  "communityDetail": {
    "units": [/* Array of unit objects */],
    "community": {/* Community info */}
  }
}
```

**Access Pattern**: 
```javascript
const unitsData = window.Fusion?.store?.communityDetail?.units || [];
```

### 1.2 Why Parsing JSON is Better Than HTML Scraping

| Aspect | HTML Scraping | JSON Parsing |
|--------|---------------|--------------|
| **Reliability** | Fragile to CSS changes | Stable structure |
| **Completeness** | Limited to rendered units | All 42+ units included |
| **Data Accuracy** | May have display issues | Server-rendered data |
| **Performance** | Parse HTML tree | Direct object access |
| **Pagination** | Manual iteration needed | Already complete |

---

## Section 2: Unit Display Structure

### 2.1 HTML Rendering - Unit Card Components

**Container Structure**:
```
div.ant-col.ant-col-xs-24.ant-col-md-12.ant-col-lg-8
  └── div.ant-card.ant-card-bordered.unit-item
      └── div.ant-card-body
          └── div.unit-item-details
              ├── img (Virtual tour thumbnail)
              ├── h2.ant-card-meta-title (Unit name + community)
              ├── div.description (Specs summary)
              ├── div.unit-info (Pricing & availability)
              └── a.ant-btn (View Details button)
```

### 2.2 CSS Classes for Unit Elements

| Element | CSS Class | Purpose |
|---------|-----------|---------|
| **Unit Container** | `unit-item`, `ant-card`, `ant-card-bordered` | Main unit card wrapper |
| **Unit Details Wrapper** | `unit-item-details` | Contains all unit info |
| **Description/Specs** | `description` | Bedroom • Bath • SqFt specs |
| **Pricing Section** | `unit-pricing`, `unit-info` | Price information |
| **Availability** | `unit-availability`, `available-when` | Move-in dates |
| **Virtual Tour Badge** | `virtual-tour-badge` | Indicates virtual tour available |
| **Furnished Badge** | `furnished-option-label` | Shows furnishing option |
| **Grid Container** | `ant-row`, `ant-col-*` | Responsive grid layout |

### 2.3 Sample Unit Card HTML

```html
<div class="ant-col ant-col-xs-24 ant-col-md-12 ant-col-lg-8">
  <div class="ant-card ant-card-bordered unit-item">
    <div class="ant-card-body">
      <div class="unit-item-details">
        <!-- Virtual tour badge if available -->
        <div class="virtual-tour-badge">Virtual tour</div>
        
        <!-- Unit name -->
        <h2 class="ant-card-meta-title">001-1915<br/>Avalon North Station</h2>
        
        <!-- Specs: Bedroom • Bath • SqFt -->
        <div class="description">
          Studio • 1 bath • 460 sqft • Available Furnished
        </div>
        
        <!-- Pricing and availability -->
        <div class="unit-info d-flex justify-content-between">
          <div class="unit-pricing">
            <div>Total price starting at</div>
            <div class="d-flex text-default align-items-baseline">
              <span class="price">$2,865</span>
              <span class="term-length">/ 12 mo. lease</span>
            </div>
            <div>Furnished starting at $4,050</div>
          </div>
          
          <div class="unit-availability text-right">
            <div class="available-when">Available<br/>starting</div>
            <div class="availability-date">Apr 14</div>
          </div>
        </div>
        
        <!-- View details button -->
        <a class="ant-btn ant-btn-default">View Details</a>
      </div>
    </div>
  </div>
</div>
```

---

## Section 3: Unit Data Structure (JSON Format)

### 3.1 Complete Unit Object Schema

```javascript
{
  "unitId": "AVB-MA048-001-1915",              // Unique identifier
  "propertyId": "AVB-MA048",                    // Property code
  "unitName": "1915",                           // Unit number
  "communityId": "AVB-MA048",                   // Community code
  "communityName": "Avalon North Station",      // Community name
  
  // ADDRESS
  "address": {
    "addressLine1": "1 Nashua Street #1915",
    "city": "Boston",
    "state": "MA",
    "zip": "02114"
  },
  
  // UNIT SPECIFICATIONS
  "bedroomNumber": 0,                           // 0 for studio, 1-3 for BR
  "bathroomNumber": 1,                          // Bathroom count
  "squareFeet": 460,                            // Square footage
  "floorNumber": "19",                          // Floor level
  
  // FLOOR PLAN
  "floorPlan": {
    "name": "S1-469",                           // Floor plan designation
    "lowResolution": "/floorplans/ma048/s1x469sf.jpg/128/96",
    "highResolution": "/floorplans/ma048/s1x469sf.jpg/1024/768"
  },
  
  // FURNISHING
  "furnishStatus": "OnDemand",                  // Can be furnished/unfurnished
  
  // FINISH PACKAGE (optional - premium units only)
  "finishPackage": {
    "name": "Premium Penthouse",
    "description": "Premium Penthouse upgrades include..."
  },
  
  // VIRTUAL TOUR
  "virtualTour": {
    "space": "https://my.matterport.com/show/?m=E7LEGwrtvnc",
    "isActualUnit": false                       // true = actual unit, false = model
  },
  
  // CHARACTERISTICS & PROMOTIONS
  "characteristics": [],                        // Additional features
  "promotions": [                               // Active promotions
    {
      "promotionId": "184453",
      "promotionTitle": "Start your lease by 2/6 for 1 month free!",
      "promotionDescription": "..."
    }
  ],
  
  // AVAILABILITY DATES (ISO 8601 format)
  "availableDateUnfurnished": "2026-04-14T04:00:00+00:00",
  "availableDateFurnished": "2026-04-14T04:00:00+00:00",
  "unitStatus": "NoticeAvailable",              // VacantAvailable, NoticeAvailable, etc.
  
  // PRICING - UNFURNISHED
  "startingAtPricesUnfurnished": {
    "moveInDate": "2026-04-14T04:00:00+00:00",
    "leaseTerm": 12,                            // Months
    "appliedDiscount": 0,                       // Monthly discount amount
    "prices": {
      "price": 2800,                            // Base monthly rent
      "totalPrice": 2865,                       // With fees/adjustments
      "netEffectivePrice": 2800                 // Effective rent after discounts
    }
  },
  
  // PRICING - FURNISHED
  "startingAtPricesFurnished": {
    "moveInDate": "2026-04-14T04:00:00+00:00",
    "leaseTerm": 12,
    "appliedDiscount": 0,
    "prices": {
      "price": 4050,
      "totalPrice": 4050,
      "netEffectivePrice": 4050
    }
  },
  
  // METADATA
  "url": "https://www.avaloncommunities.com/massachusetts/boston-apartments/avalon-north-station/apartment/MA048-MA048-001-1915",
  "useTotalPrice": true
}
```

---

## Section 4: Unit Types & Organization

### 4.1 Unit Types Available

**Studio (0 Bedrooms)**
- Bedroom count: `bedroomNumber: 0`
- Square footage: 460-509 sq ft
- Bathrooms: 1
- Price range: $2,800-$2,900/month
- Floor plans: S1-469, S4-509, S5-577, S6-638

**1-Bedroom**
- Bedroom count: `bedroomNumber: 1`
- Square footage: 638-775 sq ft
- Bathrooms: 1
- Price range: $3,200-$3,700/month
- Floor plans: A1, A3, A4, A5, etc.

**2-Bedroom**
- Bedroom count: `bedroomNumber: 2`
- Square footage: 1,039-1,320 sq ft
- Bathrooms: 2
- Price range: $4,395-$6,460/month
- Floor plans: B1, B2, B4, B5, B6, B8, etc.

**3-Bedroom**
- Bedroom count: `bedroomNumber: 3`
- Square footage: 1,206-1,704 sq ft
- Bathrooms: 2
- Price range: $5,836-$6,750/month
- Floor plans: C1, etc.

### 4.2 How Units Are Mixed/Organized

**Rendering**: Units are displayed in a **responsive grid** mixing all bedroom types
- Grid: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)
- **No separate sections** - all units in single filterable list

**Filtering Options Available** (in sticky filter bar):
- **Bedrooms**: Dropdown to filter by bedroom count
- **Furnishings**: Furnished / Unfurnished / On Demand
- **Price Range**: Slider filter
- **Finish Package**: Premium packages (Signature, Penthouse)
- **Sort Options**: Lowest Price, Highest Price, Newest, etc.

**Finding Specific Types in JSON**:
```javascript
// Filter by bedroom count
studios = units.filter(u => u.bedroomNumber === 0);
oneBeds = units.filter(u => u.bedroomNumber === 1);
twoBeds = units.filter(u => u.bedroomNumber === 2);
threeBeds = units.filter(u => u.bedroomNumber === 3);
```

---

## Section 5: Pricing Information

### 5.1 Pricing Display Format

**On Unit Cards**:
```
Total price starting at $2,865 / 12 mo. lease
Furnished starting at $4,050
```

**What Each Price Means**:
- **Total price**: Base rent + any applicable fees/adjustments
- **Net effective price**: Actual monthly cost after all discounts
- **Applied discount**: Dollar amount of monthly discount (if any)

### 5.2 Pricing Variations

```javascript
// Same unit may have multiple price points based on:

startingAtPricesUnfurnished: {
  moveInDate: "2026-04-14T04:00:00+00:00",
  leaseTerm: 12,              // 12-month lease
  appliedDiscount: 0,         // $0/month discount
  prices: {
    price: 2800,              // $2,800/month
    totalPrice: 2865,         // + taxes/fees = $2,865
    netEffectivePrice: 2800   // Effective: $2,800
  }
},

startingAtPricesFurnished: {
  moveInDate: "2026-04-14T04:00:00+00:00",
  leaseTerm: 12,
  appliedDiscount: 0,
  prices: {
    price: 4050,              // $4,050 for furnished
    totalPrice: 4050,
    netEffectivePrice: 4050
  }
}
```

### 5.3 Discount Handling

**Important**: Some units have active promotions with monthly discounts:

```javascript
// Example: 3BR unit with $364/month discount
{
  "appliedDiscount": 364,     // $364/month off
  "prices": {
    "price": 5836,            // After discount
    "totalPrice": 5901,       // + adjustments
    "netEffectivePrice": 5836 // Actual monthly payment
  },
  "promotions": [
    {
      "promotionTitle": "Save up to $364/mo on select apartments!"
    }
  ]
}
```

**CSS for Pricing Display**:
- Container: `.unit-pricing`, `.unit-info`
- Price amount: `.price` (inside span with class)
- Lease term: `.term-length`
- Furnished label: `.furnished-option-label`

---

## Section 6: Bedroom, Bathroom, Square Footage Info

### 6.1 HTML Display Format

**Specs Shown in Description Line**:
```html
<div class="description">
  Studio • 1 bath • 460 sqft • Available Furnished
</div>
```

**Pattern**: `[Bedrooms] • [Bathrooms] bath • [SqFt] sqft • [Furnish Status]`

### 6.2 Extracting from JSON

```javascript
// From unit object:
const bedroom = unit.bedroomNumber;      // 0 for Studio, 1-3 for Bedrooms
const bathroom = unit.bathroomNumber;    // Typically 1 or 2
const sqft = unit.squareFeet;            // Integer value

// Format for display:
const bedLabel = bedroom === 0 ? "Studio" : `${bedroom}BR`;
const specs = `${bedLabel} • ${bathroom} bath • ${sqft} sqft`;
```

### 6.3 Floor Plan Reference

Each unit links to a floor plan:

```javascript
"floorPlan": {
  "name": "S1-469",  // Code: Type+Number-Sqft
  "highResolution": "/floorplans/ma048/s1x469sf.jpg/1024/768"
}
```

**Floor Plan Naming Convention**:
- `S1-469` = Studio, Type 1, 469 sq ft
- `A3-732` = 1-Bedroom (A), Type 3, 732 sq ft
- `B2-1064` = 2-Bedroom (B), Type 2, 1064 sq ft
- `C1-1206` = 3-Bedroom (C), Type 1, 1206 sq ft

**Full floor plan URL**:
```
https://www.avaloncommunities.com/floorplans/ma048/s1x469sf.jpg
```

---

## Section 7: Availability Information

### 7.1 Availability Display

**On Unit Cards**:
```html
<div class="unit-availability text-right">
  <div class="available-when">Available<br/>starting</div>
  <div class="availability-date">Apr 14</div>
</div>
```

**CSS Classes**:
- `.unit-availability` - Availability section wrapper
- `.available-when` - "Available starting" label
- `.availability-date` - Specific date

### 7.2 Unit Status Types

From `unitStatus` field:
```javascript
"unitStatus": "NoticeAvailable"  // Possible values:
// - "VacantAvailable" = Ready now
// - "NoticeAvailable" = Has notice, future availability
// - "UnderMaintenance" = Maintenance ongoing
// - "Leased" = Already rented
```

### 7.3 Availability Dates

**Format**: ISO 8601 timestamps (UTC)

```javascript
"availableDateUnfurnished": "2026-04-14T04:00:00+00:00",
"availableDateFurnished": "2026-04-14T04:00:00+00:00"

// Parse to readable format:
const date = new Date("2026-04-14T04:00:00+00:00");
console.log(date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}));
// Output: "Apr 14"
```

### 7.4 Total Available Units

**Displayed in listings banner**:
```html
<div class="listings-banner bg-theme-shade-9">
  Find Your Home
  <div class="text-white">42 available</div>
</div>
```

**CSS**: `.listings-banner` contains count

---

## Section 8: Interactive Elements

### 8.1 Interactive Features on Page

| Feature | Element | Implementation |
|---------|---------|-----------------|
| **Bedroom Filter** | `.bedroom-wrap` dropdown | Filters units by bedroomNumber |
| **Price Filter** | Price range slider | Range-based filtering |
| **Sort Dropdown** | `.sort-by` select | Reorders unit list |
| **View Details Link** | `.ant-btn` on unit card | Links to individual unit detail page |
| **Virtual Tour Badge** | `.virtual-tour-badge` on card | Indicates Matterport tour available |
| **Furnished Badge** | `.furnished-option-label` | Shows furnishing availability |
| **Sticky Filter Bar** | `.sticky-filter-bar-with-google-review` | Remains at top during scroll |

### 8.2 No Expandable Sections or Pagination

✅ **Key Finding**: All 42 units are loaded on initial page load
- No pagination needed
- No accordion/expandable sections
- No infinite scroll
- All data embedded in initial HTML

### 8.3 Virtual Tour Links

**Format**:
```javascript
"virtualTour": {
  "space": "https://my.matterport.com/show/?m=E7LEGwrtvnc",
  "isActualUnit": false  // true if actual unit, false if model
}
```

**Matterport Format**: `https://my.matterport.com/show/?m=[MATTERPORT_ID]`

---

## Section 9: Page Structure for Data Extraction

### 9.1 Overall Page Layout

```
<html>
  <head>
    <!-- Meta tags, styles -->
  </head>
  
  <body>
    <!-- Header/Navigation -->
    <header class="layout-header">
      <!-- Navigation bar -->
    </header>
    
    <!-- Main Content Sections -->
    <main>
      <!-- Community banner and info -->
      
      <!-- Pricing Overview (summary card showing range by bedroom) -->
      <div class="community-pricing-overview">
        <h5>STUDIO FROM $2,865</h5>
        <h5>1 BEDROOM FROM $3,440</h5>
        <!-- etc -->
      </div>
      
      <!-- Listings Section -->
      <div class="listings-wrapper">
        <!-- Sticky Filter Bar -->
        <div class="sticky-filter-bar-with-google-review">
          <button class="bedroom-wrap">Bedrooms</button>
          <button class="furnished-wrap">Furnishings</button>
          <input class="price-range-slider" />
          <select class="sort-by">
            <option>Lowest Price</option>
          </select>
        </div>
        
        <!-- Units Grid -->
        <div class="ant-row ant-grid">
          <!-- Each unit displayed as ant-col (3 per row on desktop) -->
          <div class="ant-col ant-col-lg-8">
            <div class="ant-card unit-item">
              <!-- Unit card content -->
            </div>
          </div>
          <!-- Repeated for each unit -->
        </div>
      </div>
      
      <!-- Footer sections -->
    </main>
    
    <!-- Embedded Data Script -->
    <script id="__FUSION_STATE__">
      window.Fusion = {
        store: {
          communityDetail: {
            units: [/* 42 units here */],
            community: {/* info */}
          }
        }
      };
    </script>
  </body>
</html>
```

### 9.2 CSS Selectors for Key Elements

| Data Element | CSS Selector | Fallback Query |
|--------------|--------------|-----------------|
| **All units** | `.unit-item` | `[class*="unit-item"]` |
| **Unit cards container** | `.ant-grid` | `.ant-row` |
| **Unit number/name** | `.ant-card-meta-title` | `h2` in unit card |
| **Specs line** | `.description` | Div containing "•" separators |
| **Price** | `.unit-pricing` | `.unit-info .d-flex` |
| **Availability** | `.unit-availability` | Last div in unit-item-details |
| **Bedroom filter** | `.bedroom-wrap` | `[class*="bedroom"]` |
| **Filter bar** | `.sticky-filter-bar-with-google-review` | `[class*="filter-bar"]` |
| **Total count** | `.listings-banner` | Div with "available" text |

---

## Section 10: CSS Class Reference

### 10.1 Bootstrap/Ant Design Grid Classes

Used for responsive layout:

```
.ant-row                    // Grid row container
.ant-col                    // Grid column
.ant-col-xs-24             // Mobile: 24 columns (100% width)
.ant-col-md-12             // Tablet: 12 columns (50% width)
.ant-col-lg-8              // Desktop: 8 columns (33.3% width)

.d-flex                    // Flexbox display
.justify-content-between   // Space-between alignment
.align-items-center        // Vertical center alignment
.flex-column              // Column direction
```

### 10.2 Component Classes

```
.ant-card                 // Card component wrapper
.ant-card-bordered        // Card with border
.ant-card-body            // Card content area
.ant-card-meta-title      // Title within card
.ant-button               // Button component
.ant-btn                  // Alternative button class
.ant-dropdown-trigger     // Dropdown menu
.ant-typography           // Text/typography component
```

### 10.3 Theme & Utility Classes

```
.text-community           // Community-branded text color
.font-primary             // Primary font styling
.font-weight-bold         // Bold text
.font-14                  // 14px font size
.m-0                      // Margin: 0
.mb-2                     // Margin-bottom: some value
.px-4                     // Padding-x: 4 units
.py-2                     // Padding-y: 2 units
.bg-theme-shade-8         // Background color shade 8
.bg-white                 // White background
.z-index-header           // High z-index for header
.position-relative        // Position relative
.position-absolute        // Position absolute
```

---

## Section 11: Data Extraction Patterns

### 11.1 Scraping Strategy

**Best Practice: Extract from Embedded JSON**

```javascript
// Step 1: Load page with Puppeteer
const page = await browser.newPage();
await page.goto(url);

// Step 2: Extract embedded JSON from window.Fusion
const unitsData = await page.evaluate(() => {
  return window.Fusion?.store?.communityDetail?.units || [];
});

// Step 3: Parse unit data
const apartments = unitsData.map(unit => ({
  id: unit.unitId,
  number: unit.unitName,
  bedrooms: unit.bedroomNumber,
  bathrooms: unit.bathroomNumber,
  squareFeet: unit.squareFeet,
  floor: unit.floorNumber,
  
  // Pricing
  price: unit.startingAtPricesUnfurnished.prices.netEffectivePrice,
  priceFurnished: unit.startingAtPricesFurnished.prices.netEffectivePrice,
  discount: unit.startingAtPricesUnfurnished.appliedDiscount,
  
  // Availability
  availableDate: new Date(unit.availableDateUnfurnished),
  status: unit.unitStatus,
  
  // Links
  detailUrl: unit.url,
  virtualTourUrl: unit.virtualTour?.space,
  floorPlanUrl: `https://www.avaloncommunities.com/floorplans/ma048/${unit.floorPlan.name.toLowerCase()}.jpg`,
  
  // Promotions
  hasPromotion: unit.promotions.length > 0,
  promotions: unit.promotions
}));
```

### 11.2 Alternative: HTML-Based Extraction

```javascript
// If JSON unavailable, extract from rendered HTML
const units = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.unit-item')).map(card => {
    const specs = card.querySelector('.description').textContent;
    const [bedrooms, baths, sqft] = specs.match(/(\w+|\d+\.?\d*)/g);
    
    return {
      number: card.querySelector('.ant-card-meta-title').textContent.split('\n')[0],
      specs: specs,
      // Continue extracting other fields...
    };
  });
});
```

---

## Section 12: Important Observations

### 12.1 JavaScript-Heavy Application

✅ **Key Insight**: This is a React/SPA application
- Initial HTML contains JSON data object embedded in `<script>`
- All unit data pre-loaded on page load
- No API calls needed - data already on page
- CSS is dynamically scoped (Ant Design classes)

### 12.2 No Pagination or Lazy Loading

✅ **Advantage for Scraping**:
- All 42 units available in initial page load
- Single page contains all data
- No need to click pagination or scroll forever
- Scraping can complete with one page load

### 12.3 Responsive Grid Layout

✅ **Note**: Unit display order and density changes by screen size
- Desktop: 3 columns (lg-8)
- Tablet: 2 columns (md-12)  
- Mobile: 1 column (xs-24)

When scraping, results will be in rendered order (likely sorted by price or availability).

### 12.4 Virtual Tour Data

✅ **Matterport Integration**:
- Format: `https://my.matterport.com/show/?m=[ID]`
- Some units show actual unit tours (`isActualUnit: true`)
- Others show model/representative tours (`isActualUnit: false`)
- Virtual tour URLs are available in JSON data

### 12.5 Furnishing Options

✅ **Furnished+ Program**:
- `furnishStatus: "OnDemand"` - Can be furnished or unfurnished
- Each option has separate pricing
- Furnished units include: furniture, WiFi, utilities, flexible lease terms
- Example: Studio $2,800 unfurnished, $4,050 furnished

### 12.6 Promotions & Discounts

✅ **Dynamic Promotions**:
- Not all units have promotions
- Promotions appear in `unit.promotions` array
- Examples: "1 month free", "$364/month off"
- Discounts reflected in `appliedDiscount` field and `netEffectivePrice`

---

## Section 13: Summary Table - CSS Selectors & Extraction Points

| Feature | HTML Selector | JSON Path | Data Type | Example |
|---------|---------------|-----------|-----------|---------|
| **Unit Cards** | `.unit-item` | N/A | HTML elements | 42 cards |
| **Unit ID** | N/A (from title) | `unitId` | String | "AVB-MA048-001-1915" |
| **Unit Number** | `.ant-card-meta-title` | `unitName` | String | "1915" |
| **Bedrooms** | `.description` (parse) | `bedroomNumber` | Integer | 0, 1, 2, 3 |
| **Bathrooms** | `.description` (parse) | `bathroomNumber` | Integer | 1, 2 |
| **Square Feet** | `.description` (parse) | `squareFeet` | Integer | 460 |
| **Price** | `.unit-pricing` | `startingAtPricesUnfurnished.prices.netEffectivePrice` | Integer | 2800 |
| **Furnished Price** | `.unit-pricing` (2nd price) | `startingAtPricesFurnished.prices.netEffectivePrice` | Integer | 4050 |
| **Available Date** | `.available-when` | `availableDateUnfurnished` | ISO 8601 | "2026-04-14T04:00:00+00:00" |
| **Floor** | N/A (not displayed) | `floorNumber` | String | "19" |
| **Floor Plan** | N/A | `floorPlan.name` | String | "S1-469" |
| **Virtual Tour** | Badge present? | `virtualTour.space` | URL | "https://my.matterport.com/show/?m=E7LEGwrtvnc" |
| **Promotion** | N/A (not shown on list) | `promotions[].promotionTitle` | String | "1 month free" |
| **Total Available** | `.listings-banner` | Count all units | Integer | 42 |
| **Discount** | N/A (in price calc) | `appliedDiscount` | Integer | 0-364 |

---

## Section 14: Recommended Extraction Implementation

### Quick Start Pseudocode

```javascript
async function scrapeAvalonNorthStation(url) {
  // 1. Launch browser and navigate
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  // 2. Extract embedded JSON (RECOMMENDED)
  const apartments = await page.evaluate(() => {
    const units = window.Fusion?.store?.communityDetail?.units || [];
    return units.map(unit => ({
      // Basic Info
      id: unit.unitId,
      number: unit.unitName,
      address: unit.address.addressLine1,
      
      // Unit Specs
      bedrooms: unit.bedroomNumber,
      bathrooms: unit.bathroomNumber,
      squareFeet: unit.squareFeet,
      floor: unit.floorNumber,
      
      // Pricing (unfurnished)
      monthlyRent: unit.startingAtPricesUnfurnished.prices.netEffectivePrice,
      discount: unit.startingAtPricesUnfurnished.appliedDiscount,
      
      // Pricing (furnished)
      furnishedRent: unit.startingAtPricesFurnished.prices.netEffectivePrice,
      
      // Availability
      availableDate: unit.availableDateUnfurnished,
      status: unit.unitStatus,
      
      // Links & Media
      detailPage: unit.url,
      virtualTour: unit.virtualTour?.space,
      floorPlanImg: unit.floorPlan?.highResolution,
      
      // Promotions
      promotions: unit.promotions
    }));
  });
  
  return apartments;
}
```

---

## Summary

**Most Important Findings:**

1. **Data Source**: Embedded JSON in window.Fusion.store.communityDetail.units
2. **Unit Container CSS**: `.unit-item`, `.ant-card`, `.ant-card-bordered`
3. **Specs Format**: Displayed as "Studio • 1 bath • 460 sqft" in `.description` div
4. **Pricing**: Two separate price points - unfurnished and furnished
5. **Availability**: ISO 8601 dates in JSON, displayed as abbreviated dates (e.g., "Apr 14")
6. **No Interactive Requirements**: All 42 units loaded on initial page load
7. **Floor Plans**: Reference codes like "S1-469", "A3-732", "B2-1064" link to floor plan images
8. **Virtual Tours**: Matterport URLs available in JSON with `isActualUnit` flag
9. **Grid Layout**: Ant Design responsive grid with `.ant-col-lg-8` for 3-column desktop layout
10. **Best Practice**: Extract from embedded JSON rather than parsing HTML for reliability

