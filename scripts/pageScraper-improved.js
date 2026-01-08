import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CATEGORY_PAGES } from "./categoryPages.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WP_URL = "https://freelancers.com.au/adminsuperlogin/";
const USERNAME = "info@freelancers.com.au";
const PASSWORD = "x^bS7LI6lS!sglqrIix4dRJJ";

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Login (if needed)
  try {
    await page.goto(WP_URL);
    await page.type("#user_login", USERNAME);
    await page.type("#user_pass", PASSWORD);
    await page.click("#wp-submit");
    await page.waitForNavigation();
    console.log("✓ Logged in");
  } catch (error) {
    console.log("ℹ Login not required, continuing...");
  }

  let allCrewData = [];

  for (const categoryUrl of CATEGORY_PAGES) {
    console.log(`\n📋 Scraping ${categoryUrl}...`);

    try {
      await page.goto(categoryUrl, { waitUntil: "networkidle2" });

      // Wait for crew cards to load
      await page.waitForSelector(".crew-item, .modal", { timeout: 10000 });

      // Extract all modal IDs/data-targets from the page
      const modalData = await page.evaluate(() => {
        const crew = [];

        // Find all modals on the page
        const modals = document.querySelectorAll(".modal");

        modals.forEach((modal) => {
          const data = {
            name: "",
            slug: "",
            bio: "",
            image_url: "",
            image_url_original: "",
            image_filename: "",
            image_alt: "",
            resume_url: "",
            resume_filename: "",
            website: "",
            instagram: "",
            imdb: "",
            linkedin: "",
            categories: [],
          };

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

          // ============================================
          // IMPROVED IMAGE EXTRACTION
          // ============================================
          // Try multiple selectors to find the image
          const imageElement =
            modal.querySelector("img") ||
            modal.querySelector(".img-fluid") ||
            modal.querySelector(".crew-profile img") ||
            modal.querySelector(".modal-body img");

          if (imageElement) {
            // Try multiple attributes (handles lazy loading)
            let imgUrl =
              imageElement.src ||
              imageElement.getAttribute("data-src") ||
              imageElement.getAttribute("data-lazy-src") ||
              imageElement.getAttribute("data-original") ||
              imageElement.currentSrc;

            // Check for srcset (responsive images)
            const srcset =
              imageElement.srcset || imageElement.getAttribute("data-srcset");
            if (srcset) {
              // Get all URLs from srcset and pick the largest
              const srcsetUrls = srcset
                .split(",")
                .map((s) => s.trim().split(" ")[0])
                .filter((url) => url);
              if (srcsetUrls.length > 0) {
                imgUrl = srcsetUrls[srcsetUrls.length - 1];
              }
            }

            if (imgUrl) {
              // Clean URL - remove query parameters
              data.image_url = imgUrl.split("?")[0];
              data.image_alt =
                imageElement.alt || imageElement.getAttribute("alt") || "";

              // Extract filename
              const urlParts = data.image_url.split("/");
              data.image_filename = urlParts[urlParts.length - 1];

              // Get original full-size URL by removing WordPress size suffixes
              // e.g., image-300x300.jpg -> image.jpg
              // e.g., image-scaled.jpg -> image.jpg
              data.image_url_original = data.image_url
                .replace(/-\d+x\d+\.(jpg|jpeg|png|gif|webp)$/i, ".$1")
                .replace(/-scaled\.(jpg|jpeg|png|gif|webp)$/i, ".$1");

              console.log(`Found image: ${data.image_filename}`);
            } else {
              console.warn(`Image element found but no URL for: ${data.name}`);
            }
          } else {
            console.warn(`No image found for: ${data.name}`);
          }
          // ============================================
          // END IMPROVED IMAGE EXTRACTION
          // ============================================

          // Extract links
          const links = modal.querySelectorAll(".crew-data a, a");
          links.forEach((link) => {
            const href = link.href;
            const text = link.textContent.trim().toLowerCase();

            if (text.includes("resume") || href.includes(".pdf")) {
              data.resume_url = href;
              // Extract resume filename
              const resumeParts = href.split("/");
              data.resume_filename =
                resumeParts[resumeParts.length - 1].split("?")[0];
            } else if (href.includes("instagram")) {
              data.instagram = href;
            } else if (href.includes("imdb")) {
              data.imdb = href;
            } else if (href.includes("linkedin")) {
              data.linkedin = href;
            } else if (
              text.includes("website") ||
              href.includes("portfolio") ||
              (href.includes(".com") && !href.includes("freelancers.com.au"))
            ) {
              if (!data.website) {
                // Only set if not already set
                data.website = href;
              }
            }
          });

          crew.push(data);
        });

        return crew;
      });

      console.log(`  Found ${modalData.length} crew members`);

      // Add category info to each crew member
      const categoryName = categoryUrl
        .split("/")
        .filter((s) => s)
        .pop();
      modalData.forEach((crew) => {
        crew.categories.push(categoryName);
      });

      allCrewData.push(...modalData);
    } catch (error) {
      console.error(`  ✗ Error scraping ${categoryUrl}:`, error.message);
    }

    // Be nice to the server
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Remove duplicates (same person might be in multiple categories)
  const uniqueCrew = allCrewData.reduce((acc, current) => {
    const existing = acc.find((item) => item.slug === current.slug);
    if (existing) {
      // Merge categories
      existing.categories = [
        ...new Set([...existing.categories, ...current.categories]),
      ];
    } else {
      acc.push(current);
    }
    return acc;
  }, []);

  // Save to file
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const outputFile = path.join(outputDir, "crew_complete_data.json");
  fs.writeFileSync(outputFile, JSON.stringify(uniqueCrew, null, 2));

  // Create summary stats
  const stats = {
    total: uniqueCrew.length,
    with_image: uniqueCrew.filter((c) => c.image_url).length,
    with_resume: uniqueCrew.filter((c) => c.resume_url).length,
    with_both: uniqueCrew.filter((c) => c.image_url && c.resume_url).length,
    missing_image: uniqueCrew.filter((c) => !c.image_url).length,
    missing_resume: uniqueCrew.filter((c) => !c.resume_url).length,
  };

  console.log(
    `\n✅ Saved ${uniqueCrew.length} unique crew members to crew_complete_data.json`
  );
  console.log("\n📊 Summary:");
  console.log(`   Total crew: ${stats.total}`);
  console.log(`   With image: ${stats.with_image}`);
  console.log(`   With resume: ${stats.with_resume}`);
  console.log(`   With both: ${stats.with_both}`);
  console.log(`   Missing image: ${stats.missing_image}`);
  console.log(`   Missing resume: ${stats.missing_resume}`);

  await browser.close();
  console.log("🎉 All done!");
})();
