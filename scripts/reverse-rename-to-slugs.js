import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * REVERSE RENAME SCRIPT
 *
 * Takes files named with Database IDs (P000123, C000123, E000123)
 * and renames them back to slug-based names for SQL import
 *
 * PHOTOS: Will stay as P000123.jpg (no change needed)
 * CVs: C000123.pdf → slug.pdf (e.g., john-smith.pdf)
 * EQUIPMENT: E000123.pdf → slug-equipment.pdf (e.g., john-smith-equipment.pdf)
 */

// Configuration
const MATCHED_DATA = path.join(
  __dirname,
  "output",
  "freelancers_matched_clean.json",
);

// Source directories (azure_ready_media)
const AZURE_MEDIA_DIR = path.join(__dirname, "azure_ready_media");
const AZURE_PHOTOS = path.join(AZURE_MEDIA_DIR, "photos");
const AZURE_CVS = path.join(AZURE_MEDIA_DIR, "cvs");
const AZURE_EQUIPMENT = path.join(AZURE_MEDIA_DIR, "equipment");

// Output directories (slug_based_media)
const SLUG_MEDIA_DIR = path.join(__dirname, "slug_based_media");
const SLUG_PHOTOS = path.join(SLUG_MEDIA_DIR, "photos");
const SLUG_CVS = path.join(SLUG_MEDIA_DIR, "cvs");
const SLUG_EQUIPMENT = path.join(SLUG_MEDIA_DIR, "equipment");

// Logs and mapping
const LOG_FILE = path.join(SLUG_MEDIA_DIR, "reverse_rename_log.txt");
const MAPPING_FILE = path.join(SLUG_MEDIA_DIR, "slug_file_mapping.json");

// Create output directories
[SLUG_MEDIA_DIR, SLUG_PHOTOS, SLUG_CVS, SLUG_EQUIPMENT].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Clear log file
if (fs.existsSync(LOG_FILE)) {
  fs.unlinkSync(LOG_FILE);
}

// Logging
function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + "\n");
}

/**
 * Extract numeric ID from blob ID
 * P000123 → 123
 * C000123 → 123
 * E000123 → 123
 */
