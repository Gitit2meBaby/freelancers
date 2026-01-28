import sql from "mssql";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
// Try current directory first, then parent directory
const envPath = fs.existsSync(path.join(__dirname, ".env"))
  ? path.join(__dirname, ".env")
  : path.join(__dirname, "..", ".env");

dotenv.config({ path: envPath });

console.log(`Loading .env from: ${envPath}`);

// Database configuration (from your db.js)
const dbConfig = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || "1433"),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
    enableArithAbort: process.env.DB_ENABLE_ARITH_ABORT === "true",
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || "30000"),
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || "30000"),
  },
};

// File paths
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
const OUTPUT_DIR = path.join(__dirname, "output");
const MATCHED_OUTPUT = path.join(OUTPUT_DIR, "freelancers_matched_clean.json");
const UNMATCHED_OUTPUT = path.join(OUTPUT_DIR, "freelancers_unmatched.json");
const SQL_OUTPUT = path.join(OUTPUT_DIR, "import_ready.sql");
const LOG_FILE = path.join(OUTPUT_DIR, "matching_log.txt");

// Logging
function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + "\n");
}

// Generate Blob IDs based on FreelancerID
function generatePhotoBlobId(freelancerId) {
  return `P${String(freelancerId).padStart(6, "0")}`;
}

function generateCvBlobId(freelancerId) {
  return `C${String(freelancerId).padStart(6, "0")}`;
}

function generateEquipmentBlobId(freelancerId) {
  return `E${String(freelancerId).padStart(6, "0")}`;
}

// Get file extension from URL
function getExtension(url) {
  if (!url) return null;
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    return ext || null;
  } catch (e) {
    return null;
  }
}

// Clean freelancer object for production
function cleanFreelancerObject(freelancer, dbRecord, blobData) {
  return {
    // Database IDs
    freelancer_id: dbRecord.FreelancerID,

    // Basic Info
    name: freelancer.name,
    slug: freelancer.slug,
    email: freelancer.email || dbRecord.Email,
    bio: freelancer.bio,

    // Categories
    categories: freelancer.categories,

    // Photo
    photo: {
      blob_id: blobData.photo_blob_id,
      filename: blobData.photo_filename,
      original_url: freelancer.image_url,
      extension: getExtension(freelancer.image_url),
    },

    // CV
    cv: {
      blob_id: blobData.cv_blob_id,
      filename: blobData.cv_filename,
      original_url: freelancer.cv_url,
      extension: getExtension(freelancer.cv_url),
    },

    // Equipment List
    equipment: {
      blob_id: blobData.equipment_blob_id,
      filename: blobData.equipment_filename,
      original_url: freelancer.equipment_url,
      extension: getExtension(freelancer.equipment_url),
    },

    // Social Links
    links: {
      website: freelancer.website,
      instagram: freelancer.instagram,
      imdb: freelancer.imdb,
      linkedin: freelancer.linkedin,
    },

    // Database status
    exists_in_db: true,
    needs_photo_update: !!freelancer.image_url,
    needs_cv_update: !!freelancer.cv_url,
    needs_equipment_update: !!freelancer.equipment_url,
    needs_bio_update:
      !!freelancer.bio && freelancer.bio !== dbRecord.FreelancerBio,
    needs_links_update: !!(
      freelancer.website ||
      freelancer.instagram ||
      freelancer.imdb ||
      freelancer.linkedin
    ),
  };
}

