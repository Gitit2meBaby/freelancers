const axios = require("axios");
const fs = require("fs");
const path = require("path");

const WP_BASE = "https://freelancers.com.au/wp-json/wp/v2";

// Create output folder
const OUTPUT_DIR = path.join(__dirname, "output");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

async function fetchAll(endpoint) {
  try {
    let page = 1;
    let results = [];
    const perPage = 100;

    while (true) {
      const res = await axios.get(`${WP_BASE}/${endpoint}`, {
        params: { per_page: perPage, page }
      });

      if (res.data.length === 0) break;

      results = results.concat(res.data);

      if (res.data.length < perPage) break;
      page++;
    }

    return results;
  } catch (err) {
    console.error(`Error fetching ${endpoint}:`, err.response?.data || err.message);
    return [];
  }
}

function saveToFile(name, data) {
  const filePath = path.join(OUTPUT_DIR, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Saved ${name}.json (${data.length} items)`);
}

async function run() {
  console.log("Fetching WordPress data...");

  // Step 1 — get all post types
  const typesRes = await axios.get(`${WP_BASE}/types`);
  const postTypes = Object.keys(typesRes.data);

  // Filter out heavy WP system types
  const filteredTypes = postTypes.filter(t =>
    !["attachment", "wp_block", "wp_template"].includes(t)
  );

  // Step 2 — fetch each post type
  let summary = [];
  for (const type of filteredTypes) {
    const items = await fetchAll(type);
    saveToFile(type, items);
    summary.push(`${type}: ${items.length} items`);
  }

  // Step 3 — save summary report
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "summary.txt"),
    summary.join("\n")
  );

  console.log("Done!");
}

run();
