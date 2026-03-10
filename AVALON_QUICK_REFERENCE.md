# Quick Reference: CSS Selectors & Data Patterns

## Unit Display HTML Structure

```
┌─────────────────────────────────────────┐
│  .ant-col.ant-col-lg-8                  │  ← Unit Column (33.3% width)
│  ┌───────────────────────────────────┐  │
│  │ .ant-card.unit-item              │  │  ← Card Container
│  │ ┌─────────────────────────────┐  │  │
│  │ │ .ant-card-body              │  │  │
│  │ │ ┌───────────────────────┐  │  │  │
│  │ │ │ .unit-item-details  │  │  │  │
│  │ │ │                     │  │  │  │
│  │ │ │ [Virtual tour badge]│  │  │  │
│  │ │ │                     │  │  │  │
│  │ │ │ h2.ant-card-...     │  │  │  │
│  │ │ │ "001-1915"          │  │  │  │
│  │ │ │                     │  │  │  │
│  │ │ │ .description        │  │  │  │
│  │ │ │ "Studio • 1 bath •  │  │  │  │
│  │ │ │  460 sqft ..."      │  │  │  │
│  │ │ │                     │  │  │  │
│  │ │ │ .unit-info          │  │  │  │
│  │ │ │  ├─ .unit-pricing  │  │  │  │
│  │ │ │  │  "$2,865/mo"    │  │  │  │
│  │ │ │  └─ .unit-avail... │  │  │  │
│  │ │ │     "Apr 14"       │  │  │  │
│  │ │ │                     │  │  │  │
│  │ │ │ a.ant-btn           │  │  │  │
│  │ │ │ "View Details"      │  │  │  │
│  │ │ └───────────────────┘  │  │  │
│  │ └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## Unit Card Extraction Map

### HTML Element Locations

```html
<div class="unit-item">
  <!-- Location 1: Virtual Tour Indicator -->
  <div class="virtual-tour-badge">Virtual tour</div>
  
  <!-- Location 2: Unit Identifier -->
  <h2 class="ant-card-meta-title">
    001-1915               ← Unit Number (unitName)
    Avalon North Station   ← Community Name
  </h2>
  
  <!-- Location 3: Specifications -->
  <div class="description">
    Studio                 ← Bedroom (bedroomNumber = 0)
    • 1 bath              ← Bathrooms (bathroomNumber)
    • 460 sqft            ← Square Footage (squareFeet)
    • Available Furnished ← Furnish Status
  </div>
  
  <!-- Location 4: Pricing Section -->
  <div class="unit-info">
    <div class="unit-pricing">
      Total price starting at
      $2,865                ← Price (netEffectivePrice, unfurnished)
      / 12 mo. lease       ← Lease Term
      Furnished starting at $4,050  ← Furnished Price
    </div>
    
    <!-- Location 5: Availability Section -->
    <div class="unit-availability">
      Available            ← Label
      starting
      Apr 14               ← Move-in Date (from availableDateUnfurnished)
    </div>
  </div>
  
  <!-- Location 6: Action Button -->
  <a class="ant-btn">View Details</a>
  └─→ href="...apartment/MA048-MA048-001-1915"
</div>
```

---

## CSS Selector Quick Reference

| Purpose | Selector | Type | Notes |
|---------|----------|------|-------|
| Select all unit cards | `.unit-item` | Class | Returns NodeList of 42 items |
| Select unit grid | `.ant-row.ant-grid` | Class | Parent container for all units |
| Get unit number | `.ant-card-meta-title` | Element | Contains "001-1915" |
| Get specs line | `.description` | Class | Contains "Studio • 1 bath • 460 sqft" |
| Get pricing | `.unit-pricing` | Class | Contains all price info |
| Get price amount | `.d-flex.align-items-baseline` | Class combo | Direct child of unit-pricing |
| Get availability | `.unit-availability` | Class | Contains date info |
| Get filter bar | `.sticky-filter-bar-with-google-review` | Class | Filter controls |
| Get bedroom filter | `.bedroom-wrap` | Class | Dropdown button |
| Get total count | `.listings-banner` | Class | Text: "42 available" |

---

## JSON Field Mapping

```javascript
// HTML Display → JSON Source

"Studio • 1 bath • 460 sqft" 
  ↓
{
  bedroomNumber: 0,        // 0 = Studio
  bathroomNumber: 1,       // Bathroom count
  squareFeet: 460          // Square footage
}

"$2,865 / 12 mo. lease"
  ↓
{
  startingAtPricesUnfurnished: {
    prices: {
      netEffectivePrice: 2800,  // Actual monthly rent
      totalPrice: 2865           // With fees
    }
  }
}

"Furnished starting at $4,050"
  ↓
{
  startingAtPricesFurnished: {
    prices: {
      netEffectivePrice: 4050   // Furnished price
    }
  }
}

"Available starting Apr 14"
  ↓
{
  availableDateUnfurnished: "2026-04-14T04:00:00+00:00"
  // Parse this ISO date to display as "Apr 14"
}

