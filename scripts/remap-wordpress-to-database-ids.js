import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const WORDPRESS_MAPPING = path.join(
  __dirname,
  "downloaded_media_final",
  "blob_id_mapping.json",
);
const DATABASE_MAPPING = path.join(
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
const ID_MAPPING_FILE = path.join(
  NEW_MEDIA_DIR,
  "wordpress_to_database_id_mapping.json",
);

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

// Main function
async function remapBlobIds() {
  log("=".repeat(70));
  log("WORDPRESS → DATABASE BLOB ID REMAPPING");
  log("=".repeat(70));

  // Load WordPress mapping (has WordPress IDs)
  if (!fs.existsSync(WORDPRESS_MAPPING)) {
    log("ERROR: WordPress blob_id_mapping.json not found!", "ERROR");
    log(`Expected: ${WORDPRESS_MAPPING}`, "ERROR");
    process.exit(1);
  }

  const wordpressData = JSON.parse(fs.readFileSync(WORDPRESS_MAPPING, "utf8"));
  log(`✓ Loaded ${wordpressData.length} WordPress freelancers`);

  // Load Database mapping (has Database IDs)
  if (!fs.existsSync(DATABASE_MAPPING)) {
    log("ERROR: Database freelancers_matched_clean.json not found!", "ERROR");
    log(`Expected: ${DATABASE_MAPPING}`, "ERROR");
    process.exit(1);
  }

  const databaseData = JSON.parse(fs.readFileSync(DATABASE_MAPPING, "utf8"));
  const dbFreelancers = databaseData.freelancers;
  log(`✓ Loaded ${dbFreelancers.length} Database freelancers`);

  // Create slug-indexed lookup for database records
  const dbBySlug = {};
  dbFreelancers.forEach((f) => {
    dbBySlug[f.slug.toLowerCase()] = f;
  });

  // Create WordPress to Database ID mapping
  log("\nCreating WordPress → Database ID mapping...");

  const idMapping = [];
  let matched = 0;
  let unmatched = 0;

  for (const wpFreelancer of wordpressData) {
    const slug = wpFreelancer.slug.toLowerCase();
    const dbFreelancer = dbBySlug[slug];

    if (dbFreelancer) {
      matched++;

      idMapping.push({
        name: wpFreelancer.name,
        slug: wpFreelancer.slug,

        // WordPress IDs
        wordpress_id: wpFreelancer.freelancer_id,
        wordpress_photo_blob: wpFreelancer.photo_blob_id,
        wordpress_cv_blob: wpFreelancer.cv_blob_id,
        wordpress_equipment_blob: wpFreelancer.equipment_blob_id,

        // Database IDs
        database_id: dbFreelancer.freelancer_id,
        database_photo_blob: dbFreelancer.photo?.blob_id,
        database_cv_blob: dbFreelancer.cv?.blob_id,
        database_equipment_blob: dbFreelancer.equipment?.blob_id,

        // File info
        has_photo: wpFreelancer.downloaded_photo,
        has_cv: wpFreelancer.downloaded_cv,
        has_equipment: wpFreelancer.downloaded_equipment,
      });
    } else {
      unmatched++;
      log(`⚠ No database match for slug: ${slug}`, "WARN");
    }
  }

  log(`✓ Matched ${matched} freelancers by slug`);
  if (unmatched > 0) {
    log(`⚠ ${unmatched} WordPress freelancers not in database`, "WARN");
  }

  // Save ID mapping for reference
  fs.writeFileSync(ID_MAPPING_FILE, JSON.stringify(idMapping, null, 2));
  log(`✓ Saved ID mapping to: ${ID_MAPPING_FILE}`);

  // Show first 3 mappings as test
  console.log("\n" + "=".repeat(70));
  console.log("SAMPLE ID MAPPINGS (First 3)");
  console.log("=".repeat(70));

  idMapping.slice(0, 3).forEach((m, i) => {
    console.log(`\n${i + 1}. ${m.name} (${m.slug})`);
    console.log(
      `   WordPress ID: ${m.wordpress_id} → Database ID: ${m.database_id}`,
    );
    console.log(
      `   Photo: ${m.wordpress_photo_blob} → ${m.database_photo_blob}`,
    );
    console.log(`   CV: ${m.wordpress_cv_blob} → ${m.database_cv_blob}`);
    if (m.wordpress_equipment_blob) {
      console.log(
        `   Equipment: ${m.wordpress_equipment_blob} → ${m.database_equipment_blob}`,
      );
    }
  });

  // Now rename files
  console.log("\n" + "=".repeat(70));
  console.log("RENAMING FILES");
  console.log("=".repeat(70));

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

  const fileMapping = [];
  const errors = [];

  for (let i = 0; i < idMapping.length; i++) {
    const mapping = idMapping[i];

    if ((i + 1) % 100 === 0) {
      log(`Progress: ${i + 1}/${idMapping.length}`);
    }

    const result = {
      freelancer_id: mapping.database_id,
      name: mapping.name,
      slug: mapping.slug,
      photo: null,
      cv: null,
      equipment: null,
    };

    // Process Photo
    if (
      mapping.wordpress_photo_blob &&
      mapping.database_photo_blob &&
      mapping.has_photo
    ) {
      const wpFiles = fs.readdirSync(OLD_IMAGES);

      // Find file with WordPress blob ID
      const sourceFile = wpFiles.find((f) =>
        f.startsWith(mapping.wordpress_photo_blob),
      );

      if (sourceFile) {
        const ext = path.extname(sourceFile);
        const targetFilename = `${mapping.database_photo_blob}${ext}`;
        const sourcePath = path.join(OLD_IMAGES, sourceFile);
        const targetPath = path.join(NEW_IMAGES, targetFilename);

        if (fs.existsSync(targetPath)) {
          stats.photos_skipped++;
          result.photo = {
            blob_id: mapping.database_photo_blob,
            filename: targetFilename,
            status: "already_exists",
          };
        } else {
          try {
            fs.copyFileSync(sourcePath, targetPath);
            stats.photos_copied++;
            result.photo = {
              blob_id: mapping.database_photo_blob,
              filename: targetFilename,
              original_wordpress_file: sourceFile,
              status: "copied",
            };
          } catch (error) {
            stats.photos_failed++;
            errors.push({
              freelancer: mapping.name,
              type: "photo",
              wordpress_blob: mapping.wordpress_photo_blob,
              database_blob: mapping.database_photo_blob,
              error: error.message,
            });
          }
        }
      } else {
        stats.photos_failed++;
        errors.push({
          freelancer: mapping.name,
          type: "photo",
          wordpress_blob: mapping.wordpress_photo_blob,
          reason: "wordpress_file_not_found",
        });
      }
    } else {
      stats.photos_skipped++;
    }

    // Process CV
    if (
      mapping.wordpress_cv_blob &&
      mapping.database_cv_blob &&
      mapping.has_cv
    ) {
      const wpFiles = fs.readdirSync(OLD_CVS);

      const sourceFile = wpFiles.find((f) =>
        f.startsWith(mapping.wordpress_cv_blob),
      );

      if (sourceFile) {
        const ext = path.extname(sourceFile);
        const targetFilename = `${mapping.database_cv_blob}${ext}`;
        const sourcePath = path.join(OLD_CVS, sourceFile);
        const targetPath = path.join(NEW_CVS, targetFilename);

        if (fs.existsSync(targetPath)) {
          stats.cvs_skipped++;
          result.cv = {
            blob_id: mapping.database_cv_blob,
            filename: targetFilename,
            status: "already_exists",
          };
        } else {
          try {
            fs.copyFileSync(sourcePath, targetPath);
            stats.cvs_copied++;
            result.cv = {
              blob_id: mapping.database_cv_blob,
              filename: targetFilename,
              original_wordpress_file: sourceFile,
              status: "copied",
            };
          } catch (error) {
            stats.cvs_failed++;
            errors.push({
              freelancer: mapping.name,
              type: "cv",
              wordpress_blob: mapping.wordpress_cv_blob,
              database_blob: mapping.database_cv_blob,
              error: error.message,
            });
          }
        }
      } else {
        stats.cvs_failed++;
        errors.push({
          freelancer: mapping.name,
          type: "cv",
          wordpress_blob: mapping.wordpress_cv_blob,
          reason: "wordpress_file_not_found",
        });
      }
    } else {
      stats.cvs_skipped++;
    }

    // Process Equipment
    if (
      mapping.wordpress_equipment_blob &&
      mapping.database_equipment_blob &&
      mapping.has_equipment
    ) {
      const wpFiles = fs.readdirSync(OLD_EQUIPMENT);

      const sourceFile = wpFiles.find((f) =>
        f.startsWith(mapping.wordpress_equipment_blob),
      );

      if (sourceFile) {
        const ext = path.extname(sourceFile);
        const targetFilename = `${mapping.database_equipment_blob}${ext}`;
        const sourcePath = path.join(OLD_EQUIPMENT, sourceFile);
        const targetPath = path.join(NEW_EQUIPMENT, targetFilename);

        if (fs.existsSync(targetPath)) {
          stats.equipment_skipped++;
          result.equipment = {
            blob_id: mapping.database_equipment_blob,
            filename: targetFilename,
            status: "already_exists",
          };
        } else {
          try {
            fs.copyFileSync(sourcePath, targetPath);
            stats.equipment_copied++;
            result.equipment = {
              blob_id: mapping.database_equipment_blob,
              filename: targetFilename,
              original_wordpress_file: sourceFile,
              status: "copied",
            };
          } catch (error) {
            stats.equipment_failed++;
            errors.push({
              freelancer: mapping.name,
              type: "equipment",
              wordpress_blob: mapping.wordpress_equipment_blob,
              database_blob: mapping.database_equipment_blob,
              error: error.message,
            });
          }
        }
      } else {
        stats.equipment_failed++;
        errors.push({
          freelancer: mapping.name,
          type: "equipment",
          wordpress_blob: mapping.wordpress_equipment_blob,
          reason: "wordpress_file_not_found",
        });
      }
    } else {
      stats.equipment_skipped++;
    }

    fileMapping.push(result);
  }

  // Save file mapping
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(fileMapping, null, 2));
  log(`\n✓ Saved file mapping to: ${MAPPING_FILE}`);

  // Save errors if any
  if (errors.length > 0) {
    const errorsFile = path.join(NEW_MEDIA_DIR, "renaming_errors.json");
    fs.writeFileSync(errorsFile, JSON.stringify(errors, null, 2));
    log(`✓ Saved ${errors.length} errors to: ${errorsFile}`);
  }

  // Display statistics
  log("\n" + "=".repeat(70));
  log("FINAL STATISTICS");
  log("=".repeat(70));
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

  log(`\nTotal Files Copied: ${totalSuccess}`);
  log(`Total Files Failed: ${totalFailed}`);

  if (totalFailed === 0) {
    log(
      "\n🎉 ALL FILES SUCCESSFULLY RENAMED WITH DATABASE BLOB IDS!",
      "SUCCESS",
    );
  } else {
    log(`\n⚠ ${totalFailed} files could not be processed`, "WARN");
  }

  log("\n" + "=".repeat(70));
  log("✓ Renaming complete!");
  log("\nFiles are now ready for Azure upload with correct Database Blob IDs");
  log(`\nOutput directory: ${NEW_MEDIA_DIR}`);
  log(`\nNext steps:`);
  log(`1. Review files in: ${NEW_IMAGES}`);
  log(`2. Upload to Azure Blob Storage`);
  log(`3. Run the SQL script from output/import_ready.sql`);
}

// Run
remapBlobIds().catch((error) => {
  log(`FATAL ERROR: ${error.message}`, "ERROR");
  console.error(error);
  process.exit(1);
});
