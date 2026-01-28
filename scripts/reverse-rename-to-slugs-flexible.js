import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ID TO SLUG CONVERTER - FLEXIBLE OPTIONS
 *
 * This script gives you THREE options for handling your media files:
 *
 * OPTION 1: CREATE SLUG COPIES (RECOMMENDED)
 *   - Keep original P000123.pdf files for Azure upload
 *   - Create slug-based copies (john-smith.pdf) for SQL programmer
 *   - Result: You have BOTH versions
 *
 * OPTION 2: RENAME IN PLACE
 *   - Rename all C000123.pdf → john-smith.pdf
 *   - Rename all E000123.pdf → john-smith-equipment.pdf
 *   - WARNING: You'll need to re-download or rename back for Azure upload
 *
 * OPTION 3: CREATE MAPPING FILE ONLY
 *   - Generate a CSV/JSON mapping of ID → Slug
 *   - Don't move any files
 *   - Let SQL programmer handle the rename
 */

// Configuration
const MATCHED_DATA = path.join(
  __dirname,
  "output",
  "freelancers_matched_clean.json",
);

// Source directories
const AZURE_MEDIA_DIR = path.join(__dirname, "azure_ready_media");
const AZURE_CVS = path.join(AZURE_MEDIA_DIR, "cvs");
const AZURE_EQUIPMENT = path.join(AZURE_MEDIA_DIR, "equipment");

// Output directory for slug-based copies
const SLUG_MEDIA_DIR = path.join(__dirname, "slug_based_media");
const SLUG_CVS = path.join(SLUG_MEDIA_DIR, "cvs");
const SLUG_EQUIPMENT = path.join(SLUG_MEDIA_DIR, "equipment");

// Mapping output
const OUTPUT_DIR = path.join(__dirname, "output");
const MAPPING_CSV = path.join(OUTPUT_DIR, "id_to_slug_mapping.csv");
const MAPPING_JSON = path.join(OUTPUT_DIR, "id_to_slug_mapping.json");

// Set your preferred option here
const MODE = process.argv[2] || "COPY"; // OPTIONS: "COPY", "RENAME", "MAPPING_ONLY"

/**
 * Extract numeric ID from blob ID
 */
