// cleanAllMedia.js
import fs from "fs";
import path from "path";
import crypto from "crypto";
import imghash from "imghash";

const SOURCE_DIR = "./media";
const OUTPUT_DIR = "./cleanedMedia";
const DUPLICATE_DIR = "./duplicates";
const DUPLICATE_LOG = "./duplicates.json";

// Ensure folders exist
[OUTPUT_DIR, DUPLICATE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

const files = fs.readdirSync(SOURCE_DIR);
const duplicates = [];

// Helper: hash file content
const hashFile = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
};

// Helper: extract trailing number from filename (e.g., resume-2.pdf -> 2)
const getNumber = (filename) => {
  const match = filename.match(/(\d+)(?=\.[^/.]+$)/);
  return match ? parseInt(match[1], 10) : 0;
};

// Helper: compute Hamming distance between two hex hashes
const hammingDistance = (hashA, hashB) => {
  const binA = BigInt("0x" + hashA).toString(2).padStart(64, "0");
  const binB = BigInt("0x" + hashB).toString(2).padStart(64, "0");
  let dist = 0;
  for (let i = 0; i < binA.length; i++) {
    if (binA[i] !== binB[i]) dist++;
  }
  return dist;
};

// --- Process PDFs/resumes ---
const seenPDF = {}; // hash -> { file, number }
const pdfFiles = files.filter(f => /\.pdf$/i.test(f));

pdfFiles.forEach(file => {
  const fullPath = path.join(SOURCE_DIR, file);
  const hash = hashFile(fullPath);
  const num = getNumber(file);

  if (seenPDF[hash]) {
    const existing = seenPDF[hash];
    if (num > existing.number) {
      duplicates.push({ original: existing.file, replacedBy: file });
      seenPDF[hash] = { file, number: num };
    } else {
      duplicates.push({ original: file, replacedBy: existing.file });
    }
  } else {
    seenPDF[hash] = { file, number: num };
  }
});

// Copy unique/latest PDFs
Object.values(seenPDF).forEach(({ file }) => {
  fs.copyFileSync(path.join(SOURCE_DIR, file), path.join(OUTPUT_DIR, file));
});

// --- Process images ---
const imageFiles = files.filter(f => /\.(jpe?g|png)$/i.test(f));
const hashMap = {}; // filename -> perceptual hash
const processedImages = new Set();

(async () => {
  console.log("Generating perceptual hashes for images...");
  for (const file of imageFiles) {
    const fullPath = path.join(SOURCE_DIR, file);
    hashMap[file] = await imghash.hash(fullPath, 16);
  }

  console.log("Checking for similar images...");
  for (let i = 0; i < imageFiles.length; i++) {
    const fileA = imageFiles[i];
    if (processedImages.has(fileA)) continue;

    let keepFile = fileA;

    for (let j = i + 1; j < imageFiles.length; j++) {
      const fileB = imageFiles[j];
      if (processedImages.has(fileB)) continue;

      const dist = hammingDistance(hashMap[fileA], hashMap[fileB]);
      if (dist <= 5) { // tweak threshold if needed
        // Keep the larger file
        const statA = fs.statSync(path.join(SOURCE_DIR, keepFile));
        const statB = fs.statSync(path.join(SOURCE_DIR, fileB));
        if (statB.size > statA.size) keepFile = fileB;

        // Move duplicate to duplicates folder
        const toMove = fileB === keepFile ? fileA : fileB;
        fs.copyFileSync(path.join(SOURCE_DIR, toMove), path.join(DUPLICATE_DIR, toMove));
        duplicates.push({ original: toMove, replacedBy: keepFile });
        processedImages.add(toMove);
      }
    }

    // Copy the chosen image to cleanedMedia
    fs.copyFileSync(path.join(SOURCE_DIR, keepFile), path.join(OUTPUT_DIR, keepFile));
    processedImages.add(keepFile);
  }

  // Save duplicate report
  fs.writeFileSync(DUPLICATE_LOG, JSON.stringify(duplicates, null, 2, 2));

  console.log("✔ Media cleaning complete!");
  console.log(`✔ Unique files copied to ${OUTPUT_DIR}/`);
  console.log(`✔ Duplicates moved to ${DUPLICATE_DIR}/ and logged in ${DUPLICATE_LOG}`);
})();