// Main matching function
async function matchWithDatabase() {
  log("=".repeat(60));
  log("DATABASE MATCHING SCRIPT");
  log("=".repeat(60));

  // Load scraped data
  if (!fs.existsSync(SCRAPED_DATA)) {
    log("ERROR: Scraped data not found!", "ERROR");
    log("Please run comprehensive-freelancer-scraper.js first.", "ERROR");
    process.exit(1);
  }

  const scrapedData = JSON.parse(fs.readFileSync(SCRAPED_DATA, "utf8"));
  const freelancers = scrapedData.freelancers;
  log(`Loaded ${freelancers.length} scraped freelancers`);

  // Load blob mapping
  let blobMapping = {};
  if (fs.existsSync(BLOB_MAPPING)) {
    const mappingArray = JSON.parse(fs.readFileSync(BLOB_MAPPING, "utf8"));
    mappingArray.forEach((m) => {
      blobMapping[m.slug] = m;
    });
    log(`Loaded blob mapping for ${mappingArray.length} freelancers`);
  }

  // Verify database configuration
  log("\nVerifying database configuration...");
  if (!dbConfig.server) {
    log("ERROR: DB_SERVER not set in environment variables!", "ERROR");
    log("Please check your .env file contains:", "ERROR");
    log("  DB_SERVER=your-server.database.windows.net", "ERROR");
    log("  DB_DATABASE=YourDatabase", "ERROR");
    log("  DB_USER=YourUser", "ERROR");
    log("  DB_PASSWORD=YourPassword", "ERROR");
    process.exit(1);
  }
  log(`Server: ${dbConfig.server}`);
  log(`Database: ${dbConfig.database}`);
  log(`User: ${dbConfig.user}`);

  // Connect to database
  log("\nConnecting to database...");
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    log("✓ Database connected successfully", "SUCCESS");
  } catch (error) {
    log(`✗ Database connection failed: ${error.message}`, "ERROR");
    process.exit(1);
  }

  // Fetch all freelancers from database
  log("\nFetching freelancers from database...");
  let dbFreelancers = {};

  try {
    const query = `
      SELECT 
        FreelancerID,
        DisplayName,
        Email,
        Slug,
        FreelancerBio,
        PhotoBlobID,
        CVBlobID
      FROM vwFreelancersListWEB2
    `;

    const result = await pool.request().query(query);

    // Index by slug for fast lookup
    result.recordset.forEach((record) => {
      if (record.Slug) {
        dbFreelancers[record.Slug.toLowerCase()] = record;
      }
    });

    log(
      `✓ Fetched ${result.recordset.length} freelancers from database`,
      "SUCCESS",
    );
  } catch (error) {
    log(`✗ Failed to fetch from database: ${error.message}`, "ERROR");
    await pool.close();
    process.exit(1);
  }

  // Match scraped freelancers with database records
  log("\n" + "=".repeat(60));
  log("MATCHING FREELANCERS");
  log("=".repeat(60));

  const matched = [];
  const unmatched = [];
  const stats = {
    total: freelancers.length,
    matched: 0,
    unmatched: 0,
    with_new_photo: 0,
    with_new_cv: 0,
    with_new_equipment: 0,
    with_new_bio: 0,
    with_new_links: 0,
  };

  for (const freelancer of freelancers) {
    const slugKey = freelancer.slug.toLowerCase();
    const dbRecord = dbFreelancers[slugKey];

    if (dbRecord) {
      // MATCHED - Create clean object with actual FreelancerID
      const freelancerId = dbRecord.FreelancerID;

      // Generate proper blob IDs
      const photoBlobId = freelancer.image_url
        ? generatePhotoBlobId(freelancerId)
        : null;
      const cvBlobId = freelancer.cv_url
        ? generateCvBlobId(freelancerId)
        : null;
      const equipmentBlobId = freelancer.equipment_url
        ? generateEquipmentBlobId(freelancerId)
        : null;

      const photoExt = getExtension(freelancer.image_url);
      const cvExt = getExtension(freelancer.cv_url);
      const equipmentExt = getExtension(freelancer.equipment_url);

      const blobData = {
        photo_blob_id: photoBlobId,
        photo_filename:
          photoBlobId && photoExt ? `${photoBlobId}${photoExt}` : null,
        cv_blob_id: cvBlobId,
        cv_filename: cvBlobId && cvExt ? `${cvBlobId}${cvExt}` : null,
        equipment_blob_id: equipmentBlobId,
        equipment_filename:
          equipmentBlobId && equipmentExt
            ? `${equipmentBlobId}${equipmentExt}`
            : null,
      };

      const cleanedFreelancer = cleanFreelancerObject(
        freelancer,
        dbRecord,
        blobData,
      );

      matched.push(cleanedFreelancer);
      stats.matched++;

      // Count updates needed
      if (cleanedFreelancer.needs_photo_update) stats.with_new_photo++;
      if (cleanedFreelancer.needs_cv_update) stats.with_new_cv++;
      if (cleanedFreelancer.needs_equipment_update) stats.with_new_equipment++;
      if (cleanedFreelancer.needs_bio_update) stats.with_new_bio++;
      if (cleanedFreelancer.needs_links_update) stats.with_new_links++;

      log(`✓ ${freelancer.name} (ID: ${freelancerId})`);
    } else {
      // UNMATCHED - Keep for manual review
      unmatched.push({
        name: freelancer.name,
        slug: freelancer.slug,
        email: freelancer.email,
        categories: freelancer.categories,
        reason: "Slug not found in database",
      });
      stats.unmatched++;
      log(`✗ ${freelancer.name} - NOT FOUND IN DATABASE`, "WARN");
    }
  }

  // Close database connection
  await pool.close();
  log("\n✓ Database connection closed");

  // Save matched freelancers (clean, production-ready)
  const outputData = {
    generated_at: new Date().toISOString(),
    total_freelancers: stats.matched,
    statistics: stats,
    freelancers: matched,
  };

  fs.writeFileSync(MATCHED_OUTPUT, JSON.stringify(outputData, null, 2));
  log(`\n✓ Saved ${stats.matched} matched freelancers to: ${MATCHED_OUTPUT}`);

  // Save unmatched freelancers for manual review
  if (unmatched.length > 0) {
    fs.writeFileSync(UNMATCHED_OUTPUT, JSON.stringify(unmatched, null, 2));
    log(
      `✓ Saved ${stats.unmatched} unmatched freelancers to: ${UNMATCHED_OUTPUT}`,
    );
  }

  // Generate production-ready SQL
  log("\nGenerating SQL import scripts...");
  generateProductionSQL(matched);

  // Display statistics
  log("\n" + "=".repeat(60));
  log("MATCHING STATISTICS");
  log("=".repeat(60));
  log(`Total Scraped:           ${stats.total}`);
  log(
    `Matched in Database:     ${stats.matched} (${((stats.matched / stats.total) * 100).toFixed(1)}%)`,
  );
  log(`Not Found in Database:   ${stats.unmatched}`);
  log("");
  log("Updates Needed:");
  log(`  New Photos:            ${stats.with_new_photo}`);
  log(`  New CVs:               ${stats.with_new_cv}`);
  log(`  New Equipment Lists:   ${stats.with_new_equipment}`);
  log(`  Bio Updates:           ${stats.with_new_bio}`);
  log(`  Link Updates:          ${stats.with_new_links}`);
  log("=".repeat(60));

  log("\n✓ Matching complete!");
  log("\nNext steps:");
  log("1. Review: output/freelancers_matched_clean.json");
  log("2. Review: output/freelancers_unmatched.json (if any)");
  log("3. Rename downloaded files to match blob IDs (see instructions below)");
  log("4. Upload to Azure Blob Storage");
  log("5. Run: output/import_ready.sql");
}

