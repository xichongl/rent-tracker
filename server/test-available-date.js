import puppeteer from 'puppeteer';

async function testAvailableDate() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    console.log('Navigating to Emerson Place...');
    await page.goto('https://www.equityapartments.com/boston/west-end/emerson-place-apartments', 
      { waitUntil: 'networkidle2', timeout: 30000 });

    // Expand all panels
    await page.evaluate(() => {
      const toggles = document.querySelectorAll('[role="button"][data-toggle="collapse"]');
      toggles.forEach(toggle => {
        if (toggle.classList.contains('collapsed')) {
          toggle.click();
        }
      });
    }).catch(() => null);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to get the unit data from the page's JavaScript context
    console.log('=== Extracting unit data from page context ===\n');

    const unitData = await page.evaluate(() => {
      // Try to find the unit data in various ways
      const units = [];
      
      // Look for Angular scope data
      if (window.angular) {
        try {
          const injector = window.angular.injector(['ng']);
          const rootScope = injector.get('$rootScope');
          if (rootScope && rootScope.vm && rootScope.vm.units) {
            console.log('Found units via Angular scope');
          }
        } catch (e) {
          // Ignore
        }
      }

      // Look for the unit table elements and try to extract move-in data
      const unitTables = document.querySelectorAll('.unit-condensed-table');
      unitTables.forEach((table, idx) => {
        // Get parent panel to find unit type
        const panel = table.closest('.panel');
        const heading = panel ? panel.querySelector('.panel-heading') : null;
        const unitType = heading ? heading.textContent.trim() : 'Unknown';

        // Try to find move-in date info
        let moveInDate = null;

        // Check for data attributes or data properties
        const unitObj = table.__data__ || table.dataset;
        if (unitObj && (unitObj.moveInEarliest || unitObj.moveInLatest)) {
          moveInDate = unitObj.moveInEarliest || unitObj.moveInLatest;
        }

        // Look for span or div with date-like content
        const allSpans = table.querySelectorAll('span, div, p, a');
        allSpans.forEach(span => {
          const text = span.textContent.trim();
          // Look for date patterns
          if (/\d{1,2}\/\d{1,2}/.test(text) && text.length < 50) {
            if (!moveInDate || moveInDate === 'Unknown') {
              moveInDate = text;
            }
          }
        });

        // Try to find attributes on the table or parent
        const parent = table.parentElement;
        while (parent && !moveInDate) {
          const attrs = parent.attributes;
          for (let i = 0; i < attrs.length; i++) {
            if (attrs[i].value.includes('move') || attrs[i].value.includes('date')) {
              moveInDate = attrs[i].value;
              break;
            }
          }
          break;
        }

        units.push({
          index: idx,
          unitType: unitType,
          moveInDate: moveInDate || 'Not found',
          priceText: table.querySelector('.pricing')?.textContent.trim() || 'N/A'
        });
      });

      return units;
    });

    console.log('Unit data from page:');
    unitData.slice(0, 3).forEach(u => {
      console.log(`  Unit ${u.index}: ${u.unitType}`);
      console.log(`    Price: ${u.priceText}`);
      console.log(`    Move-in Date: ${u.moveInDate}`);
    });

    // Try checking the raw HTML for move-in info
    const html = await page.content();
    const moveInMatches = html.match(/MoveInEarliest|MoveInLatest|moveInDate|availableDate/gi) || [];
    console.log(`\nFound ${moveInMatches.length} matches for move-in related keywords`);

    // Look for specific strings in HTML
    const jsonMatch = html.match(/"MoveInEarliest[^}]*}"/);
    if (jsonMatch) {
      console.log('\nFound MoveInEarliest JSON:');
      console.log(jsonMatch[0].substring(0, 200));
    }

    await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
    if (browser) await browser.close();
  }
}

testAvailableDate();
