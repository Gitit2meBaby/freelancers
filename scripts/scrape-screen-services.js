import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import { existsSync } from "fs"; // ← ADD THIS

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://freelancers.com.au";
const SERVICES_URL = `${BASE_URL}/screen-services/`;
const LOGOS_DIR = path.join(__dirname, "logos");

// Helper to delay between requests
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Download an image
async function downloadImage(imageUrl, filename) {
  // ← ADD THIS CHECK
  const filePath = path.join(LOGOS_DIR, filename);
  if (existsSync(filePath)) {
    console.log(`⊘ Already exists: ${filename}`);
    return filename;
  }

  return new Promise((resolve, reject) => {
    console.log(`Downloading image: ${filename}`);

    const file = fs.open(filePath, "w");

    https
      .get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          console.error(
            `Failed to download ${imageUrl}: HTTP ${response.statusCode}`
          );
          resolve(null);
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", async () => {
          try {
            await fs.writeFile(filePath, Buffer.concat(chunks));
            console.log(`✓ Downloaded: ${filename}`);
            resolve(filename);
          } catch (error) {
            console.error(`Error saving ${filename}:`, error.message);
            resolve(null);
          }
        });
      })
      .on("error", (error) => {
        console.error(`Error downloading ${imageUrl}:`, error.message);
        resolve(null);
      });
  });
}