function extractFreelancerId(blobId) {
  const match = blobId.match(/^[PCE](\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Find file in directory by blob ID pattern
 */
function findFileByBlobId(directory, blobId) {
  if (!fs.existsSync(directory)) {
    return null;
  }

  const files = fs.readdirSync(directory);

  // Look for files starting with the blob ID (e.g., C000123.pdf, C000123-extra.pdf)
  const found = files.find((f) => {
    const basename = path.basename(f, path.extname(f));
    return basename.startsWith(blobId) || basename === blobId;
  });

  return found ? path.join(directory, found) : null;
}

/**
 * Copy and rename file from blob ID to slug-based name
 */
function reverseRename(sourceDir, destDir, freelancer, type) {
  const typeMap = {
    photo: {
      blobId: freelancer.photo.blob_id,
      getNewFilename: (slug, ext) => `${slug}${ext}`, // john-smith.jpg
    },
    cv: {
      blobId: freelancer.cv.blob_id,
      getNewFilename: (slug, ext) => `${slug}${ext}`, // john-smith.pdf
    },
    equipment: {
      blobId: freelancer.equipment.blob_id,
      getNewFilename: (slug, ext) => `${slug}-equipment${ext}`, // john-smith-equipment.pdf
    },
  };

  const info = typeMap[type];

  if (!info.blobId) {
    return { success: false, reason: "no_blob_id" };
  }

  // Find source file by blob ID
  const sourcePath = findFileByBlobId(sourceDir, info.blobId);

  if (!sourcePath) {
    return {
      success: false,
      reason: "source_not_found",
      details: `Could not find file for blob ID: ${info.blobId}`,
    };
  }

  // Get file extension
  const ext = path.extname(sourcePath);

  // Generate new filename based on slug
  const newFilename = info.getNewFilename(freelancer.slug, ext);
  const destPath = path.join(destDir, newFilename);

  // Check if destination already exists
  if (fs.existsSync(destPath)) {
    return {
      success: true,
      reason: "already_exists",
      sourcePath,
      destPath,
      filename: newFilename,
    };
  }

  try {
    // Copy file
    fs.copyFileSync(sourcePath, destPath);

    return {
      success: true,
      reason: "copied",
      sourcePath,
      destPath,
      filename: newFilename,
      blobId: info.blobId,
    };
  } catch (error) {
    return {
      success: false,
      reason: "copy_failed",
      error: error.message,
      sourcePath,
      destPath,
    };
  }
}

/**
 * Main function
 */
async function reverseRenameFiles() {
  log("=".repeat(70));
  log("REVERSE RENAME SCRIPT - BLOB IDs → SLUG-BASED FILENAMES");
  log("=".repeat(70));

  // Load matched data
  if (!fs.existsSync(MATCHED_DATA)) {
    log("ERROR: freelancers_matched_clean.json not found!", "ERROR");
    log(`Expected: ${MATCHED_DATA}`, "ERROR");
    process.exit(1);
  }

  const matchedData = JSON.parse(fs.readFileSync(MATCHED_DATA, "utf8"));
  const freelancers = matchedData.freelancers;

  log(`✓ Loaded ${freelancers.length} freelancers`);

  // Verify source directories exist
  log("\nVerifying source directories...");
  const dirs = [
    { name: "Azure Photos", path: AZURE_PHOTOS },
    { name: "Azure CVs", path: AZURE_CVS },
    { name: "Azure Equipment", path: AZURE_EQUIPMENT },
  ];

  for (const dir of dirs) {
    const exists = fs.existsSync(dir.path);
    const count = exists ? fs.readdirSync(dir.path).length : 0;
    log(`  ${dir.name}: ${exists ? "✓" : "✗"} (${count} files)`);
  }

  log("\n" + "=".repeat(70));
  log("PROCESSING FILES - ONLY CVs AND EQUIPMENT");
  log("(Photos will remain as P000123.jpg for Azure upload)");
  log("=".repeat(70));

  const stats = {
    cvs_copied: 0,
    cvs_skipped: 0,
    cvs_failed: 0,
    equipment_copied: 0,
    equipment_skipped: 0,
    equipment_failed: 0,
  };

  const mapping = [];
  const errors = [];

  // Process each freelancer
  for (let i = 0; i < freelancers.length; i++) {
    const f = freelancers[i];

    if ((i + 1) % 50 === 0) {
      log(`Progress: ${i + 1}/${freelancers.length}`);
    }

    const freelancerMapping = {
      freelancer_id: f.freelancer_id,
      name: f.name,
      slug: f.slug,
      cv: null,
      equipment: null,
    };

    // Process CV
    if (f.cv.blob_id) {
      const result = reverseRename(AZURE_CVS, SLUG_CVS, f, "cv");

      if (result.success) {
        if (result.reason === "already_exists") {
          stats.cvs_skipped++;
        } else {
          stats.cvs_copied++;
          log(`  [${i + 1}] ${f.name}: CV renamed → ${result.filename}`);
        }

        freelancerMapping.cv = {
          blob_id: f.cv.blob_id,
          original_filename: path.basename(result.sourcePath),
          new_filename: result.filename,
          new_path: result.destPath,
        };
      } else {
        stats.cvs_failed++;
        errors.push({
          freelancer: f.name,
          freelancer_id: f.freelancer_id,
          slug: f.slug,
          type: "cv",
          blob_id: f.cv.blob_id,
          reason: result.reason,
          details: result.details || result.error,
        });
        log(`  [${i + 1}] ${f.name}: CV FAILED - ${result.reason}`, "ERROR");
      }
    } else {
      stats.cvs_skipped++;
    }

    // Process Equipment
    if (f.equipment.blob_id) {
      const result = reverseRename(
        AZURE_EQUIPMENT,
        SLUG_EQUIPMENT,
        f,
        "equipment",
      );

      if (result.success) {
        if (result.reason === "already_exists") {
          stats.equipment_skipped++;
        } else {
          stats.equipment_copied++;
          log(`  [${i + 1}] ${f.name}: Equipment renamed → ${result.filename}`);
        }

        freelancerMapping.equipment = {
          blob_id: f.equipment.blob_id,
          original_filename: path.basename(result.sourcePath),
          new_filename: result.filename,
          new_path: result.destPath,
        };
      } else {
        stats.equipment_failed++;
        errors.push({
          freelancer: f.name,
          freelancer_id: f.freelancer_id,
          slug: f.slug,
          type: "equipment",
          blob_id: f.equipment.blob_id,
          reason: result.reason,
          details: result.details || result.error,
        });
        log(
          `  [${i + 1}] ${f.name}: Equipment FAILED - ${result.reason}`,
          "ERROR",
        );
      }
    } else {
      stats.equipment_skipped++;
    }

    mapping.push(freelancerMapping);
  }

  // Save mapping
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
  log(`\n✓ Saved file mapping to: ${MAPPING_FILE}`);

  // Save errors
  if (errors.length > 0) {
    const errorsFile = path.join(SLUG_MEDIA_DIR, "renaming_errors.json");
    fs.writeFileSync(errorsFile, JSON.stringify(errors, null, 2));
    log(`✓ Saved ${errors.length} errors to: ${errorsFile}`);

    // Error summary
    log("\nError Summary:");
    const errorReasons = {};
    errors.forEach((e) => {
      const key = `${e.type}_${e.reason}`;
      errorReasons[key] = (errorReasons[key] || 0) + 1;
    });

    Object.entries(errorReasons).forEach(([reason, count]) => {
      log(`  ${reason}: ${count}`);
    });
  }

  // Display statistics
  log("\n" + "=".repeat(70));
  log("FINAL STATISTICS");
  log("=".repeat(70));
  log(
    `CVs:        Copied=${stats.cvs_copied}, Skipped=${stats.cvs_skipped}, Failed=${stats.cvs_failed}`,
  );
  log(
    `Equipment:  Copied=${stats.equipment_copied}, Skipped=${stats.equipment_skipped}, Failed=${stats.equipment_failed}`,
  );

  const totalSuccess = stats.cvs_copied + stats.equipment_copied;
  const totalFailed = stats.cvs_failed + stats.equipment_failed;

  log(`\nTotal Success: ${totalSuccess}`);
  log(`Total Failed: ${totalFailed}`);

  if (totalFailed === 0) {
    log("\n🎉 ALL FILES SUCCESSFULLY RENAMED!", "SUCCESS");
  }

  log("\n" + "=".repeat(70));
  log("OUTPUT DIRECTORIES");
  log("=".repeat(70));
  log(`CVs (slug-based):       ${SLUG_CVS}`);
  log(`Equipment (slug-based): ${SLUG_EQUIPMENT}`);
  log(`Photos (ID-based):      ${AZURE_PHOTOS} (unchanged - use as-is)`);

  log("\n" + "=".repeat(70));
  log("NEXT STEPS");
  log("=".repeat(70));
  log("1. Review the renamed files in slug_based_media/");
  log("2. For SQL import, use the files from:");
  log(`   - CVs: ${SLUG_CVS}`);
  log(`   - Equipment: ${SLUG_EQUIPMENT}`);
  log("3. For Azure upload, use the ORIGINAL files from:");
  log(`   - Photos: ${AZURE_PHOTOS} (P000123.jpg format)`);
  log(`   - CVs: ${AZURE_CVS} (C000123.pdf format)`);
  log(`   - Equipment: ${AZURE_EQUIPMENT} (E000123.pdf format)`);
  log("\nREMEMBER: Azure uses blob IDs (P000123, C000123, E000123)");
  log("          SQL import uses slugs (john-smith.pdf)");
}

// Run
reverseRenameFiles().catch((error) => {
  log(`FATAL ERROR: ${error.message}`, "ERROR");
  console.error(error);
  process.exit(1);
});
