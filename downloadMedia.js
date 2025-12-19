const axios = require("axios");
const fs = require("fs");
const path = require("path");
const stream = require("stream");
const { promisify } = require("util");

const finished = promisify(stream.finished);

const OUTPUT_DIR = path.join(__dirname, "downloaded_media");
const CREW_DATA = path.join(__dirname, "output", "crew_lists_enriched.json");

// Create output directories
const IMAGES_DIR = path.join(OUTPUT_DIR, "images");
const RESUMES_DIR = path.join(OUTPUT_DIR, "resumes");

[OUTPUT_DIR, IMAGES_DIR, RESUMES_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * Download a file from URL with proper filename
 */
async function downloadFile(url, outputPath) {
  try {
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
      timeout: 30000,
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    await finished(writer);

    return true;
  } catch (error) {
    console.error(`Failed to download ${url}:`, error.message);
    return false;
  }
}

/**
 * Sanitize filename for filesystem
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-z0-9._-]/gi, "_")
    .replace(/__+/g, "_")
    .toLowerCase();
}

/**
 * Get file extension from URL or mime type
 */
function getExtension(url, mimeType) {
  // Try to get from URL first
  const urlExt = path.extname(url).toLowerCase();
  if (urlExt) return urlExt;

  // Fallback to mime type
  const mimeMap = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
  };

  return mimeMap[mimeType] || "";
}

/**
 * Main download process
 */
async function run() {
  console.log("=================================");
  console.log("MEDIA DOWNLOADER");
  console.log("=================================\n");

  // Load enriched crew data
  if (!fs.existsSync(CREW_DATA)) {
    console.error("Error: crew_lists_enriched.json not found!");
    console.error("Run improved-scraper.js first.");
    process.exit(1);
  }

  const crewData = JSON.parse(fs.readFileSync(CREW_DATA, "utf8"));
  console.log(`Loaded ${crewData.length} crew members\n`);

  let imageCount = 0;
  let resumeCount = 0;
  let errors = [];
  const manifest = [];

  for (let i = 0; i < crewData.length; i++) {
    const crew = crewData[i];
    console.log(`\n[${i + 1}/${crewData.length}] Processing: ${crew.title}`);

    const record = {
      id: crew.post_id,
      name: crew.title,
      slug: crew.slug,
      image_filename: null,
      resume_filename: null,
      image_original_url: null,
      resume_original_url: null,
    };

    // Download profile image
    if (crew.featured_image?.url) {
      const ext = getExtension(
        crew.featured_image.url,
        crew.featured_image.mime_type
      );

      // Create meaningful filename: crew-id_slug.ext
      const imageFilename = `${crew.post_id}_${sanitizeFilename(
        crew.slug
      )}${ext}`;
      const imagePath = path.join(IMAGES_DIR, imageFilename);

      console.log(`  Downloading image: ${imageFilename}`);
      const success = await downloadFile(crew.featured_image.url, imagePath);

      if (success) {
        imageCount++;
        record.image_filename = imageFilename;
        record.image_original_url = crew.featured_image.url;
      } else {
        errors.push({
          crew: crew.title,
          type: "image",
          url: crew.featured_image.url,
        });
      }

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 200));
    } else {
      console.log(`  ⚠ No profile image`);
    }

    // Download resume PDF
    if (crew.resume?.url) {
      const ext = getExtension(crew.resume.url, crew.resume.mime_type);

      // Create meaningful filename
      const resumeFilename = `${crew.post_id}_${sanitizeFilename(
        crew.slug
      )}${ext}`;
      const resumePath = path.join(RESUMES_DIR, resumeFilename);

      console.log(`  Downloading resume: ${resumeFilename}`);
      const success = await downloadFile(crew.resume.url, resumePath);

      if (success) {
        resumeCount++;
        record.resume_filename = resumeFilename;
        record.resume_original_url = crew.resume.url;
      } else {
        errors.push({ crew: crew.title, type: "resume", url: crew.resume.url });
      }

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 200));
    } else {
      console.log(`  ⚠ No resume`);
    }

    manifest.push(record);
  }

  // Save manifest
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "download_manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  // Save errors log if any
  if (errors.length > 0) {
    fs.writeFileSync(
      path.join(OUTPUT_DIR, "errors.json"),
      JSON.stringify(errors, null, 2)
    );
  }

  console.log("\n=================================");
  console.log("DOWNLOAD COMPLETE");
  console.log("=================================");
  console.log(`✓ Images downloaded: ${imageCount}`);
  console.log(`✓ Resumes downloaded: ${resumeCount}`);
  console.log(`✓ Errors: ${errors.length}`);
  console.log(`\nFiles saved to: ${OUTPUT_DIR}`);

  if (errors.length > 0) {
    console.log(`\n⚠ See errors.json for failed downloads`);
  }

  console.log("\n=================================\n");
}

run().catch(console.error);