// Generate production-ready SQL with actual FreelancerIDs
function generateProductionSQL(freelancers) {
  const sql = [];

  sql.push("-- " + "=".repeat(58));
  sql.push("-- FREELANCERS DATA IMPORT - PRODUCTION READY");
  sql.push("-- Generated: " + new Date().toISOString());
  sql.push("-- Total Updates: " + freelancers.length);
  sql.push("-- " + "=".repeat(58));
  sql.push("");
  sql.push("-- IMPORTANT: Backup your database before running this script!");
  sql.push("");
  sql.push("BEGIN TRANSACTION;");
  sql.push("");

  let updateCount = 0;

  freelancers.forEach((f, index) => {
    // Only generate updates if there's new data
    const needsUpdate =
      f.needs_photo_update ||
      f.needs_cv_update ||
      f.needs_equipment_update ||
      f.needs_bio_update;

    if (!needsUpdate && !f.needs_links_update) {
      return; // Skip freelancers with no updates
    }

    updateCount++;

    sql.push(`-- ${index + 1}. ${f.name} (ID: ${f.freelancer_id})`);

    // Update main table
    if (needsUpdate) {
      sql.push(`UPDATE tblFreelancerWebsiteData SET`);
      const updates = [];

      if (f.needs_photo_update && f.photo.blob_id) {
        updates.push(`  PhotoBlobID = '${f.photo.blob_id}'`);
        updates.push(`  PhotoStatusID = 2`);
      }

      if (f.needs_cv_update && f.cv.blob_id) {
        updates.push(`  CVBlobID = '${f.cv.blob_id}'`);
        updates.push(`  CVStatusID = 2`);
      }

      if (f.needs_equipment_update && f.equipment.blob_id) {
        updates.push(`  EquipmentBlobID = '${f.equipment.blob_id}'`);
        updates.push(`  EquipmentListStatusID = 2`);
      }

      if (f.needs_bio_update && f.bio) {
        const escapedBio = f.bio.replace(/'/g, "''");
        updates.push(`  FreelancerBio = '${escapedBio}'`);
      }

      sql.push(updates.join(",\n"));
      sql.push(`WHERE FreelancerID = ${f.freelancer_id};`);
      sql.push("");
    }

    // Update links
    if (f.needs_links_update) {
      const links = [
        { name: "Website", url: f.links.website },
        { name: "Instagram", url: f.links.instagram },
        { name: "Imdb", url: f.links.imdb },
        { name: "LinkedIn", url: f.links.linkedin },
      ];

      links.forEach((link) => {
        if (link.url) {
          const escapedUrl = link.url.replace(/'/g, "''");
          sql.push(`UPDATE tblFreelancerWebsiteDataLinks`);
          sql.push(`SET LinkURL = '${escapedUrl}'`);
          sql.push(`WHERE FreelancerID = ${f.freelancer_id}`);
          sql.push(`  AND LinkName = '${link.name}';`);
          sql.push("");
        }
      });
    }

    sql.push("-- " + "-".repeat(58));
    sql.push("");
  });

  sql.push("");
  sql.push("COMMIT TRANSACTION;");
  sql.push("");
  sql.push(`-- Updates generated: ${updateCount}`);
  sql.push("-- " + "=".repeat(58));

  fs.writeFileSync(SQL_OUTPUT, sql.join("\n"));
  log(`✓ Generated production SQL: ${SQL_OUTPUT}`);
  log(`  (${updateCount} freelancers with updates)`);
}

// Run the script
matchWithDatabase().catch((error) => {
  log(`FATAL ERROR: ${error.message}`, "ERROR");
  console.error(error);
  process.exit(1);
});
