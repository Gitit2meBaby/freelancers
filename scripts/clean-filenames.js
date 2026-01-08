import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, "output", "crew_complete_data.json");
const OUTPUT_JSON = path.join(__dirname, "output", "crew_cleaned_data.json");
const OUTPUT_CSV = path.join(__dirname, "output", "crew_cleaned_data.csv");

/**
 * Get file extension from filename
 */
function getExtension(filename) {
  if (!filename) return "";
  const match = filename.match(/\.(jpg|jpeg|png|gif|webp|pdf)$/i);
  return match ? match[0].toLowerCase() : "";
}

/**
 * Create clean filename from slug
 */
function createCleanFilename(slug, originalFilename, type = "image") {
  const ext = getExtension(originalFilename);

  if (!ext) {
    console.warn(`⚠ No extension found for: ${originalFilename}`);
    return "";
  }

  // Sanitize slug (should already be clean, but just in case)
  const cleanSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "");

  // Format: slug.ext (e.g., "eric-trigg.jpg" or "eric-trigg.pdf")
  return `${cleanSlug}${ext}`;
}

/**
 * Main processing function
 */
function processCrewData() {
  console.log("🔧 Processing crew data...\n");

  // Load input data
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Error: ${INPUT_FILE} not found!`);
    console.error("Make sure you run pageScraper.js first.");
    process.exit(1);
  }

  const crewData = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  console.log(`📊 Loaded ${crewData.length} crew members\n`);

  // Process each crew member
  const cleanedData = crewData.map((crew, index) => {
    // Create clean filenames
    const clean_image_filename = crew.image_filename
      ? createCleanFilename(crew.slug, crew.image_filename, "image")
      : "";

    const clean_resume_filename = crew.resume_filename
      ? createCleanFilename(crew.slug, crew.resume_filename, "resume")
      : "";

    // Log progress every 100 items
    if ((index + 1) % 100 === 0) {
      console.log(`  Processed ${index + 1}/${crewData.length}...`);
    }

    return {
      ...crew, // Keep all original fields
      clean_image_filename,
      clean_resume_filename,
    };
  });

  console.log(`✅ Processed all ${cleanedData.length} crew members\n`);

  // Generate statistics
  const stats = {
    total: cleanedData.length,
    with_image: cleanedData.filter((c) => c.image_url).length,
    with_resume: cleanedData.filter((c) => c.resume_url).length,
    with_clean_image: cleanedData.filter((c) => c.clean_image_filename).length,
    with_clean_resume: cleanedData.filter((c) => c.clean_resume_filename)
      .length,
    missing_image: cleanedData.filter((c) => !c.image_url).length,
    missing_resume: cleanedData.filter((c) => !c.resume_url).length,
  };

  // Save JSON
  console.log("💾 Saving JSON file...");
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cleanedData, null, 2));
  console.log(`✅ Saved: ${OUTPUT_JSON}\n`);

  // Create CSV
  console.log("💾 Creating CSV file...");
  const csvData = createCSV(cleanedData);
  fs.writeFileSync(OUTPUT_CSV, csvData);
  console.log(`✅ Saved: ${OUTPUT_CSV}\n`);

  // Display statistics
  console.log("📊 STATISTICS");
  console.log("═══════════════════════════════");
  console.log(`Total crew members:        ${stats.total}`);
  console.log(`With original image:       ${stats.with_image}`);
  console.log(`With clean image filename: ${stats.with_clean_image}`);
  console.log(`With original resume:      ${stats.with_resume}`);
  console.log(`With clean resume filename: ${stats.with_clean_resume}`);
  console.log(`Missing image:             ${stats.missing_image}`);
  console.log(`Missing resume:            ${stats.missing_resume}`);

  // Show some examples
  console.log("\n📝 EXAMPLE TRANSFORMATIONS");
  console.log("═══════════════════════════════");
  const examples = cleanedData
    .filter((c) => c.image_filename || c.resume_filename)
    .slice(0, 5);

  examples.forEach((ex) => {
    console.log(`\n${ex.name} (${ex.slug})`);
    if (ex.image_filename) {
      console.log(`  Image: ${ex.image_filename}`);
      console.log(`      → ${ex.clean_image_filename}`);
    }
    if (ex.resume_filename) {
      console.log(`  Resume: ${ex.resume_filename}`);
      console.log(`       → ${ex.clean_resume_filename}`);
    }
  });

  console.log("\n✨ Done!\n");
}

/**
 * Create CSV from crew data
 */
function createCSV(crewData) {
  // Define CSV columns
  const columns = [
    "name",
    "slug",
    "bio",
    "categories",
    "image_url",
    "image_filename",
    "clean_image_filename",
    "resume_url",
    "resume_filename",
    "clean_resume_filename",
    "website",
    "instagram",
    "imdb",
    "linkedin",
  ];

  // Create header row
  const header = columns.join(",");

  // Create data rows
  const rows = crewData.map((crew) => {
    return columns
      .map((col) => {
        let value = crew[col];

        // Handle arrays (categories)
        if (Array.isArray(value)) {
          value = value.join("; ");
        }

        // Handle undefined/null
        if (value === undefined || value === null) {
          value = "";
        }

        // Convert to string
        value = String(value);

        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (
          value.includes(",") ||
          value.includes('"') ||
          value.includes("\n")
        ) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }

        return value;
      })
      .join(",");
  });

  return [header, ...rows].join("\n");
}

// Run the script
processCrewData();
