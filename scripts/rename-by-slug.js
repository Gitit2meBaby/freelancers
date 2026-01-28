import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
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

// Find file by slug - this is the ONLY reliable method
function findFileBySlug(directory, slug, type) {
  if (!fs.existsSync(directory)) {
    return { found: false, reason: "directory_not_exist" };
  }

  const files = fs.readdirSync(directory);

  if (files.length === 0) {
    return { found: false, reason: "directory_empty" };
  }

  // Normalize slug for comparison (handle special characters)
  const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");

  // Try progressively looser slug matching
  const strategies = [
    {
      name: "exact_slug",
      test: (filename) => {
        const nameWithoutExt = path.parse(filename).name.toLowerCase();
        return nameWithoutExt === slug;
      },
    },
    {
      name: "slug_with_suffix",
      test: (filename) => {
        const nameWithoutExt = path.parse(filename).name.toLowerCase();
        // Matches: slug-150x150, slug-scaled, slug_1, etc.
        return (
          nameWithoutExt.startsWith(slug + "-") ||
          nameWithoutExt.startsWith(slug + "_")
        );
      },
    },
    {
      name: "slug_anywhere",
      test: (filename) => {
        const lower = filename.toLowerCase();
        return lower.includes(slug);
      },
    },
    {
      name: "normalized_slug",
      test: (filename) => {
        const nameWithoutExt = path.parse(filename).name.toLowerCase();
        const normalizedName = nameWithoutExt.replace(/[^a-z0-9-]/g, "");
        return (
          normalizedName === normalizedSlug ||
          normalizedName.startsWith(normalizedSlug + "-") ||
          normalizedName.startsWith(normalizedSlug)
        );
      },
    },
    {
      name: "partial_slug_words",
      test: (filename) => {
        // Split slug into words and check if all significant words are in filename
        const words = slug.split("-").filter((w) => w.length > 3);
        if (words.length === 0) return false;

        const lower = filename.toLowerCase();
        return words.every((word) => lower.includes(word));
      },
    },
  ];

  // Try each strategy
  for (const strategy of strategies) {
    const matches = files.filter((f) => strategy.test(f));

    if (matches.length === 1) {
      // Perfect - exactly one match
      return {
        found: true,
        file: path.join(directory, matches[0]),
        filename: matches[0],
        strategy: strategy.name,
        confidence: "high",
      };
    } else if (matches.length > 1) {
      // Multiple matches - pick the best one
      // Prefer exact matches, then shortest filename
      const sorted = matches.sort((a, b) => {
        const aExact = path.parse(a).name.toLowerCase() === slug;
        const bExact = path.parse(b).name.toLowerCase() === slug;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.length - b.length;
      });

      return {
        found: true,
        file: path.join(directory, sorted[0]),
        filename: sorted[0],
        strategy: strategy.name,
        confidence: "medium",
        warning: `Multiple matches (${matches.length}), chose: ${sorted[0]}`,
      };
    }
  }

  return {
    found: false,
    reason: "no_slug_match",
    slug: slug,
    filesChecked: files.length,
  };
}

// Copy and rename file using slug-based matching
function copyAndRename(sourceDir, destDir, freelancer, type) {
  const typeMap = {
    photo: { data: freelancer.photo, dir: sourceDir, newDir: destDir },
    cv: { data: freelancer.cv, dir: sourceDir, newDir: destDir },
    equipment: { data: freelancer.equipment, dir: sourceDir, newDir: destDir },
  };

  const info = typeMap[type];

  if (!info.data.blob_id) {
    return { success: false, reason: "no_blob_id" };
  }

  const targetFilename = info.data.filename;
  const targetPath = path.join(info.newDir, targetFilename);

  // Check if already copied
  if (fs.existsSync(targetPath)) {
    return { success: true, reason: "already_exists", path: targetPath };
  }

  // Find source file by slug
  const findResult = findFileBySlug(info.dir, freelancer.slug, type);

  if (!findResult.found) {
    return {
      success: false,
      reason: findResult.reason,
      slug: freelancer.slug,
      filesChecked: findResult.filesChecked,
    };
  }

  const sourceFile = findResult.file;

  if (!fs.existsSync(sourceFile)) {
    return { success: false, reason: "source_missing" };
  }

  // Verify extension matches what we expect
  const sourceExt = path.extname(findResult.filename).toLowerCase();
  const targetExt = path.extname(targetFilename).toLowerCase();

  if (sourceExt !== targetExt) {
    log(
      `  ⚠ Extension mismatch: source=${sourceExt}, target=${targetExt}`,
      "WARN",
    );
  }

  // Copy file to new location with new name
  try {
    fs.copyFileSync(sourceFile, targetPath);
    return {
      success: true,
      reason: "copied",
      path: targetPath,
      source: sourceFile,
      sourceFilename: findResult.filename,
      strategy: findResult.strategy,
      confidence: findResult.confidence,
      warning: findResult.warning,
    };
  } catch (error) {
    return {
      success: false,
      reason: "copy_failed",
      error: error.message,
      source: sourceFile,
    };
  }
}

