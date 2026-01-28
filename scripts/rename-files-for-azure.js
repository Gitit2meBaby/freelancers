import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - account for running from scripts directory
const MATCHED_DATA = path.join(
  __dirname,
  "output",
  "freelancers_matched_clean.json",
);
const OLD_MEDIA_DIR = path.join(__dirname, "downloaded_media_final");
const NEW_MEDIA_DIR = path.join(__dirname, "azure_ready_media");

const OLD_IMAGES = path.join(OLD_MEDIA_DIR, "photos");
const OLD_CVS = path.join(OLD_MEDIA_DIR, "cvs");
const OLD_EQUIPMENT = path.join(OLD_MEDIA_DIR, "equipment");

const NEW_IMAGES = path.join(NEW_MEDIA_DIR, "photos");
const NEW_CVS = path.join(NEW_MEDIA_DIR, "cvs");
const NEW_EQUIPMENT = path.join(NEW_MEDIA_DIR, "equipment");

const LOG_FILE = path.join(NEW_MEDIA_DIR, "renaming_log.txt");
const MAPPING_FILE = path.join(NEW_MEDIA_DIR, "file_mapping.json");

// Ensure directories exist
[NEW_MEDIA_DIR, NEW_IMAGES, NEW_CVS, NEW_EQUIPMENT].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Logging
function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + "\n");
}

// Find file in directory by pattern matching
function findFile(directory, slug, type) {
  if (!fs.existsSync(directory)) {
    return null;
  }

  const files = fs.readdirSync(directory);

  // Try to find file by slug pattern
  const patterns = [
    new RegExp(`^P\\d{6}${slug}`, "i"), // P000123slug
    new RegExp(`${slug}`, "i"), // Just slug
    new RegExp(`^\\d+_${slug}`, "i"), // ID_slug
  ];

  for (const pattern of patterns) {
    const found = files.find((f) => pattern.test(f));
    if (found) {
      return path.join(directory, found);
    }
  }

  return null;
}

// Copy and rename file
function copyAndRename(sourceDir, destDir, freelancer, type) {
  const typeInfo = {
    photo: {
      data: freelancer.photo,
      oldDir: sourceDir,
      newDir: destDir,
    },
    cv: {
      data: freelancer.cv,
      oldDir: sourceDir,
      newDir: destDir,
    },
    equipment: {
      data: freelancer.equipment,
      oldDir: sourceDir,
      newDir: destDir,
    },
  };

  const info = typeInfo[type];
  if (!info.data.blob_id) {
    return { success: false, reason: "no_blob_id" };
  }

  const targetFilename = info.data.filename;
  const targetPath = path.join(info.newDir, targetFilename);

  // Check if already copied
  if (fs.existsSync(targetPath)) {
    return { success: true, reason: "already_exists", path: targetPath };
  }

  // Try to find the source file
  const sourceFile = findFile(info.oldDir, freelancer.slug, type);

  if (!sourceFile) {
    return { success: false, reason: "source_not_found" };
  }

  if (!fs.existsSync(sourceFile)) {
    return { success: false, reason: "source_missing" };
  }

  // Copy file to new location with new name
  try {
    fs.copyFileSync(sourceFile, targetPath);
    return {
      success: true,
      reason: "copied",
      path: targetPath,
      source: sourceFile,
    };
  } catch (error) {
    return { success: false, reason: "copy_failed", error: error.message };
  }
}

