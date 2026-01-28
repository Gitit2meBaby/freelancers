import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input files
const SCRAPED_DATA = path.join(
  __dirname,
  "output",
  "freelancers_complete.json",
);
const BLOB_MAPPING = path.join(
  __dirname,
  "downloaded_media_final",
  "blob_id_mapping.json",
);

// Output files
const OUTPUT_DIR = path.join(__dirname, "output");
const SQL_OUTPUT = path.join(OUTPUT_DIR, "import_freelancers.sql");
const CSV_OUTPUT = path.join(OUTPUT_DIR, "freelancers_for_import.csv");
const UNMATCHED_OUTPUT = path.join(OUTPUT_DIR, "unmatched_freelancers.json");

/**
 * This script helps you match scraped freelancer data with your existing database.
 *
 * IMPORTANT: Since we don't have access to your actual database FreelancerIDs,
 * this script generates SQL that you can review and modify before importing.
 *
 * The generated SQL will:
 * 1. UPDATE existing records (matched by Email or Slug)
 * 2. Provide INSERT statements for new freelancers (if any)
 */

function log(message) {
  console.log(message);
}

function escapeSQL(str) {
  if (str === null || str === undefined) return "NULL";
  return `'${String(str).replace(/'/g, "''")}'`;
}

function generateSQLUpdates() {
  log("=".repeat(60));
  log("DATABASE IMPORT SQL GENERATOR");
  log("=".repeat(60));

  // Load scraped data
  if (!fs.existsSync(SCRAPED_DATA)) {
    log("ERROR: Scraped data not found!");
    log("Please run comprehensive-freelancer-scraper.js first.");
    process.exit(1);
  }

  const scrapedData = JSON.parse(fs.readFileSync(SCRAPED_DATA, "utf8"));
  const freelancers = scrapedData.freelancers;

  log(`\nLoaded ${freelancers.length} freelancers from scrape`);

  // Load blob mapping if available
  let blobMapping = {};
  if (fs.existsSync(BLOB_MAPPING)) {
    const mappingArray = JSON.parse(fs.readFileSync(BLOB_MAPPING, "utf8"));
    mappingArray.forEach((m) => {
      blobMapping[m.slug] = m;
    });
    log(`Loaded blob ID mapping for ${mappingArray.length} freelancers`);
  } else {
    log(
      "Warning: Blob ID mapping not found. Run download script first for complete data.",
    );
  }

  // Generate SQL
  const sqlStatements = [];
  const csvRows = [];

  // CSV Header
  csvRows.push(
    [
      "Name",
      "Slug",
      "Email",
      "Bio",
      "PhotoBlobID",
      "CVBlobID",
      "EquipmentBlobID",
      "Website",
      "Instagram",
      "IMDB",
      "LinkedIn",
      "Categories",
    ].join(","),
  );

  // SQL Header
  sqlStatements.push("-- =".repeat(40));
  sqlStatements.push("-- FREELANCERS WEBSITE DATA IMPORT");
  sqlStatements.push("-- Generated: " + new Date().toISOString());
  sqlStatements.push("-- Total Records: " + freelancers.length);
  sqlStatements.push("-- =".repeat(40));
  sqlStatements.push("");
  sqlStatements.push("BEGIN TRANSACTION;");
  sqlStatements.push("");

  // Track statistics
  const stats = {
    with_photo: 0,
    with_cv: 0,
    with_equipment: 0,
    with_bio: 0,
    with_email: 0,
    with_social: 0,
  };

  freelancers.forEach((freelancer, index) => {
    const slug = freelancer.slug;
    const blob = blobMapping[slug] || {};

    // Update statistics
    if (blob.photo_blob_id) stats.with_photo++;
    if (blob.cv_blob_id) stats.with_cv++;
    if (blob.equipment_blob_id) stats.with_equipment++;
    if (freelancer.bio) stats.with_bio++;
    if (freelancer.email) stats.with_email++;
    if (
      freelancer.website ||
      freelancer.instagram ||
      freelancer.imdb ||
      freelancer.linkedin
    )
      stats.with_social++;

    // Generate UPDATE statement
    // This updates tblFreelancerWebsiteData for existing freelancers
    sqlStatements.push(`-- ${index + 1}. ${freelancer.name}`);
    sqlStatements.push(`-- Slug: ${slug}`);
    sqlStatements.push(`UPDATE tblFreelancerWebsiteData`);
    sqlStatements.push(`SET`);

    const updates = [];

    // DisplayName
    if (freelancer.name) {
      updates.push(`  DisplayName = ${escapeSQL(freelancer.name)}`);
    }

    // FreelancerBio
    if (freelancer.bio) {
      updates.push(`  FreelancerBio = ${escapeSQL(freelancer.bio)}`);
    }

    // Blob IDs
    if (blob.photo_blob_id) {
      updates.push(`  PhotoBlobID = ${escapeSQL(blob.photo_blob_id)}`);
      updates.push(`  PhotoStatusID = 2`); // 2 = Verified
    }

    if (blob.cv_blob_id) {
      updates.push(`  CVBlobID = ${escapeSQL(blob.cv_blob_id)}`);
      updates.push(`  CVStatusID = 2`); // 2 = Verified
    }

    if (blob.equipment_blob_id) {
      updates.push(`  EquipmentBlobID = ${escapeSQL(blob.equipment_blob_id)}`);
      updates.push(`  EquipmentListStatusID = 2`); // 2 = Verified
    }

    sqlStatements.push(updates.join(",\n"));
    sqlStatements.push(
      `WHERE Slug = ${escapeSQL(slug)} OR Email = ${escapeSQL(
        freelancer.email,
      )};`,
    );
    sqlStatements.push("");

    // Generate UPDATE statements for social links
    // These go into tblFreelancerWebsiteDataLinks
    if (
      freelancer.website ||
      freelancer.instagram ||
      freelancer.imdb ||
      freelancer.linkedin
    ) {
      const links = [
        { name: "Website", url: freelancer.website },
        { name: "Instagram", url: freelancer.instagram },
        { name: "Imdb", url: freelancer.imdb },
        { name: "LinkedIn", url: freelancer.linkedin },
      ];

      links.forEach((link) => {
        if (link.url) {
          sqlStatements.push(
            `-- Update ${link.name} link for ${freelancer.name}`,
          );
          sqlStatements.push(`UPDATE tblFreelancerWebsiteDataLinks`);
          sqlStatements.push(`SET LinkURL = ${escapeSQL(link.url)}`);
          sqlStatements.push(
            `WHERE FreelancerID = (SELECT FreelancerID FROM tblFreelancerWebsiteData WHERE Slug = ${escapeSQL(
              slug,
            )})`,
          );
          sqlStatements.push(`  AND LinkName = ${escapeSQL(link.name)};`);
          sqlStatements.push("");
        }
      });
    }

    sqlStatements.push("-- " + "-".repeat(58));
    sqlStatements.push("");

    // CSV Row
    const csvRow = [
      escapeCSV(freelancer.name),
      escapeCSV(slug),
      escapeCSV(freelancer.email),
      escapeCSV(freelancer.bio ? freelancer.bio.substring(0, 100) : ""),
      escapeCSV(blob.photo_blob_id),
      escapeCSV(blob.cv_blob_id),
      escapeCSV(blob.equipment_blob_id),
      escapeCSV(freelancer.website),
      escapeCSV(freelancer.instagram),
      escapeCSV(freelancer.imdb),
      escapeCSV(freelancer.linkedin),
      escapeCSV(freelancer.categories ? freelancer.categories.join("; ") : ""),
    ];
    csvRows.push(csvRow.join(","));
  });

  sqlStatements.push("");
  sqlStatements.push("COMMIT TRANSACTION;");
  sqlStatements.push("");
  sqlStatements.push("-- =".repeat(40));
  sqlStatements.push("-- IMPORT COMPLETE");
  sqlStatements.push("-- =".repeat(40));

  // Save SQL file
  fs.writeFileSync(SQL_OUTPUT, sqlStatements.join("\n"));
  log(`\n✓ Saved SQL statements to: ${SQL_OUTPUT}`);

  // Save CSV file
  fs.writeFileSync(CSV_OUTPUT, csvRows.join("\n"));
  log(`✓ Saved CSV export to: ${CSV_OUTPUT}`);

  // Display statistics
  log("\n" + "=".repeat(60));
  log("IMPORT STATISTICS");
  log("=".repeat(60));
  log(`Total Freelancers:       ${freelancers.length}`);
  log(`With Photo Blob ID:      ${stats.with_photo}`);
  log(`With CV Blob ID:         ${stats.with_cv}`);
  log(`With Equipment Blob ID:  ${stats.with_equipment}`);
  log(`With Bio:                ${stats.with_bio}`);
  log(`With Email:              ${stats.with_email}`);
  log(`With Social Links:       ${stats.with_social}`);

  // Generate manual review notes
  log("\n" + "=".repeat(60));
  log("IMPORTANT NOTES FOR MANUAL REVIEW");
  log("=".repeat(60));
  log("");
  log("1. FREELANCER IDs:");
  log("   The generated SQL uses Slug or Email to match existing records.");
  log("   Review the WHERE clauses to ensure they match your data correctly.");
  log("");
  log("2. NEW FIELDS:");
  log("   If your database doesn't have EquipmentBlobID and");
  log("   EquipmentListStatusID columns yet, you'll need to:");
  log("   - Add these columns to tblFreelancerWebsiteData");
  log("   - Or remove those lines from the SQL");
  log("");
  log("3. VERIFICATION STATUS:");
  log("   All StatusID fields are set to 2 (Verified).");
  log("   Change this if you want manual verification first.");
  log("");
  log("4. BLOB STORAGE:");
  log("   Before running this SQL, you must:");
  log("   - Upload all files from downloaded_media_final/ to Azure Blob");
  log("   - Verify the blob IDs match your naming convention");
  log("");
  log("5. BACKUP:");
  log("   ALWAYS backup your database before running these updates!");
  log("");
  log("=".repeat(60));
  log("");

  // Create a mapping guide
  const mappingGuide = {
    instructions:
      "Use this file to help map scraped data to your database FreelancerIDs",
    note: "The 'freelancer_id' values here are generated from slugs. You'll need to replace them with actual database IDs.",
    freelancers: freelancers.map((f) => ({
      name: f.name,
      slug: f.slug,
      email: f.email,
      generated_id: blobMapping[f.slug]?.freelancer_id || null,
      actual_database_id: null, // TO BE FILLED MANUALLY
      photo_blob_id: blobMapping[f.slug]?.photo_blob_id || null,
      cv_blob_id: blobMapping[f.slug]?.cv_blob_id || null,
      equipment_blob_id: blobMapping[f.slug]?.equipment_blob_id || null,
    })),
  };

  const mappingGuidePath = path.join(OUTPUT_DIR, "database_mapping_guide.json");
  fs.writeFileSync(mappingGuidePath, JSON.stringify(mappingGuide, null, 2));
  log(`✓ Saved database mapping guide to: ${mappingGuidePath}`);
  log("");
}

function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Run
try {
  generateSQLUpdates();
  log("✓ SQL generation complete!");
} catch (error) {
  log(`ERROR: ${error.message}`);
  console.error(error);
  process.exit(1);
}
