import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* =========================
   PATH SETUP
========================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLEANED_DATA = path.join(__dirname, "output", "crew_cleaned_data.json");

const MEDIA_DIR = path.join(__dirname, "downloaded_media");
const RENAMED_IMAGES_DIR = path.join(MEDIA_DIR, "images_cleaned");
const RENAMED_RESUMES_DIR = path.join(MEDIA_DIR, "resumes_cleaned");
const PROGRESS_FILE = path.join(MEDIA_DIR, "progress.json");

/* =========================
   ENSURE DIRECTORIES
========================= */

[RENAMED_IMAGES_DIR, RENAMED_RESUMES_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/* =========================
   GLOBAL ERROR GUARDS
========================= */

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught exception:", err);
});

/* =========================
   DOWNLOAD HELPER
========================= */

async function downloadFile(url, outputPath) {
  const axios = (await import("axios")).default;
  const stream = (await import("stream")).default;
  const { promisify } = await import("util");
  const finished = promisify(stream.finished);

  try {
    const response = await axios({
      method: "GET",
      url,
      responseType: "stream",
      timeout: 15000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    await finished(writer);

    return true;
  } catch (error) {
    console.error(`  ❌ Failed to download: ${error.message}`);
    return false;
  }
}

/* =========================
   MAIN PROCESS
========================= */

async function renameFiles() {
  console.log("🔄 Renaming and downloading media files...\n");

  if (!fs.existsSync(CLEANED_DATA)) {
    console.error(`❌ Missing data file: ${CLEANED_DATA}`);
    process.exit(1);
  }

  const crewData = JSON.parse(fs.readFileSync(CLEANED_DATA, "utf8"));
  console.log(`📊 Total crew members: ${crewData.length}\n`);

  /* =========================
     RESUME LOGIC
  ========================= */

  let startIndex = 0;

  if (fs.existsSync(PROGRESS_FILE)) {
    const saved = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
    startIndex = saved.lastIndex + 1;
    console.log(`▶ Resuming from crew #${startIndex + 1}\n`);
  }

  let imageSuccess = 0;
  let imageSkipped = 0;
  let imageFailed = 0;
  let resumeSuccess = 0;
  let resumeSkipped = 0;
  let resumeFailed = 0;

  for (let i = startIndex; i < crewData.length; i++) {
    const crew = crewData[i];

    console.log(`[${i + 1}/${crewData.length}] ${crew.name}`);

    /* =========================
       IMAGE
    ========================= */

    if (crew.image_url && crew.clean_image_filename) {
      const imagePath = path.join(
        RENAMED_IMAGES_DIR,
        crew.clean_image_filename
      );

      if (fs.existsSync(imagePath)) {
        console.log(`  ✓ Image exists`);
        imageSuccess++;
      } else {
        console.log(`  ⬇ Downloading image`);
        const ok = await downloadFile(crew.image_url, imagePath);
        ok ? imageSuccess++ : imageFailed++;
        await new Promise((r) => setTimeout(r, 200));
      }
    } else {
      console.log(`  ⊘ No image URL`);
      imageSkipped++;
    }

    /* =========================
       RESUME
    ========================= */

    if (crew.resume_url && crew.clean_resume_filename) {
      const resumePath = path.join(
        RENAMED_RESUMES_DIR,
        crew.clean_resume_filename
      );

      if (fs.existsSync(resumePath)) {
        console.log(`  ✓ Resume exists`);
        resumeSuccess++;
      } else {
        console.log(`  ⬇ Downloading resume`);
        const ok = await downloadFile(crew.resume_url, resumePath);
        ok ? resumeSuccess++ : resumeFailed++;
        await new Promise((r) => setTimeout(r, 200));
      }
    } else {
      console.log(`  ⊘ No resume URL`);
      resumeSkipped++;
    }

    /* =========================
       SAVE PROGRESS
    ========================= */

    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastIndex: i }, null, 2));

    console.log("");
  }

  /* =========================
     CLEANUP
  ========================= */

  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }

  /* =========================
     MAPPING FILE
  ========================= */

  const mapping = crewData
    .filter((c) => c.image_filename || c.resume_filename)
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      original_image: c.image_filename,
      clean_image: c.clean_image_filename,
      original_resume: c.resume_filename,
      clean_resume: c.clean_resume_filename,
    }));

  fs.writeFileSync(
    path.join(MEDIA_DIR, "filename_mapping.json"),
    JSON.stringify(mapping, null, 2)
  );

  /* =========================
     STATS
  ========================= */

  console.log("═══════════════════════════════");
  console.log("📊 FINAL STATISTICS");
  console.log("═══════════════════════════════");

  console.log("\nImages:");
  console.log(`  ✓ Success: ${imageSuccess}`);
  console.log(`  ⊘ Skipped: ${imageSkipped}`);
  console.log(`  ❌ Failed: ${imageFailed}`);

  console.log("\nResumes:");
  console.log(`  ✓ Success: ${resumeSuccess}`);
  console.log(`  ⊘ Skipped: ${resumeSkipped}`);
  console.log(`  ❌ Failed: ${resumeFailed}`);

  console.log("\n📁 Output:");
  console.log(`  Images:  ${RENAMED_IMAGES_DIR}`);
  console.log(`  Resumes: ${RENAMED_RESUMES_DIR}`);
  console.log(`  Mapping: ${path.join(MEDIA_DIR, "filename_mapping.json")}`);

  console.log("\n✨ Done!\n");
}

/* =========================
   RUN
========================= */

renameFiles();