// Main renaming function
async function renameFiles() {
  console.log("Script starting...");

  log("=".repeat(60));
  log("FILE RENAMING FOR AZURE UPLOAD");
  log("=".repeat(60));

  // Debug: Show paths
  console.log("\nDEBUG - Checking paths:");
  console.log("Current directory:", __dirname);
  console.log("Looking for matched data at:", MATCHED_DATA);
  console.log("File exists?", fs.existsSync(MATCHED_DATA));
  console.log("Looking for old media at:", OLD_MEDIA_DIR);
  console.log("Directory exists?", fs.existsSync(OLD_MEDIA_DIR));

  // Load matched data
  if (!fs.existsSync(MATCHED_DATA)) {
    log("ERROR: Matched data not found!", "ERROR");
    log("Please run match-with-database.js first.", "ERROR");
    log(`Expected location: ${MATCHED_DATA}`, "ERROR");
    process.exit(1);
  }

  console.log("\nLoading matched data...");

  const data = JSON.parse(fs.readFileSync(MATCHED_DATA, "utf8"));
  const freelancers = data.freelancers;

  log(`\nLoaded ${freelancers.length} matched freelancers`);
  log(`Source: ${OLD_MEDIA_DIR}`);
  log(`Destination: ${NEW_MEDIA_DIR}\n`);

  // DEBUG: Check what's actually in the directories
  console.log("\nDEBUG - Checking source directories:");
  console.log("Photos dir:", OLD_IMAGES);
  console.log("Exists?", fs.existsSync(OLD_IMAGES));
  if (fs.existsSync(OLD_IMAGES)) {
    const photoFiles = fs.readdirSync(OLD_IMAGES);
    console.log(`Found ${photoFiles.length} files in photos directory`);
    console.log("Sample files:", photoFiles.slice(0, 5));
  }

  console.log("\nCVs dir:", OLD_CVS);
  console.log("Exists?", fs.existsSync(OLD_CVS));
  if (fs.existsSync(OLD_CVS)) {
    const cvFiles = fs.readdirSync(OLD_CVS);
    console.log(`Found ${cvFiles.length} files in CVs directory`);
    console.log("Sample files:", cvFiles.slice(0, 5));
  }

  console.log("\nEquipment dir:", OLD_EQUIPMENT);
  console.log("Exists?", fs.existsSync(OLD_EQUIPMENT));
  if (fs.existsSync(OLD_EQUIPMENT)) {
    const equipFiles = fs.readdirSync(OLD_EQUIPMENT);
    console.log(`Found ${equipFiles.length} files in equipment directory`);
    console.log("Sample files:", equipFiles.slice(0, 5));
  }

  console.log("\n" + "=".repeat(60));
  console.log("Starting file matching...\n");

  const stats = {
    photos_copied: 0,
    photos_skipped: 0,
    photos_failed: 0,
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

    log(
      `\n[${i + 1}/${freelancers.length}] ${f.name} (ID: ${f.freelancer_id})`,
    );

    const freelancerMapping = {
      freelancer_id: f.freelancer_id,
      name: f.name,
      slug: f.slug,
      photo: null,
      cv: null,
      equipment: null,
    };

    // Process Photo
    if (f.photo.blob_id) {
      const result = copyAndRename(OLD_IMAGES, NEW_IMAGES, f, "photo");

      if (result.success) {
        if (result.reason === "already_exists") {
          log(`  ✓ Photo exists: ${f.photo.filename}`);
          stats.photos_skipped++;
        } else {
          log(`  ✓ Photo copied: ${f.photo.filename}`, "SUCCESS");
          log(`    From: ${result.source}`);
          stats.photos_copied++;
        }
        freelancerMapping.photo = {
          blob_id: f.photo.blob_id,
          filename: f.photo.filename,
          new_path: result.path,
        };
      } else {
        log(`  ✗ Photo failed: ${result.reason}`, "ERROR");
        stats.photos_failed++;
        errors.push({
          freelancer: f.name,
          type: "photo",
          reason: result.reason,
          error: result.error,
        });
      }
    } else {
      log(`  ⊘ No photo`);
      stats.photos_skipped++;
    }

    // Process CV
    if (f.cv.blob_id) {
      const result = copyAndRename(OLD_CVS, NEW_CVS, f, "cv");

      if (result.success) {
        if (result.reason === "already_exists") {
          log(`  ✓ CV exists: ${f.cv.filename}`);
          stats.cvs_skipped++;
        } else {
          log(`  ✓ CV copied: ${f.cv.filename}`, "SUCCESS");
          log(`    From: ${result.source}`);
          stats.cvs_copied++;
        }
        freelancerMapping.cv = {
          blob_id: f.cv.blob_id,
          filename: f.cv.filename,
          new_path: result.path,
        };
      } else {
        log(`  ✗ CV failed: ${result.reason}`, "ERROR");
        stats.cvs_failed++;
        errors.push({
          freelancer: f.name,
          type: "cv",
          reason: result.reason,
          error: result.error,
        });
      }
    } else {
      log(`  ⊘ No CV`);
      stats.cvs_skipped++;
    }

    // Process Equipment List
    if (f.equipment.blob_id) {
      const result = copyAndRename(
        OLD_EQUIPMENT,
        NEW_EQUIPMENT,
        f,
        "equipment",
      );

      if (result.success) {
        if (result.reason === "already_exists") {
          log(`  ✓ Equipment exists: ${f.equipment.filename}`);
          stats.equipment_skipped++;
        } else {
          log(`  ✓ Equipment copied: ${f.equipment.filename}`, "SUCCESS");
          log(`    From: ${result.source}`);
          stats.equipment_copied++;
        }
        freelancerMapping.equipment = {
          blob_id: f.equipment.blob_id,
          filename: f.equipment.filename,
          new_path: result.path,
        };
      } else {
        log(`  ✗ Equipment failed: ${result.reason}`, "ERROR");
        stats.equipment_failed++;
        errors.push({
          freelancer: f.name,
          type: "equipment",
          reason: result.reason,
          error: result.error,
        });
      }
    } else {
      log(`  ⊘ No equipment list`);
      stats.equipment_skipped++;
    }

    mapping.push(freelancerMapping);
  }

  // Save mapping
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
  log(`\n✓ Saved file mapping to: ${MAPPING_FILE}`);

  // Save errors if any
  if (errors.length > 0) {
    const errorsFile = path.join(NEW_MEDIA_DIR, "renaming_errors.json");
    fs.writeFileSync(errorsFile, JSON.stringify(errors, null, 2));
    log(`✓ Saved ${errors.length} errors to: ${errorsFile}`);
  }

  // Display statistics
  log("\n" + "=".repeat(60));
  log("RENAMING STATISTICS");
  log("=".repeat(60));
  log(`Photos:`);
  log(`  Copied:  ${stats.photos_copied}`);
  log(`  Skipped: ${stats.photos_skipped}`);
  log(`  Failed:  ${stats.photos_failed}`);
  log(``);
  log(`CVs:`);
  log(`  Copied:  ${stats.cvs_copied}`);
  log(`  Skipped: ${stats.cvs_skipped}`);
  log(`  Failed:  ${stats.cvs_failed}`);
  log(``);
  log(`Equipment Lists:`);
  log(`  Copied:  ${stats.equipment_copied}`);
  log(`  Skipped: ${stats.equipment_skipped}`);
  log(`  Failed:  ${stats.equipment_failed}`);
  log(``);
  log(
    `Total Files Ready: ${stats.photos_copied + stats.photos_skipped + stats.cvs_copied + stats.cvs_skipped + stats.equipment_copied + stats.equipment_skipped}`,
  );
  log(`Total Errors: ${errors.length}`);

  log("\n" + "=".repeat(60));
  log("OUTPUT DIRECTORIES - READY FOR AZURE UPLOAD");
  log("=".repeat(60));
  log(`Photos:    ${NEW_IMAGES}`);
  log(`CVs:       ${NEW_CVS}`);
  log(`Equipment: ${NEW_EQUIPMENT}`);

  // Generate Azure CLI upload commands
  log("\n" + "=".repeat(60));
  log("AZURE BLOB UPLOAD COMMANDS");
  log("=".repeat(60));
  log("\nRun these commands to upload to Azure Blob Storage:\n");

  log(`# Upload Photos`);
  log(`az storage blob upload-batch \\`);
  log(`  --account-name YOUR_STORAGE_ACCOUNT \\`);
  log(`  --destination YOUR_CONTAINER \\`);
  log(`  --source "${NEW_IMAGES}" \\`);
  log(`  --pattern "*.jpg" --pattern "*.jpeg" --pattern "*.png"\n`);

  log(`# Upload CVs`);
  log(`az storage blob upload-batch \\`);
  log(`  --account-name YOUR_STORAGE_ACCOUNT \\`);
  log(`  --destination YOUR_CONTAINER \\`);
  log(`  --source "${NEW_CVS}" \\`);
  log(`  --pattern "*.pdf"\n`);

  log(`# Upload Equipment Lists`);
  log(`az storage blob upload-batch \\`);
  log(`  --account-name YOUR_STORAGE_ACCOUNT \\`);
  log(`  --destination YOUR_CONTAINER \\`);
  log(`  --source "${NEW_EQUIPMENT}" \\`);
  log(`  --pattern "*.pdf"\n`);

  log("=".repeat(60));
  log("\n✓ Renaming complete!");
  log("\nNext steps:");
  log("1. Review: azure_ready_media/ directories");
  log("2. Upload files to Azure Blob Storage (commands above)");
  log("3. Run: output/import_ready.sql");
}

// Run
renameFiles().catch((error) => {
  log(`FATAL ERROR: ${error.message}`, "ERROR");
  console.error("Full error:", error);
  console.error("Stack trace:", error.stack);
  process.exit(1);
});

// Add process handlers for debugging
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
