import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_FILE = path.join(__dirname, "crew_lists_full.json");

/**
 * Analyze the current scraped data to identify issues
 */
function analyzeData() {
  console.log("=================================");
  console.log("DATA ANALYSIS");
  console.log("=================================\n");

  if (!fs.existsSync(DATA_FILE)) {
    console.error("Error: crew_lists_full.json not found!");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  console.log(`Total records: ${data.length}\n`);

  // Analyze featured images
  const withFeaturedImageId = data.filter((d) => d.featured_image_id !== null);
  const withFeaturedImageUrl = data.filter(
    (d) => d.featured_image_url !== null
  );

  console.log("FEATURED IMAGES:");
  console.log(`  With image ID: ${withFeaturedImageId.length}`);
  console.log(`  With image URL: ${withFeaturedImageUrl.length}`);
  console.log(`  Missing both: ${data.length - withFeaturedImageId.length}\n`);

  // Analyze resumes
  const withResumeId = data.filter((d) => d.custom_fields?.resume);
  const withResumeUrl = data.filter((d) => {
    const resume = d.custom_fields?.resume;
    return resume && (resume.startsWith("http") || resume.includes(".pdf"));
  });

  console.log("RESUMES:");
  console.log(`  With resume ID: ${withResumeId.length}`);
  console.log(`  With resume URL: ${withResumeUrl.length}`);
  console.log(
    `  Resume IDs that need resolution: ${
      withResumeId.length - withResumeUrl.length
    }\n`
  );

  // Show examples of resume IDs that need resolution
  console.log("EXAMPLES - Resume IDs that need URL resolution:");
  const examplesWithResumeId = data
    .filter((d) => {
      const resume = d.custom_fields?.resume;
      return resume && !resume.startsWith("http") && resume.match(/^\d+$/);
    })
    .slice(0, 5);

  examplesWithResumeId.forEach((ex) => {
    console.log(`  - ${ex.title} (ID: ${ex.post_id})`);
    console.log(`    Resume ID: ${ex.custom_fields.resume}`);
  });

  // Analyze categories
  const allCategories = new Set();
  data.forEach((d) => {
    d.categories?.forEach((cat) => allCategories.add(cat));
  });

  console.log(`\nUNIQUE CATEGORIES: ${allCategories.size}`);
  console.log(Array.from(allCategories).sort().join(", "));

  // Data completeness
  console.log("\nDATA COMPLETENESS:");
  console.log(`  With content: ${data.filter((d) => d.content).length}`);
  console.log(`  With excerpt: ${data.filter((d) => d.excerpt).length}`);
  console.log(
    `  With website: ${data.filter((d) => d.custom_fields?.website).length}`
  );
  console.log(
    `  With instagram: ${data.filter((d) => d.custom_fields?.instagram).length}`
  );

  // ACF fields check
  const withAcf = data.filter(
    (d) => Object.keys(d.acf_fields || {}).length > 0
  );
  console.log(`  With ACF fields: ${withAcf.length}`);

  if (withAcf.length > 0) {
    console.log("\n  ACF field keys found:");
    const acfKeys = new Set();
    withAcf.forEach((d) => {
      Object.keys(d.acf_fields).forEach((key) => acfKeys.add(key));
    });
    console.log(`    ${Array.from(acfKeys).join(", ")}`);
  }

  // Find completely empty records
  const emptyRecords = data.filter(
    (d) =>
      !d.content &&
      !d.excerpt &&
      !d.featured_image_id &&
      !d.custom_fields?.website &&
      !d.custom_fields?.instagram &&
      !d.custom_fields?.resume
  );

  console.log(`\nCOMPLETELY EMPTY RECORDS: ${emptyRecords.length}`);
  if (emptyRecords.length > 0 && emptyRecords.length <= 10) {
    console.log("Examples:");
    emptyRecords.slice(0, 5).forEach((r) => {
      console.log(`  - ${r.title} (ID: ${r.post_id})`);
    });
  }

  // Recommendations
  console.log("\n=================================");
  console.log("RECOMMENDATIONS");
  console.log("=================================");

  if (withFeaturedImageUrl.length === 0 && withFeaturedImageId.length === 0) {
    console.log("❌ CRITICAL: No featured images found!");
    console.log("   → The scraper is not capturing image data");
    console.log("   → Use improved-scraper.js to fetch actual URLs");
  }

  if (withResumeId.length > 0 && withResumeUrl.length === 0) {
    console.log("❌ CRITICAL: Resume IDs found but no URLs!");
    console.log(`   → ${withResumeId.length} resumes need URL resolution`);
    console.log("   → Use improved-scraper.js to resolve attachment IDs");
  }

  if (emptyRecords.length > data.length * 0.1) {
    console.log(
      `⚠️  WARNING: ${emptyRecords.length} records are completely empty`
    );
    console.log("   → Consider filtering these out or investigating");
  }

  console.log("\n✅ NEXT STEPS:");
  console.log("   1. Run: node improved-scraper.js");
  console.log("   2. Run: node download-media.js");
  console.log("   3. Upload to Azure Blob Storage");
  console.log("\n=================================\n");
}

analyzeData();
