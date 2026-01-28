import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CATEGORY_PAGES } from "./categoryPages.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const WP_URL = "https://freelancers.com.au/adminsuperlogin/";
const USERNAME = "info@freelancers.com.au";
const PASSWORD = "x^bS7LI6lS!sglqrIix4dRJJ";

const OUTPUT_DIR = path.join(__dirname, "output");
const PROGRESS_FILE = path.join(OUTPUT_DIR, "scraping_progress.json");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "freelancers_complete.json");
const LOG_FILE = path.join(OUTPUT_DIR, "scraping_log.txt");
const ERRORS_FILE = path.join(OUTPUT_DIR, "scraping_errors.json");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Logging helper
function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

// Save progress
function saveProgress(data) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

// Load progress
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
  }
  return {
    lastProcessedCategory: -1,
    processedFreelancers: new Set(),
    allFreelancers: [],
    errors: [],
  };
}

// Determine if PDF is CV or Equipment List
function categorizePDF(linkElement) {
  const linkText = linkElement.text.toLowerCase().trim();
  const href = linkElement.href.toLowerCase();
  const filename = href.split("/").pop();

  // Check link text first
  if (
    linkText.includes("equipment") ||
    linkText.includes("gear") ||
    linkText.includes("kit")
  ) {
    return "equipment";
  }

  if (
    linkText.includes("resume") ||
    linkText.includes("cv") ||
    linkText.includes("curriculum")
  ) {
    return "cv";
  }

  // Check filename patterns
  if (
    filename.includes("equip") ||
    filename.includes("gear") ||
    filename.includes("kit")
  ) {
    return "equipment";
  }

  if (filename.includes("cv") || filename.includes("resume")) {
    return "cv";
  }

  // Default to CV if it's a PDF and we can't determine
  return "cv";
}

// Extract email from bio or other sources
function extractEmail(bioText) {
  if (!bioText) return null;
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
  const matches = bioText.match(emailRegex);
  return matches ? matches[0] : null;
}

// Clean and validate URLs
function cleanUrl(url) {
  if (!url) return null;
  try {
    // Remove trailing slashes and query parameters for consistency
    return url.split("?")[0].replace(/\/$/, "");
  } catch (e) {
    return url;
  }
}

