const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to Avalon North Station...');
    await page.goto('https://www.avaloncommunities.com/massachusetts/boston-apartments/avalon-north-station/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('\n=== PAGE TITLE ===');
    const title = await page.title();
    console.log(title);
    
    // Get all text content on page
    console.log('\n=== CHECKING FOR UNITS/APARTMENTS SECTIONS ===');
    
    // Try to find unit containers
    const unitContainers = await page.evaluate(() => {
      const findings = {
        byClass: [],
        byDataAttribute: [],
        byRole: [],
        byCommonPatterns: []
      };
      
      // Search by common class patterns
      const commonClasses = [
        '[class*="unit"]',
        '[class*="apartment"]',
        '[class*="floor-plan"]',
        '[class*="plan"]',
        '[class*="bedroom"]',
        '[class*="pricing"]',
        '[class*="card"]',
        '[class*="item"]'
      ];
      
      commonClasses.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          findings.byClass.push({
            selector: selector,
            count: elements.length,
            sampleClasses: Array.from(elements).slice(0, 3).map(el => el.className)
          });
        }
      });
      
      // Search by data attributes
      const dataAttrs = [
        '[data-unit]',
        '[data-apartment]',
        '[data-floor-plan]',
        '[data-plan]',
        '[data-bedroom]',
        '[data-price]',
        '[data-availability]'
      ];
      
      dataAttrs.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          findings.byDataAttribute.push({
            selector: selector,
            count: elements.length,
            sampleValues: Array.from(elements).slice(0, 3).map(el => ({
              tag: el.tagName,
              dataAttrs: Object.keys(el.dataset),
              classList: el.className
            }))
          });
        }
      });
      
      // Search by role
      const roleSelectors = [
        '[role="button"]',
        '[role="tab"]',
        '[role="tabpanel"]',
        '[role="region"]'
      ];
      
      roleSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          findings.byRole.push({
            selector: selector,
            count: elements.length
          });
        }
      });
      
      return findings;
    });
    
    console.log(JSON.stringify(unitContainers, null, 2));
    
    console.log('\n=== CHECKING INTERACTIVE ELEMENTS ===');
    const interactiveElements = await page.evaluate(() => {
      const findings = {
        buttons: [],
        tabs: [],
        accordions: [],
        expandableElements: []
      };
      
      // Find buttons
      const buttons = document.querySelectorAll('button');
      findings.buttons = Array.from(buttons).slice(0, 10).map(btn => ({
        text: btn.innerText,
        classes: btn.className,
        ariaLabel: btn.getAttribute('aria-label'),
        dataAttributes: Object.keys(btn.dataset)
      }));
      
      // Look for tab-like elements
      const tabs = document.querySelectorAll('[role="tab"], [class*="tab"]');
      findings.tabs = Array.from(tabs).slice(0, 10).map(tab => ({
        text: tab.innerText,
        classes: tab.className,
        ariaSelected: tab.getAttribute('aria-selected'),
        ariaControls: tab.getAttribute('aria-controls')
      }));
      
      // Look for accordion patterns
      const accordions = document.querySelectorAll('[class*="accordion"], [class*="collaps"]');
      findings.accordions = Array.from(accordions).slice(0, 5).map(acc => ({
        classes: acc.className,
        tag: acc.tagName,
        children: acc.children.length
      }));
      
      return findings;
    });
    
    console.log(JSON.stringify(interactiveElements, null, 2));
    
    console.log('\n=== SEARCHING FOR PRICING INFORMATION ===');
    const pricingInfo = await page.evaluate(() => {
      const findings = {
        priceElements: [],
        pricePatterns: [],
        textContent: []
      };
      
      // Find elements containing price-like content
      const allElements = document.querySelectorAll('*');
      const priceElements = Array.from(allElements).filter(el => {
        const text = el.textContent;
        return /\$[\d,]+/g.test(text) && el.children.length < 5;
      });
      
      findings.priceElements = priceElements.slice(0, 20).map(el => ({
        tag: el.tagName,
        classes: el.className,
        text: el.innerText,
        dataAttributes: Object.keys(el.dataset)
      }));
      
      // Find all text nodes with prices
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      let priceMatches = [];
      while (node = walker.nextNode()) {
        if (/\$[\d,]+/.test(node.textContent)) {
          priceMatches.push({
            text: node.textContent.trim(),
            parentTag: node.parentElement.tagName,
            parentClass: node.parentElement.className
          });
        }
      }
      findings.textContent = priceMatches.slice(0, 20);
      
      return findings;
    });
    
    console.log(JSON.stringify(pricingInfo, null, 2));
    
    console.log('\n=== ANALYZING PAGE STRUCTURE ===');
    const pageStructure = await page.evaluate(() => {
      const findings = {
        mainContainers: [],
        gridPatterns: [],
        listPatterns: [],
        textHeadings: []
      };
      
      // Find main content container
      const mainElements = document.querySelectorAll('main, [role="main"], .main, #main, .container, [class*="content"]');
      findings.mainContainers = Array.from(mainElements).slice(0, 5).map(el => ({
        tag: el.tagName,
        classes: el.className,
        id: el.id,
        children: el.children.length,
        descendantText: el.innerText.substring(0, 100)
      }));
      
      // Find grid/flex patterns
      const grids = document.querySelectorAll('[class*="grid"], [class*="flex"], [style*="grid"], [style*="flex"]');
      findings.gridPatterns = Array.from(grids).slice(0, 10).map(el => ({
        tag: el.tagName,
        classes: el.className,
        style: el.getAttribute('style')?.substring(0, 100),
        children: el.children.length
      }));
      
      // Find all headings
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      findings.textHeadings = Array.from(headings).slice(0, 20).map(h => ({
        tag: h.tagName,
        text: h.innerText,
        classes: h.className
      }));
      
      return findings;
    });
    
    console.log(JSON.stringify(pageStructure, null, 2));
    
    console.log('\n=== CHECKING FOR BEDROOM/UNIT TYPE INFORMATION ===');
    const unitTypeInfo = await page.evaluate(() => {
      const findings = {
        bedroomMentions: [],
        unitTypeSections: [],
        unitTypeText: []
      };
      
      // Search for elements mentioning bedrooms
      const allElements = document.querySelectorAll('*');
      const bedroomElements = Array.from(allElements).filter(el => 
        /studio|1\s?bed|2\s?bed|3\s?bed|4\s?bed|bedroom|br\b/i.test(el.textContent) && 
        el.children.length < 10 &&
        el.innerText.length < 500
      );
      
      findings.bedroomMentions = bedroomElements.slice(0, 30).map(el => ({
        tag: el.tagName,
        classes: el.className,
        text: el.innerText,
        dataAttributes: Object.keys(el.dataset)
      }));
      
      // Look for specific unit type patterns
      const unitTypePatterns = document.querySelectorAll('[class*="studio"], [class*="1bed"], [class*="2bed"], [class*="3bed"]');
      findings.unitTypeSections = Array.from(unitTypePatterns).slice(0, 10).map(el => ({
        tag: el.tagName,
        classes: el.className,
        children: el.children.length
      }));
      
      return findings;
    });
    
    console.log(JSON.stringify(unitTypeInfo, null, 2));
    
    console.log('\n=== RAW HTML SAMPLE OF FIRST FEW UNITS ===');
    const htmlSample = await page.evaluate(() => {
      const findings = {
        htmlSnippets: [],
        bodyContent: ''
      };
      
      // Get samples of different container types
      const containers = [
        'article',
        '[class*="unit"]',
        '[class*="apartment"]',
        '[class*="floor-plan"]',
        '[class*="card"]',
        'section'
      ];
      
      containers.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          findings.htmlSnippets.push({
            selector: selector,
            count: elements.length,
            firstElementHTML: elements[0].outerHTML.substring(0, 1000)
          });
        }
      });
      
      return findings;
    });
    
    console.log(JSON.stringify(htmlSample, null, 2));
    
    console.log('\n=== CHECKING FOR AVAILABILITY/LEASING INFO ===');
    const availabilityInfo = await page.evaluate(() => {
      const findings = {
        availabilityText: [],
        leasingInfo: [],
        dateElements: []
      };
      
      const allElements = document.querySelectorAll('*');
      const availElements = Array.from(allElements).filter(el =>
        /available|lease|move-in|occupancy|ready/i.test(el.textContent) &&
        el.children.length < 10 &&
        el.innerText.length < 200
      );
      
      findings.availabilityText = availElements.slice(0, 20).map(el => ({
        tag: el.tagName,
        classes: el.className,
        text: el.innerText,
        dataAttributes: Object.keys(el.dataset)
      }));
      
      return findings;
    });
    
    console.log(JSON.stringify(availabilityInfo, null, 2));
    
    console.log('\n=== LOOKING FOR SQUARE FOOTAGE INFO ===');
    const sqftInfo = await page.evaluate(() => {
      const findings = [];
      
      const allElements = document.querySelectorAll('*');
      const sqftElements = Array.from(allElements).filter(el =>
        /sq\.?\s*ft|sqft|square\s*feet|sf\b/i.test(el.textContent) &&
        el.children.length < 10 &&
        el.innerText.length < 300
      );
      
      findings.sqftElements = sqftElements.slice(0, 20).map(el => ({
        tag: el.tagName,
        classes: el.className,
        text: el.innerText,
        dataAttributes: Object.keys(el.dataset)
      }));
      
      return findings;
    });
    
    console.log(JSON.stringify(sqftInfo, null, 2));
    
    // Save full page HTML for analysis
    const html = await page.content();
    fs.writeFileSync('/Users/xichongliu/Downloads/rent-tracker/server/avalon-north-station.html', html);
    console.log('\n✅ Full page HTML saved to avalon-north-station.html');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
