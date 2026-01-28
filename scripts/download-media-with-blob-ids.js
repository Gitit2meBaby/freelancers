import fs from "fs";
import https from "https";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { URL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const INPUT_FILE = path.join(__dirname, "output", "freelancers_complete.json");
const OUTPUT_DIR = path.join(__dirname, "downloaded_media_final");
const IMAGES_DIR = path.join(OUTPUT_DIR, "photos");
const CVS_DIR = path.join(OUTPUT_DIR, "cvs");
const EQUIPMENT_DIR = path.join(OUTPUT_DIR, "equipment");
const PROGRESS_FILE = path.join(OUTPUT_DIR, "download_progress.json");
const MAPPING_FILE = path.join(OUTPUT_DIR, "blob_id_mapping.json");
const ERRORS_FILE = path.join(OUTPUT_DIR, "download_errors.json");
const LOG_FILE = path.join(OUTPUT_DIR, "download_log.txt");

// Ensure directories exist
[OUTPUT_DIR, IMAGES_DIR, CVS_DIR, EQUIPMENT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Logging
function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

// Generate FreelancerID from slug (temporary - will need database lookup)
// This creates a consistent numeric ID from the slug for demonstration
function generateFreelancerIdFromSlug(slug) {
  // Simple hash function to generate consistent ID from slug
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    const char = slug.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Make it positive and within reasonable range
  return Math.abs(hash) % 100000;
}

// Generate Blob IDs
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
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    return ext || ".pdf"; // Default to .pdf for CVs/equipment
  } catch (e) {
    return ".pdf";
  }
}

// Download file with retry logic
async function downloadFile(url, outputPath, retries = 3) {
  return new Promise((resolve, reject) => {
    const tryDownload = (attemptsLeft) => {
      const protocol = url.startsWith("https") ? https : http;

      const file = fs.createWriteStream(outputPath);

      protocol
        .get(url, (response) => {
          // Handle redirects
          if (
            response.statusCode === 301 ||
            response.statusCode === 302 ||
            response.statusCode === 307 ||
            response.statusCode === 308
          ) {
            file.close();
            fs.unlinkSync(outputPath);
            const redirectUrl = response.headers.location;
            log(`Redirecting to: ${redirectUrl}`, "INFO");
            return downloadFile(redirectUrl, outputPath, retries).then(
              resolve,
              reject
            );
          }

          if (response.statusCode !== 200) {
            file.close();
            fs.unlinkSync(outputPath);
            if (attemptsLeft > 0) {
              log(
                `HTTP ${response.statusCode}, retrying... (${attemptsLeft} attempts left)`,
                "WARN"
              );
              setTimeout(() => tryDownload(attemptsLeft - 1), 2000);
            } else {
              reject(
                new Error(
                  `HTTP ${response.statusCode}: ${response.statusMessage}`
                )
              );
            }
            return;
          }

          response.pipe(file);

          file.on("finish", () => {
            file.close();
            resolve(true);
          });

          file.on("error", (err) => {
            file.close();
            fs.unlinkSync(outputPath);
            if (attemptsLeft > 0) {
              log(`Error writing file, retrying...`, "WARN");
              setTimeout(() => tryDownload(attemptsLeft - 1), 2000);
            } else {
              reject(err);
            }
          });
        })
        .on("error", (err) => {
          file.close();
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          if (attemptsLeft > 0) {
            log(`Network error, retrying...`, "WARN");
            setTimeout(() => tryDownload(attemptsLeft - 1), 2000);
          } else {
            reject(err);
          }
        });
    };

    tryDownload(retries);
  });
}

// Load progress
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
  }
  return {
    lastProcessedIndex: -1,
    completed: [],
    errors: [],
  };
}

// Save progress
function saveProgress(data) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

