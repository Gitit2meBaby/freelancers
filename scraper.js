const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');

const WP_URL = 'https://freelancers.com.au/adminsuperlogin/';
const USERNAME = 'info@freelancers.com.au';
const PASSWORD = 'x^bS7LI6lS!sglqrIix4dRJJ';

// CPT pages with their table row selectors
const CPTS = [
  { 
    name: 'crew_lists', 
    url: 'https://freelancers.com.au/wp-admin/edit.php?post_type=crew_lists', 
    rowSelector: 'table.wp-list-table.posts tbody tr' 
  },
  { 
    name: 'service_list', 
    url: 'https://freelancers.com.au/wp-admin/edit.php?post_type=service_list', 
    rowSelector: 'table.wp-list-table.widefat.fixed.striped.table-view-list.posts tbody tr' 
  },
  { 
    name: 'crew_directories', 
  url: 'https://freelancers.com.au/wp-admin/edit-tags.php?taxonomy=crew_directory&post_type=crew_lists',
    rowSelector: 'table.wp-list-table.widefat.fixed.striped.table-view-list.tags tbody tr' 
  }
];


(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Login
  await page.goto(WP_URL);
  await page.type('#user_login', USERNAME);
  await page.type('#user_pass', PASSWORD);
  await page.click('#wp-submit');
  await page.waitForNavigation();

  for (const cpt of CPTS) {
    console.log(`Scraping ${cpt.name}...`);
    await page.goto(cpt.url);
    await page.waitForSelector(cpt.rowSelector);

    let allData = [];
    let hasNext = true;

    while (hasNext) {
      // Extract rows on current page
      const data = await page.evaluate((selector) => {
        const rows = Array.from(document.querySelectorAll(selector));
        return rows.map(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          return cells.map(c => c.innerText.trim());
        });
      }, cpt.rowSelector);

      allData.push(...data);

      // Check if there is a 'Next' button
      hasNext = await page.evaluate(() => {
        const nextBtn = document.querySelector('a.next-page');
        if (nextBtn && !nextBtn.classList.contains('disabled')) {
          nextBtn.click();
          return true;
        }
        return false;
      });

      if (hasNext) {
await new Promise(resolve => setTimeout(resolve, 1500));
        await page.waitForSelector(cpt.rowSelector);
      }
    }

    // Save JSON
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    fs.writeFileSync(path.join(outputDir, `${cpt.name}.json`), JSON.stringify(allData, null, 2));

    // Save CSV
    const parser = new Parser();
    const csv = parser.parse(allData.map(r => Object.fromEntries(r.map((v,i) => [`col${i+1}`,v]))));
    fs.writeFileSync(path.join(outputDir, `${cpt.name}.csv`), csv);

    console.log(`Saved ${cpt.name}.json and ${cpt.name}.csv (${allData.length} rows)`);
  }

  await browser.close();
  console.log('All done!');
})();