// Main renaming function
async function renameFiles() {
  log("=".repeat(60));
  log("SLUG-BASED FILE RENAMING FOR AZURE UPLOAD");
  log("=".repeat(60));

  // Load matched data
  if (!fs.existsSync(MATCHED_DATA)) {
    log("ERROR: Matched data not found!", "ERROR");
    log(`Expected: ${MATCHED_DATA}`, "ERROR");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(MATCHED_DATA, "utf8"));
  const freelancers = data.freelancers;

  log(`\nLoaded ${freelancers.length} freelancers from database match`);
  log(`Source: ${OLD_MEDIA_DIR}`);
  log(`Destination: ${NEW_MEDIA_DIR}`);

  // Check source directories
  console.log("\nChecking source directories:");
  const dirChecks = [
    { name: "Photos", path: OLD_IMAGES },
    { name: "CVs", path: OLD_CVS },
    { name: "Equipment", path: OLD_EQUIPMENT },
  ];

  for (const check of dirChecks) {
    const exists = fs.existsSync(check.path);
    const count = exists ? fs.readdirSync(check.path).length : 0;
    console.log(`  ${check.name}: ${exists ? "✓" : "✗"} (${count} files)`);
  }

  // Test first 3 freelancers to show matching works
  console.log("\n" + "=".repeat(60));
  console.log("TESTING SLUG MATCHING - First 3 Freelancers");
  console.log("=".repeat(60));

  for (let i = 0; i < Math.min(3, freelancers.length); i++) {
    const f = freelancers[i];
    console.log(`\n${i + 1}. ${f.name}`);
    console.log(`   Slug: "${f.slug}"`);
    console.log(`   Database ID: ${f.freelancer_id}`);
    console.log(
      `   New Blob IDs: Photo=${f.photo.blob_id}, CV=${f.cv.blob_id}`,
    );

    if (f.photo.blob_id) {
      const result = findFileBySlug(OLD_IMAGES, f.slug, "photo");
      if (result.found) {
        console.log(
          `   ✓ Photo found: "${result.filename}" (${result.strategy})`,
        );
        console.log(`     Will rename to: "${f.photo.filename}"`);
      } else {
        console.log(`   ✗ Photo not found (${result.reason})`);
      }
    }

    if (f.cv.blob_id) {
      const result = findFileBySlug(OLD_CVS, f.slug, "cv");
      if (result.found) {
        console.log(`   ✓ CV found: "${result.filename}" (${result.strategy})`);
        console.log(`     Will rename to: "${f.cv.filename}"`);
      } else {
        console.log(`   ✗ CV not found (${result.reason})`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Processing all freelancers...\n");

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

    if ((i + 1) % 100 === 0) {
      log(`Progress: ${i + 1}/${freelancers.length}`);
    }

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
          stats.photos_skipped++;
        } else {
          if (result.warning) {
            log(`  [${i + 1}] ${f.name}: Photo ⚠ ${result.warning}`, "WARN");
          }
          stats.photos_copied++;
        }
        freelancerMapping.photo = {
          blob_id: f.photo.blob_id,
          filename: f.photo.filename,
          original_filename: result.sourceFilename,
          new_path: result.path,
        };
      } else {
        stats.photos_failed++;
        errors.push({
          freelancer: f.name,
          freelancer_id: f.freelancer_id,
          slug: f.slug,
          type: "photo",
          reason: result.reason,
          details: result,
        });
      }
    } else {
      stats.photos_skipped++;
    }

    // Process CV
    if (f.cv.blob_id) {
      const result = copyAndRename(OLD_CVS, NEW_CVS, f, "cv");

      if (result.success) {
        if (result.reason === "already_exists") {
          stats.cvs_skipped++;
        } else {
          if (result.warning) {
            log(`  [${i + 1}] ${f.name}: CV ⚠ ${result.warning}`, "WARN");
          }
          stats.cvs_copied++;
        }
        freelancerMapping.cv = {
          blob_id: f.cv.blob_id,
          filename: f.cv.filename,
          original_filename: result.sourceFilename,
          new_path: result.path,
        };
      } else {
        stats.cvs_failed++;
        errors.push({
          freelancer: f.name,
          freelancer_id: f.freelancer_id,
          slug: f.slug,
          type: "cv",
          reason: result.reason,
          details: result,
        });
      }
    } else {
      stats.cvs_skipped++;
    }

    // Process Equipment
    if (f.equipment.blob_id) {
      const result = copyAndRename(
        OLD_EQUIPMENT,
        NEW_EQUIPMENT,
        f,
        "equipment",
      );

      if (result.success) {
        if (result.reason === "already_exists") {
          stats.equipment_skipped++;
        } else {
          if (result.warning) {
            log(
              `  [${i + 1}] ${f.name}: Equipment ⚠ ${result.warning}`,
              "WARN",
            );
          }
          stats.equipment_copied++;
        }
        freelancerMapping.equipment = {
          blob_id: f.equipment.blob_id,
          filename: f.equipment.filename,
          original_filename: result.sourceFilename,
          new_path: result.path,
        };
      } else {
        stats.equipment_failed++;
        errors.push({
          freelancer: f.name,
          freelancer_id: f.freelancer_id,
          slug: f.slug,
          type: "equipment",
          reason: result.reason,
          details: result,
        });
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
    const errorsFile = path.join(NEW_MEDIA_DIR, "renaming_errors.json");
    fs.writeFileSync(errorsFile, JSON.stringify(errors, null, 2));
    log(`✓ Saved ${errors.length} errors to: ${errorsFile}`);

    // Error summary
    const errorReasons = {};
    errors.forEach((e) => {
      const key = `${e.type}_${e.reason}`;
      errorReasons[key] = (errorReasons[key] || 0) + 1;
    });

    log("\nError Summary:");
    Object.entries(errorReasons).forEach(([reason, count]) => {
      log(`  ${reason}: ${count}`);
    });
  }

  // Display statistics
  log("\n" + "=".repeat(60));
  log("FINAL STATISTICS");
  log("=".repeat(60));
  log(
    `Photos:     Copied=${stats.photos_copied}, Skipped=${stats.photos_skipped}, Failed=${stats.photos_failed}`,
  );
  log(
    `CVs:        Copied=${stats.cvs_copied}, Skipped=${stats.cvs_skipped}, Failed=${stats.cvs_failed}`,
  );
  log(
    `Equipment:  Copied=${stats.equipment_copied}, Skipped=${stats.equipment_skipped}, Failed=${stats.equipment_failed}`,
  );

  const totalSuccess =
    stats.photos_copied + stats.cvs_copied + stats.equipment_copied;
  const totalFailed =
    stats.photos_failed + stats.cvs_failed + stats.equipment_failed;

  log(`\nTotal Success: ${totalSuccess}`);
  log(`Total Failed: ${totalFailed}`);

  if (totalFailed === 0) {
    log("\n🎉 ALL FILES SUCCESSFULLY RENAMED!", "SUCCESS");
  }

  log("\n" + "=".repeat(60));
  log("✓ Complete! Files are ready for Azure upload");
  log(`\nNext steps:`);
  log(`1. Review: ${NEW_MEDIA_DIR}`);
  log(`2. Upload to Azure Blob Storage`);
  log(`3. Run SQL script to update database`);
}

// Run
renameFiles().catch((error) => {
  log(`FATAL ERROR: ${error.message}`, "ERROR");
  console.error(error);
  process.exit(1);
});