// Main download function
async function downloadAllMedia() {
  log("=".repeat(60));
  log("MEDIA DOWNLOADER WITH BLOB ID NAMING");
  log("=".repeat(60));

  // Load freelancer data
  if (!fs.existsSync(INPUT_FILE)) {
    log(`ERROR: Input file not found: ${INPUT_FILE}`, "ERROR");
    log("Please run comprehensive-freelancer-scraper.js first!", "ERROR");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  const freelancers = data.freelancers;

  log(`Loaded ${freelancers.length} freelancers`);

  // Load progress
  const progress = loadProgress();
  const completedSlugs = new Set(progress.completed);
  const errors = progress.errors || [];
  const blobIdMapping = [];

  let stats = {
    photos_downloaded: 0,
    photos_skipped: 0,
    photos_failed: 0,
    cvs_downloaded: 0,
    cvs_skipped: 0,
    cvs_failed: 0,
    equipment_downloaded: 0,
    equipment_skipped: 0,
    equipment_failed: 0,
  };

  // Process each freelancer
  for (let i = progress.lastProcessedIndex + 1; i < freelancers.length; i++) {
    const freelancer = freelancers[i];
    const slug = freelancer.slug;

    log(`\n[${i + 1}/${freelancers.length}] ${freelancer.name} (${slug})`);

    // Skip if already completed
    if (completedSlugs.has(slug)) {
      log("  Already processed, skipping...", "INFO");
      continue;
    }

    // Generate FreelancerID (in production, this would come from database lookup)
    const freelancerId = generateFreelancerIdFromSlug(slug);
    log(`  FreelancerID: ${freelancerId} (generated from slug)`);

    // Generate Blob IDs
    const photoBlobId = generatePhotoBlobId(freelancerId);
    const cvBlobId = generateCvBlobId(freelancerId);
    const equipmentBlobId = generateEquipmentBlobId(freelancerId);

    const mapping = {
      name: freelancer.name,
      slug: slug,
      freelancer_id: freelancerId,
      photo_blob_id: null,
      cv_blob_id: null,
      equipment_blob_id: null,
      original_photo_url: null,
      original_cv_url: null,
      original_equipment_url: null,
      downloaded_photo: false,
      downloaded_cv: false,
      downloaded_equipment: false,
    };

    // Download Photo
    if (freelancer.image_url) {
      const ext = getExtension(freelancer.image_url);
      const filename = `${photoBlobId}${ext}`;
      const filePath = path.join(IMAGES_DIR, filename);

      if (fs.existsSync(filePath)) {
        log(`  ✓ Photo already exists: ${filename}`);
        stats.photos_skipped++;
        mapping.photo_blob_id = photoBlobId;
        mapping.downloaded_photo = true;
      } else {
        try {
          log(`  ⬇ Downloading photo: ${filename}`);
          await downloadFile(freelancer.image_url, filePath);
          log(`  ✓ Photo downloaded: ${filename}`, "SUCCESS");
          stats.photos_downloaded++;
          mapping.photo_blob_id = photoBlobId;
          mapping.original_photo_url = freelancer.image_url;
          mapping.downloaded_photo = true;
        } catch (error) {
          log(`  ✗ Photo failed: ${error.message}`, "ERROR");
          stats.photos_failed++;
          errors.push({
            freelancer: freelancer.name,
            slug: slug,
            type: "photo",
            url: freelancer.image_url,
            error: error.message,
          });
        }
      }

      // Small delay between downloads
      await new Promise((resolve) => setTimeout(resolve, 300));
    } else {
      log(`  ⊘ No photo URL`);
      stats.photos_skipped++;
    }

    // Download CV
    if (freelancer.cv_url) {
      const ext = getExtension(freelancer.cv_url);
      const filename = `${cvBlobId}${ext}`;
      const filePath = path.join(CVS_DIR, filename);

      if (fs.existsSync(filePath)) {
        log(`  ✓ CV already exists: ${filename}`);
        stats.cvs_skipped++;
        mapping.cv_blob_id = cvBlobId;
        mapping.downloaded_cv = true;
      } else {
        try {
          log(`  ⬇ Downloading CV: ${filename}`);
          await downloadFile(freelancer.cv_url, filePath);
          log(`  ✓ CV downloaded: ${filename}`, "SUCCESS");
          stats.cvs_downloaded++;
          mapping.cv_blob_id = cvBlobId;
          mapping.original_cv_url = freelancer.cv_url;
          mapping.downloaded_cv = true;
        } catch (error) {
          log(`  ✗ CV failed: ${error.message}`, "ERROR");
          stats.cvs_failed++;
          errors.push({
            freelancer: freelancer.name,
            slug: slug,
            type: "cv",
            url: freelancer.cv_url,
            error: error.message,
          });
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    } else {
      log(`  ⊘ No CV URL`);
      stats.cvs_skipped++;
    }

    // Download Equipment List
    if (freelancer.equipment_url) {
      const ext = getExtension(freelancer.equipment_url);
      const filename = `${equipmentBlobId}${ext}`;
      const filePath = path.join(EQUIPMENT_DIR, filename);

      if (fs.existsSync(filePath)) {
        log(`  ✓ Equipment list already exists: ${filename}`);
        stats.equipment_skipped++;
        mapping.equipment_blob_id = equipmentBlobId;
        mapping.downloaded_equipment = true;
      } else {
        try {
          log(`  ⬇ Downloading equipment list: ${filename}`);
          await downloadFile(freelancer.equipment_url, filePath);
          log(`  ✓ Equipment list downloaded: ${filename}`, "SUCCESS");
          stats.equipment_downloaded++;
          mapping.equipment_blob_id = equipmentBlobId;
          mapping.original_equipment_url = freelancer.equipment_url;
          mapping.downloaded_equipment = true;
        } catch (error) {
          log(`  ✗ Equipment list failed: ${error.message}`, "ERROR");
          stats.equipment_failed++;
          errors.push({
            freelancer: freelancer.name,
            slug: slug,
            type: "equipment",
            url: freelancer.equipment_url,
            error: error.message,
          });
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    } else {
      log(`  ⊘ No equipment list URL`);
      stats.equipment_skipped++;
    }

    // Add to mapping
    blobIdMapping.push(mapping);

    // Mark as completed
    completedSlugs.add(slug);

    // Save progress
    progress.lastProcessedIndex = i;
    progress.completed = Array.from(completedSlugs);
    progress.errors = errors;
    saveProgress(progress);
  }

  // Save blob ID mapping
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(blobIdMapping, null, 2));
  log(`\n✓ Saved blob ID mapping to: ${MAPPING_FILE}`);

  // Save errors
  if (errors.length > 0) {
    fs.writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2));
    log(`✓ Saved ${errors.length} errors to: ${ERRORS_FILE}`);
  }

  // Display final statistics
  log("\n" + "=".repeat(60));
  log("DOWNLOAD STATISTICS");
  log("=".repeat(60));
  log(`Photos:`);
  log(`  Downloaded: ${stats.photos_downloaded}`);
  log(`  Skipped:    ${stats.photos_skipped}`);
  log(`  Failed:     ${stats.photos_failed}`);
  log(`\nCVs:`);
  log(`  Downloaded: ${stats.cvs_downloaded}`);
  log(`  Skipped:    ${stats.cvs_skipped}`);
  log(`  Failed:     ${stats.cvs_failed}`);
  log(`\nEquipment Lists:`);
  log(`  Downloaded: ${stats.equipment_downloaded}`);
  log(`  Skipped:    ${stats.equipment_skipped}`);
  log(`  Failed:     ${stats.equipment_failed}`);
  log(`\nTotal Errors: ${errors.length}`);

  log("\n" + "=".repeat(60));
  log("OUTPUT DIRECTORIES");
  log("=".repeat(60));
  log(`Photos:    ${IMAGES_DIR}`);
  log(`CVs:       ${CVS_DIR}`);
  log(`Equipment: ${EQUIPMENT_DIR}`);
  log(`Mapping:   ${MAPPING_FILE}`);

  // Cleanup progress file
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
    log("\n✓ Cleaned up progress file");
  }

  log("\n" + "=".repeat(60));
  log("DOWNLOAD COMPLETE", "SUCCESS");
  log("=".repeat(60));
}

// Run
downloadAllMedia().catch((error) => {
  log(`FATAL ERROR: ${error.message}`, "ERROR");
  console.error(error);
});