function extractFreelancerId(blobId) {
  const match = blobId.match(/^[PCE](\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Find file in directory by blob ID
 */
function findFileByBlobId(directory, blobId) {
  if (!fs.existsSync(directory)) {
    return null;
  }

  const files = fs.readdirSync(directory);
  const found = files.find((f) => {
    const basename = path.basename(f, path.extname(f));
    return basename.startsWith(blobId) || basename === blobId;
  });

  return found ? path.join(directory, found) : null;
}

/**
 * Generate slug-based filename
 */
function getSlugFilename(slug, type, extension) {
  if (type === "cv") {
    return `${slug}${extension}`; // john-smith.pdf
  } else if (type === "equipment") {
    return `${slug}-equipment${extension}`; // john-smith-equipment.pdf
  }
  return `${slug}${extension}`;
}

/**
 * Main processing function
 */
async function processFiles() {
  console.log("=".repeat(70));
  console.log("ID TO SLUG CONVERTER");
  console.log("=".repeat(70));
  console.log(`MODE: ${MODE}`);
  console.log("=".repeat(70));

  // Load matched data
  if (!fs.existsSync(MATCHED_DATA)) {
    console.error("ERROR: freelancers_matched_clean.json not found!");
    console.error(`Expected: ${MATCHED_DATA}`);
    process.exit(1);
  }

  const matchedData = JSON.parse(fs.readFileSync(MATCHED_DATA, "utf8"));
  const freelancers = matchedData.freelancers;

  console.log(`\n✓ Loaded ${freelancers.length} freelancers\n`);

  // Create output directories if needed
  if (MODE === "COPY") {
    [SLUG_MEDIA_DIR, SLUG_CVS, SLUG_EQUIPMENT].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Build mapping data
  const mapping = {
    cvs: [],
    equipment: [],
  };

  const stats = {
    cvs_processed: 0,
    cvs_not_found: 0,
    equipment_processed: 0,
    equipment_not_found: 0,
  };

  console.log("Processing files...\n");

  for (const f of freelancers) {
    // Process CV
    if (f.cv.blob_id) {
      const sourcePath = findFileByBlobId(AZURE_CVS, f.cv.blob_id);

      if (sourcePath) {
        const ext = path.extname(sourcePath);
        const slugFilename = getSlugFilename(f.slug, "cv", ext);

        mapping.cvs.push({
          freelancer_id: f.freelancer_id,
          name: f.name,
          slug: f.slug,
          blob_id: f.cv.blob_id,
          id_based_filename: path.basename(sourcePath),
          slug_based_filename: slugFilename,
          source_path: sourcePath,
          dest_path_copy: path.join(SLUG_CVS, slugFilename),
          dest_path_rename: path.join(AZURE_CVS, slugFilename),
        });

        stats.cvs_processed++;
      } else {
        stats.cvs_not_found++;
        console.log(`⚠ CV not found for ${f.name} (${f.cv.blob_id})`);
      }
    }

    // Process Equipment
    if (f.equipment.blob_id) {
      const sourcePath = findFileByBlobId(AZURE_EQUIPMENT, f.equipment.blob_id);

      if (sourcePath) {
        const ext = path.extname(sourcePath);
        const slugFilename = getSlugFilename(f.slug, "equipment", ext);

        mapping.equipment.push({
          freelancer_id: f.freelancer_id,
          name: f.name,
          slug: f.slug,
          blob_id: f.equipment.blob_id,
          id_based_filename: path.basename(sourcePath),
          slug_based_filename: slugFilename,
          source_path: sourcePath,
          dest_path_copy: path.join(SLUG_EQUIPMENT, slugFilename),
          dest_path_rename: path.join(AZURE_EQUIPMENT, slugFilename),
        });

        stats.equipment_processed++;
      } else {
        stats.equipment_not_found++;
        console.log(
          `⚠ Equipment not found for ${f.name} (${f.equipment.blob_id})`,
        );
      }
    }
  }

  // Save mapping files
  console.log("\nSaving mapping files...");

  // JSON format
  const jsonMapping = {
    generated_at: new Date().toISOString(),
    mode: MODE,
    statistics: stats,
    cvs: mapping.cvs,
    equipment: mapping.equipment,
  };

  fs.writeFileSync(MAPPING_JSON, JSON.stringify(jsonMapping, null, 2));
  console.log(`✓ Saved JSON mapping: ${MAPPING_JSON}`);

  // CSV format
  const csvRows = [
    "Type,FreelancerID,Name,Slug,BlobID,ID_Filename,Slug_Filename,SourcePath",
  ];

  mapping.cvs.forEach((m) => {
    csvRows.push(
      `CV,${m.freelancer_id},"${m.name}",${m.slug},${m.blob_id},${m.id_based_filename},${m.slug_based_filename},"${m.source_path}"`,
    );
  });

  mapping.equipment.forEach((m) => {
    csvRows.push(
      `Equipment,${m.freelancer_id},"${m.name}",${m.slug},${m.blob_id},${m.id_based_filename},${m.slug_based_filename},"${m.source_path}"`,
    );
  });

  fs.writeFileSync(MAPPING_CSV, csvRows.join("\n"));
  console.log(`✓ Saved CSV mapping: ${MAPPING_CSV}`);

  // Execute based on mode
  console.log("\n" + "=".repeat(70));

  if (MODE === "MAPPING_ONLY") {
    console.log("MODE: MAPPING ONLY - No files moved or renamed");
    console.log("✓ Mapping files generated successfully");
    console.log("\nProvide these files to your SQL programmer:");
    console.log(`  - ${MAPPING_CSV}`);
    console.log(`  - ${MAPPING_JSON}`);
  } else if (MODE === "COPY") {
    console.log("MODE: COPY - Creating slug-based copies");
    console.log(
      "Original ID-based files will remain unchanged for Azure upload\n",
    );

    let copiedCvs = 0;
    let copiedEquipment = 0;

    // Copy CVs
    for (const m of mapping.cvs) {
      if (!fs.existsSync(m.dest_path_copy)) {
        fs.copyFileSync(m.source_path, m.dest_path_copy);
        copiedCvs++;
      }
    }

    // Copy Equipment
    for (const m of mapping.equipment) {
      if (!fs.existsSync(m.dest_path_copy)) {
        fs.copyFileSync(m.source_path, m.dest_path_copy);
        copiedEquipment++;
      }
    }

    console.log(`✓ Copied ${copiedCvs} CV files to: ${SLUG_CVS}`);
    console.log(
      `✓ Copied ${copiedEquipment} Equipment files to: ${SLUG_EQUIPMENT}`,
    );
    console.log(
      "\n✓ ORIGINAL files remain in azure_ready_media/ for Azure upload",
    );
    console.log(
      "✓ SLUG-BASED copies created in slug_based_media/ for SQL import",
    );
  } else if (MODE === "RENAME") {
    console.log("MODE: RENAME - Renaming files in place");
    console.log("⚠ WARNING: Original ID-based files will be renamed!");
    console.log("You will need to rename them back for Azure upload\n");

    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question(
      "Are you sure you want to rename files in place? (yes/no): ",
      (answer) => {
        readline.close();

        if (answer.toLowerCase() !== "yes") {
          console.log("\nRename cancelled. Run with MODE='COPY' instead.");
          process.exit(0);
        }

        let renamedCvs = 0;
        let renamedEquipment = 0;

        // Rename CVs
        for (const m of mapping.cvs) {
          const newPath = path.join(
            path.dirname(m.source_path),
            m.slug_based_filename,
          );
          if (m.source_path !== newPath && !fs.existsSync(newPath)) {
            fs.renameSync(m.source_path, newPath);
            renamedCvs++;
          }
        }

        // Rename Equipment
        for (const m of mapping.equipment) {
          const newPath = path.join(
            path.dirname(m.source_path),
            m.slug_based_filename,
          );
          if (m.source_path !== newPath && !fs.existsSync(newPath)) {
            fs.renameSync(m.source_path, newPath);
            renamedEquipment++;
          }
        }

        console.log(`\n✓ Renamed ${renamedCvs} CV files`);
        console.log(`✓ Renamed ${renamedEquipment} Equipment files`);
        console.log(
          "\n⚠ Remember to rename back to ID format before Azure upload!",
        );
      },
    );

    return; // Exit early to wait for user input
  }

  // Display statistics
  console.log("\n" + "=".repeat(70));
  console.log("STATISTICS");
  console.log("=".repeat(70));
  console.log(
    `CVs:        Found=${stats.cvs_processed}, Missing=${stats.cvs_not_found}`,
  );
  console.log(
    `Equipment:  Found=${stats.equipment_processed}, Missing=${stats.equipment_not_found}`,
  );
  console.log("\n" + "=".repeat(70));
  console.log("NEXT STEPS");
  console.log("=".repeat(70));

  if (MODE === "COPY") {
    console.log("\nFor SQL Import (use slug-based files):");
    console.log(`  CVs:       ${SLUG_CVS}`);
    console.log(`  Equipment: ${SLUG_EQUIPMENT}`);
    console.log("\nFor Azure Upload (use ID-based files):");
    console.log(`  CVs:       ${AZURE_CVS}`);
    console.log(`  Equipment: ${AZURE_EQUIPMENT}`);
  } else if (MODE === "MAPPING_ONLY") {
    console.log("\nProvide mapping files to SQL programmer:");
    console.log(`  ${MAPPING_CSV}`);
    console.log(`  ${MAPPING_JSON}`);
  }
}

// Display usage if no mode specified
if (!process.argv[2]) {
  console.log("\n" + "=".repeat(70));
  console.log("USAGE:");
  console.log("=".repeat(70));
  console.log("\nOption 1 - Create slug-based copies (RECOMMENDED):");
  console.log("  node reverse-rename-to-slugs-flexible.js COPY");
  console.log("\nOption 2 - Generate mapping files only:");
  console.log("  node reverse-rename-to-slugs-flexible.js MAPPING_ONLY");
  console.log("\nOption 3 - Rename files in place (USE WITH CAUTION):");
  console.log("  node reverse-rename-to-slugs-flexible.js RENAME");
  console.log("\n" + "=".repeat(70));
  console.log("\nDefaulting to COPY mode...\n");
}

// Run
processFiles().catch((error) => {
  console.error(`FATAL ERROR: ${error.message}`);
  console.error(error);
  process.exit(1);
});