// Main scraping function
async function scrapeScreenServices() {
  console.log("Starting screen services scrape with Puppeteer...\n");

  // Create logos directory
  try {
    await fs.mkdir(LOGOS_DIR, { recursive: true });
    console.log(`Created logos directory at ${LOGOS_DIR}\n`);
  } catch (error) {
    console.error("Error creating logos directory:", error.message);
  }

  // Load existing data
  let allServices;
  const outputPath = "./screen-services-data.json";

  if (existsSync(outputPath)) {
    console.log("✓ Found existing data - will skip completed services\n");
    const existingData = await fs.readFile(outputPath, "utf-8");
    allServices = JSON.parse(existingData);
    allServices.lastUpdated = new Date().toISOString();
  } else {
    console.log("Starting fresh scrape\n");
    allServices = {
      scrapedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      services: [],
    };
  }

  // Launch browser
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    console.log(`Navigating to ${SERVICES_URL}...`);
    await page.goto(SERVICES_URL, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for content to load
    await delay(2000);

    // Extract service categories
    console.log("Extracting service categories...\n");
    const categories = await page.evaluate(() => {
      const cats = [];
      const serviceTiles = document.querySelectorAll(".tile--service-dir");

      serviceTiles.forEach((tile) => {
        const categoryName = tile.textContent.trim();

        // Find the link - could be parent or nearby
        let link = tile.closest("a");
        if (!link) {
          link = tile.parentElement.querySelector("a");
        }

        if (link && categoryName) {
          cats.push({
            name: categoryName,
            url: link.href,
            slug:
              link.href.split("/screen-services/")[1]?.replace(/\/$/, "") ||
              categoryName.toLowerCase().replace(/\s+/g, "-"),
          });
        }
      });

      return cats;
    });

    // Filter out completed service categories
    const completedSlugs = new Set(
      allServices.services
        .filter((cat) => !cat.error && cat.providerCount > 0)
        .map((cat) => cat.slug)
    );

    const categoriesToProcess = categories.filter(
      (cat) => !completedSlugs.has(cat.slug)
    );

    console.log(`Found ${categories.length} total service categories`);
    console.log(`Already completed: ${completedSlugs.size}`);
    console.log(`To process: ${categoriesToProcess.length}\n`);

    if (categoriesToProcess.length === 0) {
      console.log("✓ All categories already completed!");
      await browser.close();
      return;
    }

    // Scrape each category
    for (let i = 0; i < categoriesToProcess.length; i++) {
      const category = categoriesToProcess[i];
      const overallIndex =
        categories.findIndex((c) => c.slug === category.slug) + 1;

      console.log(
        `\n[${overallIndex}/${categories.length}] Scraping: ${category.name}`
      );
      console.log(`URL: ${category.url}`);

      try {
        // Navigate to category page
        await page.goto(category.url, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        // Wait for content
        await delay(2000);

        // Extract service providers
        const providers = await page.evaluate((categorySlug) => {
          const provs = [];
          const serviceTiles = document.querySelectorAll(".tile--service-list");

          serviceTiles.forEach((tile) => {
            // Extract image
            const img = tile.querySelector("img");
            const imageUrl = img ? img.src : null;
            const imageAlt = img ? img.alt : "";

            // Extract title
            const h5 = tile.querySelector("h5");
            const title = h5 ? h5.textContent.trim() : "";

            // Extract link
            const link = tile.querySelector("a");
            const linkHref = link ? link.href : "";

            if (title && imageUrl) {
              // Generate safe filename
              const safeName = (imageAlt || title)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

              const urlParts = imageUrl.split(".");
              const ext =
                urlParts.length > 1
                  ? "." + urlParts[urlParts.length - 1].split("?")[0]
                  : ".png";
              const filename = `${categorySlug}-${safeName}${ext}`;

              provs.push({
                title,
                link: linkHref,
                imageUrl,
                imageFilename: filename,
              });
            }
          });

          return provs;
        }, category.slug);

        console.log(`Found ${providers.length} service providers`);

        // Download images
        for (const provider of providers) {
          await delay(300);
          const downloadedFilename = await downloadImage(
            provider.imageUrl,
            provider.imageFilename
          );
          provider.imageDownloaded = downloadedFilename !== null;
        }

        // Update or add service category
        const existingIndex = allServices.services.findIndex(
          (c) => c.slug === category.slug
        );
        const categoryData = {
          name: category.name,
          slug: category.slug,
          url: category.url,
          providerCount: providers.length,
          providers,
        };

        if (existingIndex >= 0) {
          allServices.services[existingIndex] = categoryData;
        } else {
          allServices.services.push(categoryData);
        }
      } catch (error) {
        console.error(`Error scraping ${category.name}:`, error.message);

        // Update or add error
        const existingIndex = allServices.services.findIndex(
          (c) => c.slug === category.slug
        );
        const errorData = {
          name: category.name,
          slug: category.slug,
          url: category.url,
          error: error.message,
          providers: [],
        };

        if (existingIndex >= 0) {
          allServices.services[existingIndex] = errorData;
        } else {
          allServices.services.push(errorData);
        }
      }

      // Delay between categories
      await delay(1500);
    }

    // Save results
    await fs.writeFile(outputPath, JSON.stringify(allServices, null, 2));
    console.log(`\n\n✓ Data saved to ${outputPath}`);

    // Generate statistics
    const totalProviders = allServices.services.reduce(
      (sum, cat) => sum + (cat.providerCount || 0),
      0
    );
    const totalImages = allServices.services.reduce(
      (sum, cat) => sum + cat.providers.filter((p) => p.imageDownloaded).length,
      0
    );

    console.log("\n=== STATISTICS ===");
    console.log(`Total service categories: ${allServices.services.length}`);
    console.log(`Total service providers: ${totalProviders}`);
    console.log(`Total images downloaded: ${totalImages}`);
    console.log(`Logos saved to: ${LOGOS_DIR}`);

    // Create a summary CSV
    const csvLines = [
      "Category,Title,Link,Image URL,Image Filename,Downloaded",
    ];
    allServices.services.forEach((cat) => {
      cat.providers.forEach((provider) => {
        const line = [
          cat.name,
          provider.title,
          provider.link,
          provider.imageUrl,
          provider.imageFilename,
          provider.imageDownloaded ? "Yes" : "No",
        ]
          .map((field) => `"${field}"`)
          .join(",");
        csvLines.push(line);
      });
    });

    await fs.writeFile("./screen-services-summary.csv", csvLines.join("\n"));
    console.log("✓ Summary CSV saved to screen-services-summary.csv\n");
  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    await browser.close();
  }
}

// Run the script
scrapeScreenServices().catch(console.error);