"001-1915"
  ↓
{
  unitName: "1915",        // Displayed as "001-1915" format
  unitId: "AVB-MA048-001-1915"
}
```

---

## Bedroom Count Classification

```javascript
bedroomNumber Value → Type → Price Range → Sqft Range

0  → Studio    → $2,800-$2,900  → 460-509 sqft
1  → 1 Bed     → $3,200-$3,700  → 638-775 sqft
2  → 2 Bed     → $4,395-$6,460  → 1,039-1,320 sqft
3  → 3+ Bed    → $5,836-$6,750  → 1,206-1,704 sqft
```

---

## Pricing Data Structure

```
startingAtPricesUnfurnished: {
  moveInDate: "2026-04-14T04:00:00+00:00",
  leaseTerm: 12,              // 12-month lease
  appliedDiscount: 0,         // $0 discount
  prices: {
    price: 2800,              // ← Use this (base price)
    totalPrice: 2865,         // ← Or this (with taxes)
    netEffectivePrice: 2800   // ← Recommended (after discounts)
  }
}

startingAtPricesFurnished: {
  // Same structure, different prices
  prices: {
    price: 4050,
    totalPrice: 4050,
    netEffectivePrice: 4050
  }
}
```

**For CSV/Database Storage**: Use `netEffectivePrice` (most accurate)

---

## Availability Date Parsing

```javascript
// JSON contains ISO 8601 format:
"2026-04-14T04:00:00+00:00"

// Convert to display format:
const date = new Date("2026-04-14T04:00:00+00:00");
const display = date.toLocaleDateString('en-US', {
  month: 'short',  // "Apr"
  day: 'numeric'   // "14"
});
// Result: "Apr 14" ✓

// Or manually:
const month = date.toLocaleString('en-US', { month: 'short' });
const day = date.getDate();
// Result: `${month} ${day}` = "Apr 14" ✓
```

---

## Status Field Values

```javascript
unitStatus values:

"VacantAvailable"   → Ready to move in immediately
"NoticeAvailable"   → Notice period before availability
"UnderMaintenance"  → Unit being prepared
"Leased"            → Already rented (usually hidden)
```

---

## Floor Plan Code Reference

```
Format: [Type][Number]-[Sqft]

Studio Plans:
  S1-469    → Studio Type 1, 469 sq ft
  S4-509    → Studio Type 4, 509 sq ft
  S5-577    → Studio Type 5, 577 sq ft
  S6-638    → Studio Type 6, 638 sq ft

1-Bedroom Plans:
  A1-638    → 1BR Type 1, 638 sq ft
  A3-732    → 1BR Type 3, 732 sq ft
  A4-756    → 1BR Type 4, 756 sq ft
  A5-773    → 1BR Type 5, 773 sq ft

2-Bedroom Plans:
  B1-1039   → 2BR Type 1, 1039 sq ft
  B2-1064   → 2BR Type 2, 1064 sq ft
  B4-1081   → 2BR Type 4, 1081 sq ft
  B5-1146   → 2BR Type 5, 1146 sq ft
  B6-1223   → 2BR Type 6, 1223 sq ft
  B8-1320   → 2BR Type 8, 1320 sq ft

3-Bedroom Plans:
  C1-1206   → 3BR Type 1, 1206 sq ft
  C1-1217   → 3BR Type 1 variant, 1217 sq ft
```

---

## Promotions Data

```javascript
promotions: [
  {
    promotionId: "184453",
    promotionTitle: "Start your lease by 2/6 for 1 month free!",
    promotionDescription: "Get 1 month free on select homes..."
  },
  // More if applicable
]

// Check if unit has promotion:
const hasPromo = unit.promotions.length > 0;
if (hasPromo) {
  const promo = unit.promotions[0];
  console.log(promo.promotionTitle);
}

// Applied discount also shown separately:
unit.startingAtPricesUnfurnished.appliedDiscount  // e.g., 364 ($364/month off)
```

---

## Virtual Tour Integration

```javascript
virtualTour: {
  space: "https://my.matterport.com/show/?m=E7LEGwrtvnc",
  isActualUnit: false
}

// Check if available:
const hasTour = unit.virtualTour?.space ? true : false;

