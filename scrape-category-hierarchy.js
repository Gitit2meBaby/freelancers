import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs/promises";

const BASE_URL = "https://freelancers.com.au";
const CREW_DIRECTORY_URL = `${BASE_URL}/crew-directory/`;

// Helper to delay between requests to be polite
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch and parse a page
async function fetchPage(url) {
  try {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const html = await response.text();
    return cheerio.load(html);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

// Extract subcategories from a category page
function extractSubcategories($) {
  const subcategories = [];

  // Look for common WordPress category list patterns
  // Adjust these selectors based on the actual HTML structure
  const selectors = [
    ".category-list a",
    ".subcategory-list a",
    ".service-categories a",
    ".crew-categories a",
    "ul.categories li a",
    "div.category-card a",
    // Generic fallback - links within the main content area
    'main a[href*="/crew-directory/"]',
    'article a[href*="/crew-directory/"]',
    '.content a[href*="/crew-directory/"]',
  ];

  for (const selector of selectors) {
    const links = $(selector);
    if (links.length > 0) {
      links.each((i, elem) => {
        const href = $(elem).attr("href");
        const text = $(elem).text().trim();

        if (href && href.includes("/crew-directory/") && text) {
          // Normalize URL
          let fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;

          // Remove trailing slash for consistency
          fullUrl = fullUrl.replace(/\/$/, "");

          subcategories.push({
            name: text,
            url: fullUrl,
            slug: fullUrl.split("/crew-directory/")[1] || "",
          });
        }
      });
      break; // Stop after finding the first matching selector
    }
  }

  // Remove duplicates
  const unique = [];
  const seen = new Set();
  for (const cat of subcategories) {
    if (!seen.has(cat.url)) {
      seen.add(cat.url);
      unique.push(cat);
    }
  }

  return unique;
}

// Extract freelancer links from a leaf category page
function extractFreelancers($) {
  const freelancers = [];

  // Look for freelancer profile links
  const selectors = [
    'a[href*="/freelancer/"]',
    'a[href*="/profile/"]',
    'a[href*="/member/"]',
    ".freelancer-card a",
    ".crew-member a",
  ];

  for (const selector of selectors) {
    const links = $(selector);
    if (links.length > 0) {
      links.each((i, elem) => {
        const href = $(elem).attr("href");
        const text = $(elem).text().trim();

        if (href && text) {
          let fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;

          freelancers.push({
            name: text,
            url: fullUrl,
          });
        }
      });
      break;
    }
  }

  return freelancers;
}

// Recursively scrape category hierarchy
async function scrapeCategory(url, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) {
    console.log(`Max depth reached for ${url}`);
    return null;
  }

  // Add delay to avoid overwhelming the server
  if (depth > 0) {
    await delay(1000 + Math.random() * 1000); // 1-2 second delay
  }

  const $ = await fetchPage(url);
  if (!$) return null;

  const slug = url.split("/crew-directory/")[1] || "root";
  const title = $("h1").first().text().trim() || slug;

  const category = {
    name: title,
    slug: slug,
    url: url,
    subcategories: [],
    freelancers: [],
  };

  // Try to find subcategories
  const subcategories = extractSubcategories($);

  if (subcategories.length > 0) {
    console.log(`Found ${subcategories.length} subcategories in ${slug}`);

    // Recursively scrape each subcategory
    for (const subcat of subcategories) {
      const subcategoryData = await scrapeCategory(
        subcat.url,
        depth + 1,
        maxDepth
      );
      if (subcategoryData) {
        category.subcategories.push(subcategoryData);
      }
    }
  } else {
    // This is likely a leaf node - look for freelancers
    const freelancers = extractFreelancers($);
    if (freelancers.length > 0) {
      console.log(`Found ${freelancers.length} freelancers in ${slug}`);
      category.freelancers = freelancers;
    } else {
      console.log(
        `No subcategories or freelancers found in ${slug} - might need to adjust selectors`
      );
    }
  }

  return category;
}

// Main execution
async function main() {
  console.log("Starting category hierarchy scrape...\n");

  // Start from the main crew directory page
  const hierarchy = await scrapeCategory(CREW_DIRECTORY_URL, 0, 3);

  if (hierarchy) {
    // Save the hierarchy
    const outputPath = "./category-hierarchy.json";
    await fs.writeFile(outputPath, JSON.stringify(hierarchy, null, 2));
    console.log(`\nCategory hierarchy saved to ${outputPath}`);

    // Also create a flattened version for reference
    const flattened = flattenHierarchy(hierarchy);
    await fs.writeFile(
      "./category-hierarchy-flat.json",
      JSON.stringify(flattened, null, 2)
    );
    console.log("Flattened version saved to category-hierarchy-flat.json");

    // Generate statistics
    const stats = generateStats(hierarchy);
    console.log("\nStatistics:");
    console.log(`Total categories: ${stats.totalCategories}`);
    console.log(`Total leaf categories: ${stats.leafCategories}`);
    console.log(`Total freelancers found: ${stats.totalFreelancers}`);
    console.log(`Max depth: ${stats.maxDepth}`);
  } else {
    console.log("Failed to scrape category hierarchy");
  }
}

// Flatten hierarchy for easier processing
function flattenHierarchy(category, parent = null, result = []) {
  const flat = {
    name: category.name,
    slug: category.slug,
    url: category.url,
    parent: parent,
    level: parent ? parent.level + 1 : 0,
    hasSubcategories: category.subcategories.length > 0,
    freelancerCount: category.freelancers.length,
  };

  result.push(flat);

  for (const subcat of category.subcategories) {
    flattenHierarchy(subcat, flat, result);
  }

  return result;
}

// Generate statistics about the hierarchy
function generateStats(
  category,
  depth = 0,
  stats = {
    totalCategories: 0,
    leafCategories: 0,
    totalFreelancers: 0,
    maxDepth: 0,
  }
) {
  stats.totalCategories++;
  stats.maxDepth = Math.max(stats.maxDepth, depth);

  if (category.subcategories.length === 0) {
    stats.leafCategories++;
  }

  stats.totalFreelancers += category.freelancers.length;

  for (const subcat of category.subcategories) {
    generateStats(subcat, depth + 1, stats);
  }

  return stats;
}

// Run the script
main().catch(console.error);
