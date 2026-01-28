import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input files
const ID_MAPPING = path.join(
  __dirname,
  "azure_ready_media",
  "wordpress_to_database_id_mapping.json",
);
const MATCHED_DATA = path.join(
  __dirname,
  "output",
  "freelancers_matched_clean.json",
);
const FILE_MAPPING = path.join(
  __dirname,
  "azure_ready_media",
  "file_mapping.json",
);

// Output files
const OUTPUT_DIR = path.join(__dirname, "output");
const FORMAT1_OUTPUT = path.join(OUTPUT_DIR, "database_import_flat.json");
const FORMAT2_OUTPUT = path.join(OUTPUT_DIR, "database_import_by_table.json");
const LOG_FILE = path.join(OUTPUT_DIR, "final_mapping_log.txt");

// Clear log
if (fs.existsSync(LOG_FILE)) {
  fs.unlinkSync(LOG_FILE);
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + "\n");
}

function createFinalMapping() {
  log("=".repeat(70));
  log("CREATING FINAL DATABASE IMPORT JSON FILES");
  log("=".repeat(70));

  // Load ID mapping
  if (!fs.existsSync(ID_MAPPING)) {
    log("ERROR: ID mapping not found!");
    log(`Expected: ${ID_MAPPING}`);
    process.exit(1);
  }
  const idMapping = JSON.parse(fs.readFileSync(ID_MAPPING, "utf8"));
  log(`✓ Loaded ${idMapping.length} ID mappings`);

  // Load matched data (has bio, links, skills)
  if (!fs.existsSync(MATCHED_DATA)) {
    log("ERROR: Matched data not found!");
    log(`Expected: ${MATCHED_DATA}`);
    process.exit(1);
  }
  const matchedData = JSON.parse(fs.readFileSync(MATCHED_DATA, "utf8"));
  const freelancers = matchedData.freelancers;
  log(`✓ Loaded ${freelancers.length} freelancers with bio/links/skills`);

  // Load file mapping (has actual file status)
  if (!fs.existsSync(FILE_MAPPING)) {
    log("ERROR: File mapping not found!");
    log(`Expected: ${FILE_MAPPING}`);
    process.exit(1);
  }
  const fileMapping = JSON.parse(fs.readFileSync(FILE_MAPPING, "utf8"));
  log(`✓ Loaded ${fileMapping.length} file mappings`);

  // Create indexed lookups
  const matchedBySlug = {};
  freelancers.forEach((f) => {
    matchedBySlug[f.slug.toLowerCase()] = f;
  });

  const filesByFreelancerId = {};
  fileMapping.forEach((f) => {
    filesByFreelancerId[f.freelancer_id] = f;
  });

  log("\nProcessing data...");

  // Statistics
  const stats = {
    total: 0,
    with_photo: 0,
    with_cv: 0,
    with_equipment: 0,
    with_bio: 0,
    with_links: 0,
    with_skills: 0,
  };

  // Format 1: Database-Ready (Flat Structure)
  const format1 = {
    metadata: {
      generated_at: new Date().toISOString(),
      total_freelancers: 0,
      description: "Database-ready flat structure matching SQL table schema",
      tables_included: [
        "tblFreelancerWebsiteData",
        "tblFreelancerWebsiteDataLinks",
      ],
    },
    freelancers: [],
  };

  // Format 2: Separated by Table
  const format2 = {
    metadata: {
      generated_at: new Date().toISOString(),
      total_freelancers: 0,
      description: "Data organized by database table for bulk updates",
      tables: {
        tblFreelancerWebsiteData: "Main freelancer data",
        tblFreelancerWebsiteDataLinks: "Freelancer social/web links",
      },
    },
    tblFreelancerWebsiteData: [],
    tblFreelancerWebsiteDataLinks: [],
  };

  // Process each ID mapping
  for (const mapping of idMapping) {
    stats.total++;

    const slug = mapping.slug.toLowerCase();
    const matched = matchedBySlug[slug];
    const files = filesByFreelancerId[mapping.database_id];

    if (!matched) {
      log(`⚠ No matched data for: ${mapping.name} (${slug})`);
      continue;
    }

    // Build main data object
    const mainData = {
      FreelancerID: mapping.database_id,
      Slug: mapping.slug,
      DisplayName: mapping.name,
      Email: matched.email || null,
      FreelancerBio: matched.bio || null,
      PhotoBlobID: mapping.database_photo_blob || null,
      CVBlobID: mapping.database_cv_blob || null,
      EquipmentBlobID: mapping.database_equipment_blob || null,
    };

    // Track statistics
    if (mainData.PhotoBlobID) stats.with_photo++;
    if (mainData.CVBlobID) stats.with_cv++;
    if (mainData.EquipmentBlobID) stats.with_equipment++;
    if (mainData.FreelancerBio) stats.with_bio++;

    // Build links array
    const links = [];
    const linkTypes = ["website", "instagram", "imdb", "linkedin"];
    const linkNameMap = {
      website: "Website",
      instagram: "Instagram",
      imdb: "Imdb",
      linkedin: "LinkedIn",
    };

    linkTypes.forEach((type) => {
      const url = matched.links?.[type];
      if (url) {
        links.push({
          FreelancerID: mapping.database_id,
          LinkName: linkNameMap[type],
          LinkURL: url,
        });
      }
    });

    if (links.length > 0) stats.with_links++;

    // Build skills array (categories from scraped data)
    // Format to match: DepartmentSlug, SkillSlug structure
    const skills = [];
    if (matched.categories && Array.isArray(matched.categories)) {
      matched.categories.forEach((cat) => {
        // Categories from WordPress are like "Camera > Director of Photography"
        // We'll store them as-is since we don't have the full department/skill mapping
        skills.push({
          FreelancerID: mapping.database_id,
          category: cat, // Raw category for manual mapping
          // Note: DepartmentSlug and SkillSlug would need to be mapped from categories
          // This requires the full vwDepartmentsAndSkillsListWEB2 data
        });
      });
      if (skills.length > 0) stats.with_skills++;
    }

    // FORMAT 1: Flat structure with nested arrays
    const format1Entry = {
      ...mainData,
      links: links,
      skills: skills, // Keep raw categories for now
    };

    format1.freelancers.push(format1Entry);

    // FORMAT 2: Separated by table
    format2.tblFreelancerWebsiteData.push(mainData);

    // Add all links to the links table
    links.forEach((link) => {
      format2.tblFreelancerWebsiteDataLinks.push(link);
    });
  }

  // Update metadata
  format1.metadata.total_freelancers = stats.total;
  format1.metadata.statistics = stats;

  format2.metadata.total_freelancers = stats.total;
  format2.metadata.statistics = stats;

  // Save Format 1
  fs.writeFileSync(FORMAT1_OUTPUT, JSON.stringify(format1, null, 2));
  log(`\n✓ Saved Format 1 (Flat): ${FORMAT1_OUTPUT}`);

  // Save Format 2
  fs.writeFileSync(FORMAT2_OUTPUT, JSON.stringify(format2, null, 2));
  log(`✓ Saved Format 2 (By Table): ${FORMAT2_OUTPUT}`);

  // Display statistics
  log("\n" + "=".repeat(70));
  log("FINAL STATISTICS");
  log("=".repeat(70));
  log(`Total Freelancers: ${stats.total}`);
  log(`  With Photos: ${stats.with_photo}`);
  log(`  With CVs: ${stats.with_cv}`);
  log(`  With Equipment: ${stats.with_equipment}`);
  log(`  With Bios: ${stats.with_bio}`);
  log(`  With Links: ${stats.with_links}`);
  log(`  With Skills/Categories: ${stats.with_skills}`);

  log("\n" + "=".repeat(70));
  log("OUTPUT FILES CREATED");
  log("=".repeat(70));
  log("\nFormat 1 (Database-Ready Flat):");
  log(`  File: ${FORMAT1_OUTPUT}`);
  log(`  Structure: Array of freelancers with nested links/skills`);
  log(`  Use for: Single-pass import or validation`);

  log("\nFormat 2 (Separated by Table):");
  log(`  File: ${FORMAT2_OUTPUT}`);
  log(`  Structure: Separate arrays per database table`);
  log(`  Use for: Bulk UPDATE or INSERT operations`);

  log("\n" + "=".repeat(70));
  log("NEXT STEPS");
  log("=".repeat(70));
  log("1. Review the generated JSON files");
  log("2. Choose which format works best for your import process");
  log("3. Skills/categories need manual mapping to DepartmentSlug/SkillSlug");
  log("4. Upload files to Azure Blob Storage");
  log("5. Run database update using the chosen JSON format");

  log("\n✓ Final mapping complete!");
}

// Run
try {
  createFinalMapping();
} catch (error) {
  log(`\nFATAL ERROR: ${error.message}`);
  console.error(error);
  process.exit(1);
}
