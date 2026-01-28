import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEDIA_DIR = path.join(__dirname, "downloaded_media_final");
const MATCHED_DATA = path.join(
  __dirname,
  "output",
  "freelancers_matched_clean.json",
);
const OUTPUT_FILE = path.join(__dirname, "output", "directory_diagnostic.json");

console.log("=".repeat(60));
console.log("DIRECTORY DIAGNOSTIC TOOL");
console.log("=".repeat(60));

// Check if directories exist
console.log("\n1. CHECKING DIRECTORY STRUCTURE");
console.log("-".repeat(60));

const directories = [
  { name: "Media Root", path: MEDIA_DIR },
  { name: "Photos", path: path.join(MEDIA_DIR, "photos") },
  { name: "CVs", path: path.join(MEDIA_DIR, "cvs") },
  { name: "Equipment", path: path.join(MEDIA_DIR, "equipment") },
];

const dirInfo = {};

directories.forEach((dir) => {
  const exists = fs.existsSync(dir.path);
  console.log(`${dir.name}: ${exists ? "✓ EXISTS" : "✗ NOT FOUND"}`);
  console.log(`  Path: ${dir.path}`);

  if (exists) {
    const files = fs.readdirSync(dir.path);
    console.log(`  Files: ${files.length}`);

    dirInfo[dir.name] = {
      path: dir.path,
      exists: true,
      fileCount: files.length,
      files: files,
    };
  } else {
    dirInfo[dir.name] = {
      path: dir.path,
      exists: false,
    };
  }
  console.log();
});

// Analyze file naming patterns
console.log("\n2. FILE NAMING PATTERN ANALYSIS");
console.log("-".repeat(60));

function analyzeFileNames(files) {
  const patterns = {
    withBlobId: [], // P000123, C000123, E000123
    withNumber: [], // 123-name, name-123
    withSlug: [], // some-slug-name
    other: [],
  };

  const extensions = {};

  files.forEach((file) => {
    const ext = path.extname(file).toLowerCase();
    extensions[ext] = (extensions[ext] || 0) + 1;

    // Check patterns
    if (/^[PCE]\d{6}/.test(file)) {
      patterns.withBlobId.push(file);
    } else if (/^\d+[-_]/.test(file) || /[-_]\d+\./.test(file)) {
      patterns.withNumber.push(file);
    } else if (/-/.test(file) || /_/.test(file)) {
      patterns.withSlug.push(file);
    } else {
      patterns.other.push(file);
    }
  });

  return { patterns, extensions };
}

["Photos", "CVs", "Equipment"].forEach((type) => {
  if (dirInfo[type] && dirInfo[type].exists && dirInfo[type].fileCount > 0) {
    console.log(`\n${type}:`);
    const analysis = analyzeFileNames(dirInfo[type].files);

    console.log("  Naming Patterns:");
    console.log(
      `    - With Blob ID (P/C/E######): ${analysis.patterns.withBlobId.length}`,
    );
    console.log(`    - With Number: ${analysis.patterns.withNumber.length}`);
    console.log(`    - With Slug/Dashes: ${analysis.patterns.withSlug.length}`);
    console.log(`    - Other: ${analysis.patterns.other.length}`);

    console.log("  File Extensions:");
    Object.entries(analysis.extensions).forEach(([ext, count]) => {
      console.log(`    - ${ext || "(no extension)"}: ${count}`);
    });

    console.log("  Sample Files:");
    dirInfo[type].files.slice(0, 10).forEach((f) => {
      console.log(`    - ${f}`);
    });

    dirInfo[type].analysis = analysis;
  }
});

// Load and check matched data
console.log("\n3. MATCHED DATA ANALYSIS");
console.log("-".repeat(60));