// Check if actual unit or model:
const isActualUnit = unit.virtualTour?.isActualUnit ?? false;
// true = Real unit tour, false = Model/representative unit
```

---

## Responsive Breakpoints

```
Layout Columns:
┌─────────────────────────────────────┐
│ Extra Large Desktop (lg)             │
│ 3 columns per row (33.3% each)       │ .ant-col-lg-8
├─────────────┬─────────────┬─────────┤
│   25%       │   25%       │   25%   │ .ant-col-md-12
│         2 columns per row (50% each) │
├─────────────┴─────────────┼─────────┤
│            50%            │  50%    │
│         for tablet split  │         │
├────────────────────────────┴─────────┤
│                                     │
│         1 column (100%)              │ .ant-col-xs-24
│      for mobile devices             │
└─────────────────────────────────────┘
```

When scraping with Puppeteer:
- Set viewport to capture desktop layout: `page.setViewport({ width: 1200, height: 800 })`
- This ensures 3-column grid is rendered
- Units appear in price/availability order

---

## No Pagination or Lazy Loading

✅ All 42 units loaded on initial page
✅ No "Load More" button
✅ No infinite scroll
✅ Single-page application (SPA)

**Implication**: Single page scrape captures all data

---

## Filter Bar Elements

```html
<div class="sticky-filter-bar-with-google-review">
  
  <!-- Furnishings Filter -->
  <button class="furnish-wrap">
    Furnishings
  </button>
  
  <!-- Bedroom Filter (RECOMMENDED TO USE) -->
  <button class="bedroom-wrap">
    Bedrooms
    <span class="content">Bedrooms</span>
  </button>
  
  <!-- Price Range Filter -->
  <input class="price-range-slider" />
  
  <!-- Finish Package Filter -->
  <button class="finish-package-wrap">
    Finish Package
  </button>
  
  <!-- Sort Dropdown -->
  <select class="sort-by">
    <option>Lowest Price</option>
    <option>Highest Price</option>
    <!-- etc -->
  </select>
  
  <!-- Favorites Button -->
  <button>Favorites</button>
</div>
```

---

## Data Completeness Checklist

- ✅ **Unit ID**: Present in JSON as `unitId`
- ✅ **Bedroom/Bath/Sqft**: Available in separate fields
- ✅ **Pricing**: Two-tier (unfurnished + furnished)
- ✅ **Discounts**: Calculated in `appliedDiscount` field
- ✅ **Availability Dates**: ISO 8601 timestamps
- ✅ **Virtual Tours**: Matterport URLs
- ✅ **Floor Plans**: Reference codes + image URLs
- ✅ **Promotions**: Array of active promotions
- ✅ **Address**: Full address with unit number
- ✅ **Floor Number**: For high-rise context
- ✅ **Virtual Tour Type**: Flag for actual vs model unit
- ✅ **All Units Pre-loaded**: No API calls needed

---

## Example: Complete Unit Object (Studio)

```javascript
{
  unitId: "AVB-MA048-001-1915",
  propertyId: "AVB-MA048",
  unitName: "1915",
  communityName: "Avalon North Station",
  address: {
    addressLine1: "1 Nashua Street #1915",
    city: "Boston",
    state: "MA",
    zip: "02114"
  },
  bedroomNumber: 0,              // Studio
  bathroomNumber: 1,
  squareFeet: 460,
  floorNumber: "19",
  floorPlan: {
    name: "S1-469",
    highResolution: "/floorplans/ma048/s1x469sf.jpg/1024/768"
  },
  furnishStatus: "OnDemand",
  virtualTour: {
    space: "https://my.matterport.com/show/?m=E7LEGwrtvnc",
    isActualUnit: false
  },
  characteristics: [],
  promotions: [],
  availableDateUnfurnished: "2026-04-14T04:00:00+00:00",
  availableDateFurnished: "2026-04-14T04:00:00+00:00",
  unitStatus: "NoticeAvailable",
  
  startingAtPricesUnfurnished: {
    moveInDate: "2026-04-14T04:00:00+00:00",
    leaseTerm: 12,
    appliedDiscount: 0,
    prices: {
      price: 2800,
      totalPrice: 2865,
      netEffectivePrice: 2800
    }
  },
  
  startingAtPricesFurnished: {
    moveInDate: "2026-04-14T04:00:00+00:00",
    leaseTerm: 12,
    appliedDiscount: 0,
    prices: {
      price: 4050,
      totalPrice: 4050,
      netEffectivePrice: 4050
    }
  },
  
  url: "https://www.avaloncommunities.com/massachusetts/boston-apartments/avalon-north-station/apartment/MA048-MA048-001-1915",
  useTotalPrice: true
}
```

**Display Result**:
```
┌─────────────────────────────────────┐
│      001-1915                       │
│ Avalon North Station                │
│                                     │
│ Studio • 1 bath • 460 sqft ✓       │
│ Available Furnished                 │
│                                     │
│ $2,865 / 12 mo. lease               │
│ Furnished starting at $4,050        │
│                                     │
│ Available starting Apr 14           │
│                                     │
│ [View Details]                      │
└─────────────────────────────────────┘
```

---

## Key Takeaways for Developers

1. **JSON First**: Extract from `window.Fusion.store.communityDetail.units`
2. **All Units Loaded**: No pagination - 42 units on initial load
3. **Dual Pricing**: Always capture both furnished and unfurnished
4. **Date Parsing**: Convert ISO 8601 to readable format
5. **Discount Handling**: Use `netEffectivePrice` for accuracy
6. **Floor Plans**: Combine base URL with floor plan code
7. **Virtual Tours**: Check `isActualUnit` flag for reliability
8. **Responsive Layout**: Desktop view shows 3 columns (`.ant-col-lg-8`)
9. **No Interactive Elements Required**: Single page scrape captures everything
10. **Update Frequency**: Check `lastModified` timestamp in state for cache validation