// Main scraping function
async function scrapeFreelancers() {
  log("=".repeat(60), "INFO");
  log("COMPREHENSIVE FREELANCER SCRAPER", "INFO");
  log("=".repeat(60), "INFO");

  // Load previous progress
  const progress = loadProgress();
  const processedSlugs = new Set(progress.processedFreelancers);
  let allFreelancers = progress.allFreelancers || [];
  const errors = progress.errors || [];

  log(`Starting from category index: ${progress.lastProcessedCategory + 1}`);
  log(`Already processed freelancers: ${processedSlugs.size}`);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Login if needed
    log("Attempting to log in to WordPress...");
    try {
      await page.goto(WP_URL, { waitUntil: "networkidle2", timeout: 30000 });

      // Check if login form exists
      const loginFormExists = await page.$("#user_login");

      if (loginFormExists) {
        await page.type("#user_login", USERNAME);
        await page.type("#user_pass", PASSWORD);
        await page.click("#wp-submit");
        await page.waitForNavigation({ timeout: 15000 });
        log("Successfully logged in", "SUCCESS");
      } else {
        log("Already logged in or login not required", "INFO");
      }
    } catch (error) {
      log(`Login warning: ${error.message}`, "WARN");
    }

    // Process each category page
    for (
      let catIndex = progress.lastProcessedCategory + 1;
      catIndex < CATEGORY_PAGES.length;
      catIndex++
    ) {
      const categoryUrl = CATEGORY_PAGES[catIndex];
      const categorySlug = categoryUrl
        .split("/")
        .filter((s) => s)
        .pop();

      log(`\n${"=".repeat(60)}`);
      log(
        `[${catIndex + 1}/${CATEGORY_PAGES.length}] Processing: ${categorySlug}`
      );
      log(`URL: ${categoryUrl}`);
      log("=".repeat(60));

      try {
        await page.goto(categoryUrl, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        // Wait for modals to load
        await page.waitForSelector(".modal", { timeout: 10000 });

        // Extract freelancer data from all modals on the page
        const freelancersOnPage = await page.evaluate(() => {
          const crew = [];
          const modals = document.querySelectorAll(".modal");

          modals.forEach((modal) => {
            const data = {
              name: "",
              slug: "",
              bio: "",
              email: null,
              image_url: null,
              image_url_original: null,
              image_filename: null,
              image_alt: "",
              cv_url: null,
              cv_filename: null,
              equipment_url: null,
              equipment_filename: null,
              website: null,
              instagram: null,
              imdb: null,
              linkedin: null,
              categories: [],
              raw_html: null, // For debugging
            };

            try {
              // Extract name
              const nameElement = modal.querySelector(".crew-profile h2");
              if (nameElement) {
                data.name = nameElement.textContent.trim();
              }

              // Extract slug from modal ID
              const modalId = modal.id;
              if (modalId && modalId.includes("modalProfile-")) {
                data.slug = modalId.replace("modalProfile-", "");
              }

              // Extract bio
              const bioElement = modal.querySelector(".crew-profile p");
              if (bioElement) {
                data.bio = bioElement.textContent.trim();
              }

              // Extract image with multiple fallback methods
              const imageSelectors = [
                "img",
                ".img-fluid",
                ".crew-profile img",
                ".modal-body img",
                "[data-src]",
              ];

              let imageElement = null;
              for (const selector of imageSelectors) {
                imageElement = modal.querySelector(selector);
                if (imageElement) break;
              }

              if (imageElement) {
                let imgUrl =
                  imageElement.src ||
                  imageElement.getAttribute("data-src") ||
                  imageElement.getAttribute("data-lazy-src") ||
                  imageElement.getAttribute("data-original") ||
                  imageElement.currentSrc;

                // Check srcset for highest resolution
                const srcset =
                  imageElement.srcset ||
                  imageElement.getAttribute("data-srcset");
                if (srcset) {
                  const srcsetUrls = srcset
                    .split(",")
                    .map((s) => s.trim().split(" ")[0])
                    .filter((url) => url);
                  if (srcsetUrls.length > 0) {
                    imgUrl = srcsetUrls[srcsetUrls.length - 1];
                  }
                }

                if (imgUrl && imgUrl.startsWith("http")) {
                  data.image_url = imgUrl.split("?")[0];
                  data.image_alt =
                    imageElement.alt || imageElement.getAttribute("alt") || "";

                  // Extract filename
                  const urlParts = data.image_url.split("/");
                  data.image_filename = urlParts[urlParts.length - 1];

                  // Get original full-size URL
                  data.image_url_original = data.image_url
                    .replace(/-\d+x\d+\.(jpg|jpeg|png|gif|webp)$/i, ".$1")
                    .replace(/-scaled\.(jpg|jpeg|png|gif|webp)$/i, ".$1");
                }
              }

              // Extract all links and categorize them
              const links = modal.querySelectorAll("a");
              const pdfLinks = [];
              const socialLinks = [];

              links.forEach((link) => {
                const href = link.href;
                const text = link.textContent.trim().toLowerCase();

                if (!href) return;

                // Categorize PDFs
                if (href.toLowerCase().endsWith(".pdf")) {
                  pdfLinks.push({
                    href: href,
                    text: text,
                    element: link,
                  });
                }
                // Social media and website links
                else if (href.includes("instagram.com")) {
                  socialLinks.push({ type: "instagram", href: href });
                } else if (href.includes("imdb.com")) {
                  socialLinks.push({ type: "imdb", href: href });
                } else if (href.includes("linkedin.com")) {
                  socialLinks.push({ type: "linkedin", href: href });
                } else if (
                  (text.includes("website") ||
                    text.includes("portfolio") ||
                    href.includes(".com")) &&
                  !href.includes("freelancers.com.au")
                ) {
                  if (!socialLinks.some((l) => l.type === "website")) {
                    socialLinks.push({ type: "website", href: href });
                  }
                }
              });

              // Process PDF links - differentiate CV from Equipment List
              pdfLinks.forEach((pdfLink) => {
                const linkText = pdfLink.text.toLowerCase();
                const href = pdfLink.href.toLowerCase();
                const filename = href.split("/").pop();

                // Determine type
                let type = "cv"; // Default

                // Check link text
                if (
                  linkText.includes("equipment") ||
                  linkText.includes("gear") ||
                  linkText.includes("kit")
                ) {
                  type = "equipment";
                } else if (
                  linkText.includes("resume") ||
                  linkText.includes("cv")
                ) {
                  type = "cv";
                }
                // Check filename if text is ambiguous
                else if (
                  filename.includes("equip") ||
                  filename.includes("gear") ||
                  filename.includes("kit")
                ) {
                  type = "equipment";
                }

                // Assign to appropriate field
                if (type === "equipment") {
                  if (!data.equipment_url) {
                    // Only take first equipment list found
                    data.equipment_url = pdfLink.href;
                    data.equipment_filename = filename;
                  }
                } else {
                  if (!data.cv_url) {
                    // Only take first CV found
                    data.cv_url = pdfLink.href;
                    data.cv_filename = filename;
                  }
                }
              });

              // Process social links
              socialLinks.forEach((link) => {
                if (link.type === "instagram" && !data.instagram) {
                  data.instagram = link.href;
                } else if (link.type === "imdb" && !data.imdb) {
                  data.imdb = link.href;
                } else if (link.type === "linkedin" && !data.linkedin) {
                  data.linkedin = link.href;
                } else if (link.type === "website" && !data.website) {
                  data.website = link.href;
                }
              });

              // Store raw HTML for debugging
              data.raw_html = modal.innerHTML.substring(0, 500); // First 500 chars
            } catch (error) {
              console.error(`Error processing modal: ${error.message}`);
            }

            // Only add if we have at least a name or slug
            if (data.name || data.slug) {
              crew.push(data);
            }
          });

          return crew;
        });

        log(`Found ${freelancersOnPage.length} freelancers on page`);

        // Process each freelancer
        for (const freelancer of freelancersOnPage) {
          // Skip if already processed
          if (processedSlugs.has(freelancer.slug)) {
            log(`Skipping already processed: ${freelancer.name}`, "INFO");
            continue;
          }

          // Add category to this freelancer
          freelancer.categories = [categorySlug];

          // Try to extract email from bio if not found
          if (!freelancer.email && freelancer.bio) {
            freelancer.email = extractEmail(freelancer.bio);
          }

          // Log what we found
          const foundItems = [];
          if (freelancer.image_url) foundItems.push("Photo");
          if (freelancer.cv_url) foundItems.push("CV");
          if (freelancer.equipment_url) foundItems.push("Equipment List");
          if (freelancer.bio) foundItems.push("Bio");
          if (freelancer.email) foundItems.push("Email");
          if (freelancer.website) foundItems.push("Website");
          if (freelancer.instagram) foundItems.push("Instagram");
          if (freelancer.imdb) foundItems.push("IMDB");
          if (freelancer.linkedin) foundItems.push("LinkedIn");

          log(
            `  ✓ ${freelancer.name} (${freelancer.slug}): ${
              foundItems.length > 0 ? foundItems.join(", ") : "Minimal data"
            }`
          );

          // Track missing data
          const missingItems = [];
          if (!freelancer.image_url) missingItems.push("Photo");
          if (!freelancer.cv_url) missingItems.push("CV");
          if (!freelancer.bio) missingItems.push("Bio");

          if (missingItems.length > 0) {
            log(`    ⚠ Missing: ${missingItems.join(", ")}`, "WARN");
            errors.push({
              name: freelancer.name,
              slug: freelancer.slug,
              category: categorySlug,
              missing: missingItems,
            });
          }

          // Check if freelancer already exists (from another category)
          const existingIndex = allFreelancers.findIndex(
            (f) => f.slug === freelancer.slug
          );

          if (existingIndex >= 0) {
            // Merge categories
            allFreelancers[existingIndex].categories = [
              ...new Set([
                ...allFreelancers[existingIndex].categories,
                ...freelancer.categories,
              ]),
            ];
            log(
              `  → Merged with existing (${allFreelancers[existingIndex].categories.length} categories total)`,
              "INFO"
            );
          } else {
            // Add new freelancer
            allFreelancers.push(freelancer);
            processedSlugs.add(freelancer.slug);
          }
        }

        // Save progress after each category
        progress.lastProcessedCategory = catIndex;
        progress.processedFreelancers = Array.from(processedSlugs);
        progress.allFreelancers = allFreelancers;
        progress.errors = errors;
        saveProgress(progress);

        log(
          `Progress saved. Total unique freelancers: ${allFreelancers.length}`
        );

        // Be nice to the server
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        log(`Error processing ${categorySlug}: ${error.message}`, "ERROR");
        errors.push({
          category: categorySlug,
          url: categoryUrl,
          error: error.message,
        });
      }
    }

    // Final save
    log("\n" + "=".repeat(60));
    log("SCRAPING COMPLETE", "SUCCESS");
    log("=".repeat(60));

    // Generate statistics
    const stats = {
      total_freelancers: allFreelancers.length,
      with_photo: allFreelancers.filter((f) => f.image_url).length,
      with_cv: allFreelancers.filter((f) => f.cv_url).length,
      with_equipment: allFreelancers.filter((f) => f.equipment_url).length,
      with_bio: allFreelancers.filter((f) => f.bio).length,
      with_email: allFreelancers.filter((f) => f.email).length,
      with_website: allFreelancers.filter((f) => f.website).length,
      with_instagram: allFreelancers.filter((f) => f.instagram).length,
      with_imdb: allFreelancers.filter((f) => f.imdb).length,
      with_linkedin: allFreelancers.filter((f) => f.linkedin).length,
      missing_photo: allFreelancers.filter((f) => !f.image_url).length,
      missing_cv: allFreelancers.filter((f) => !f.cv_url).length,
      missing_bio: allFreelancers.filter((f) => !f.bio).length,
      total_errors: errors.length,
    };

    // Save final output
    const finalOutput = {
      scraped_at: new Date().toISOString(),
      total_freelancers: allFreelancers.length,
      statistics: stats,
      freelancers: allFreelancers,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalOutput, null, 2));
    log(`\n✓ Saved complete data to: ${OUTPUT_FILE}`);

    // Save errors separately
    if (errors.length > 0) {
      fs.writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2));
      log(`✓ Saved ${errors.length} errors to: ${ERRORS_FILE}`);
    }

    // Display statistics
    log("\n" + "=".repeat(60));
    log("STATISTICS", "INFO");
    log("=".repeat(60));
    log(`Total Freelancers:     ${stats.total_freelancers}`);
    log(`With Photo:            ${stats.with_photo}`);
    log(`With CV:               ${stats.with_cv}`);
    log(`With Equipment List:   ${stats.with_equipment}`);
    log(`With Bio:              ${stats.with_bio}`);
    log(`With Email:            ${stats.with_email}`);
    log(`With Website:          ${stats.with_website}`);
    log(`With Instagram:        ${stats.with_instagram}`);
    log(`With IMDB:             ${stats.with_imdb}`);
    log(`With LinkedIn:         ${stats.with_linkedin}`);
    log(`Missing Photo:         ${stats.missing_photo}`);
    log(`Missing CV:            ${stats.missing_cv}`);
    log(`Missing Bio:           ${stats.missing_bio}`);
    log(`Total Errors/Warnings: ${stats.total_errors}`);

    // Show sample freelancers with equipment lists
    const withEquipment = allFreelancers.filter((f) => f.equipment_url);
    if (withEquipment.length > 0) {
      log("\n" + "=".repeat(60));
      log("SAMPLE FREELANCERS WITH EQUIPMENT LISTS", "INFO");
      log("=".repeat(60));
      withEquipment.slice(0, 5).forEach((f) => {
        log(`${f.name} (${f.slug})`);
        log(`  CV: ${f.cv_filename || "N/A"}`);
        log(`  Equipment: ${f.equipment_filename}`);
      });
    }

    // Clean up progress file
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
      log("\n✓ Cleaned up progress file");
    }
  } catch (error) {
    log(`FATAL ERROR: ${error.message}`, "ERROR");
    log(error.stack, "ERROR");
  } finally {
    await browser.close();
    log("\n✓ Browser closed");
    log("=".repeat(60));
  }
}

// Run the scraper
scrapeFreelancers().catch((error) => {
  log(`Unhandled error: ${error.message}`, "ERROR");
  console.error(error);
});