if (fs.existsSync(MATCHED_DATA)) {
  console.log("✓ Matched data file found");

  const data = JSON.parse(fs.readFileSync(MATCHED_DATA, "utf8"));
  const freelancers = data.freelancers || [];

  console.log(`Total freelancers: ${freelancers.length}`);

  const stats = {
    withPhoto: 0,
    withCV: 0,
    withEquipment: 0,
    photoBlobIds: [],
    cvBlobIds: [],
    equipmentBlobIds: [],
    sampleFreelancers: [],
  };

  freelancers.forEach((f, idx) => {
    if (f.photo && f.photo.blob_id) {
      stats.withPhoto++;
      if (idx < 5) stats.photoBlobIds.push(f.photo.blob_id);
    }
    if (f.cv && f.cv.blob_id) {
      stats.withCV++;
      if (idx < 5) stats.cvBlobIds.push(f.cv.blob_id);
    }
    if (f.equipment && f.equipment.blob_id) {
      stats.withEquipment++;
      if (idx < 5) stats.equipmentBlobIds.push(f.equipment.blob_id);
    }

    if (idx < 5) {
      stats.sampleFreelancers.push({
        name: f.name,
        slug: f.slug,
        id: f.freelancer_id,
        photo_blob_id: f.photo?.blob_id,
        cv_blob_id: f.cv?.blob_id,
        equipment_blob_id: f.equipment?.blob_id,
      });
    }
  });

  console.log(`  With photo blob ID: ${stats.withPhoto}`);
  console.log(`  With CV blob ID: ${stats.withCV}`);
  console.log(`  With equipment blob ID: ${stats.withEquipment}`);

  console.log("\nSample Blob IDs:");
  console.log("  Photos:", stats.photoBlobIds.join(", "));
  console.log("  CVs:", stats.cvBlobIds.join(", "));
  console.log("  Equipment:", stats.equipmentBlobIds.join(", "));

  console.log("\nSample Freelancers:");
  stats.sampleFreelancers.forEach((f) => {
    console.log(`  ${f.name} (${f.slug})`);
    console.log(`    ID: ${f.id}`);
    console.log(`    Photo: ${f.photo_blob_id || "none"}`);
    console.log(`    CV: ${f.cv_blob_id || "none"}`);
    console.log(`    Equipment: ${f.equipment_blob_id || "none"}`);
  });

  dirInfo.matchedData = stats;
} else {
  console.log("✗ Matched data file NOT found");
  console.log(`  Expected at: ${MATCHED_DATA}`);
}

// Cross-reference check
console.log("\n4. CROSS-REFERENCE CHECK");
console.log("-".repeat(60));

if (dirInfo.matchedData && dirInfo.Photos && dirInfo.Photos.exists) {
  console.log("\nChecking if sample blob IDs exist in photo files:");

  dirInfo.matchedData.sampleFreelancers.forEach((f) => {
    if (f.photo_blob_id) {
      const found = dirInfo.Photos.files.some((file) =>
        file.toLowerCase().includes(f.photo_blob_id.toLowerCase()),
      );
      console.log(
        `  ${f.photo_blob_id} (${f.name}): ${found ? "✓ FOUND" : "✗ NOT FOUND"}`,
      );

      if (!found) {
        // Try to find by slug
        const slugMatch = dirInfo.Photos.files.find((file) =>
          file.toLowerCase().includes(f.slug.toLowerCase()),
        );
        if (slugMatch) {
          console.log(`    But found by slug: ${slugMatch}`);
        }
      }
    }
  });
}

// Generate recommendations
console.log("\n5. RECOMMENDATIONS");
console.log("-".repeat(60));

const recommendations = [];

if (!dirInfo["Media Root"] || !dirInfo["Media Root"].exists) {
  recommendations.push(
    "⚠ The 'downloaded_media_final' directory does not exist.",
  );
  recommendations.push(
    "  Check if you're running the script from the correct location.",
  );
}

["Photos", "CVs", "Equipment"].forEach((type) => {
  if (!dirInfo[type] || !dirInfo[type].exists) {
    recommendations.push(`⚠ The '${type}' subdirectory does not exist.`);
  } else if (dirInfo[type].fileCount === 0) {
    recommendations.push(`⚠ The '${type}' directory is empty.`);
  }
});

if (dirInfo.Photos && dirInfo.Photos.exists && dirInfo.Photos.analysis) {
  const analysis = dirInfo.Photos.analysis;
  if (analysis.patterns.withBlobId.length === 0) {
    recommendations.push("⚠ No files found with blob ID pattern (P######).");
    recommendations.push("  Files may need to be renamed before matching.");
  }
}

if (!fs.existsSync(MATCHED_DATA)) {
  recommendations.push(
    "⚠ Run 'match-with-database.js' first to generate matched data.",
  );
}

if (recommendations.length === 0) {
  recommendations.push(
    "✓ All checks passed! You should be able to run the rename script.",
  );
} else {
  recommendations.forEach((rec) => console.log(rec));
}

// Save detailed report
const report = {
  timestamp: new Date().toISOString(),
  directories: dirInfo,
  recommendations,
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
console.log(`\n✓ Detailed report saved to: ${OUTPUT_FILE}`);

console.log("\n" + "=".repeat(60));
console.log("DIAGNOSTIC COMPLETE");
console.log("=".repeat(60));
