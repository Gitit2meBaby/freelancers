import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sql from "mssql";
import dotenv from "dotenv";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = fs.existsSync(path.join(__dirname, ".env"))
  ? path.join(__dirname, ".env")
  : path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

// Database configuration
const dbConfig = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || "1433"),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
    enableArithAbort: process.env.DB_ENABLE_ARITH_ABORT === "true",
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || "30000"),
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || "30000"),
  },
};

// Azure Blob configuration
const blobConfig = {
  accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
  containerName: process.env.AZURE_BLOB_CONTAINER_NAME,
  sasToken: process.env.AZURE_BLOB_SAS_TOKEN,
  baseUrl: process.env.AZURE_BLOB_BASE_URL,
};

// File paths
const DATA_FILE = path.join(
  __dirname,
  "output",
  "database_import_by_table.json",
);
const MEDIA_DIR = path.join(__dirname, "azure_ready_media");
const LOG_FILE = path.join(__dirname, "output", "update_production_log.txt");
const ERROR_FILE = path.join(
  __dirname,
  "output",
  "update_production_errors.json",
);

// Track links that need manual insertion
const missingLinks = [];

// Clear logs
[LOG_FILE, ERROR_FILE].forEach((file) => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
});

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + "\n");
}

// Prompt user for confirmation
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// Upload file to Azure Blob Storage
async function uploadToAzure(filePath, blobId) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const contentTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".pdf": "application/pdf",
    };
    const contentType = contentTypes[ext] || "application/octet-stream";

    const uploadUrl = `${blobConfig.baseUrl}/${blobId}?${blobConfig.sasToken}`;

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status} - ${errorText}`);
    }

    return { success: true, blobId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Update database
async function updateDatabase(freelancer, pool) {
  const updates = {
    PhotoBlobID: freelancer.PhotoBlobID,
    CVBlobID: freelancer.CVBlobID,
    EquipmentBlobID: freelancer.EquipmentBlobID,
    FreelancerBio: freelancer.FreelancerBio,
    Email: freelancer.Email,
    DisplayName: freelancer.DisplayName,
  };

  Object.keys(updates).forEach((key) => {
    if (updates[key] === null || updates[key] === undefined) {
      delete updates[key];
    }
  });

  try {
    const request = pool.request();

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = @param${index}`)
      .join(", ");

    Object.entries(updates).forEach(([key, value], index) => {
      request.input(`param${index}`, sql.NVarChar, value);
    });

    request.input("freelancerId", sql.Int, freelancer.FreelancerID);

    const query = `
      UPDATE tblFreelancerWebsiteData 
      SET ${setClause}
      WHERE FreelancerID = @freelancerId
    `;

    const result = await request.query(query);

    if (result.rowsAffected[0] > 0) {
      return { success: true };
    } else {
      return { success: false, error: "No rows affected" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Update links
async function updateLinks(freelancerId, links, pool, freelancerName) {
  if (!links || links.length === 0) {
    return { success: true };
  }

  try {
    for (const link of links) {
      const updateRequest = pool.request();
      updateRequest.input("freelancerId", sql.Int, freelancerId);
      updateRequest.input("linkName", sql.NVarChar, link.LinkName);
      updateRequest.input("linkUrl", sql.NVarChar, link.LinkURL);

      // Always try to UPDATE first
      const updateQuery = `
        UPDATE tblFreelancerWebsiteDataLinks
        SET LinkURL = @linkUrl
        WHERE FreelancerID = @freelancerId AND LinkName = @linkName
      `;

      const result = await updateRequest.query(updateQuery);

      if (result.rowsAffected[0] === 0) {
        // Update affected 0 rows - link doesn't exist, needs INSERT
        missingLinks.push({
          FreelancerID: freelancerId,
          FreelancerName: freelancerName,
          LinkName: link.LinkName,
          LinkURL: link.LinkURL,
        });
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Process single freelancer
async function processFreelancer(freelancer, freelancerLinks, pool) {
  const results = {
    photo: null,
    cv: null,
    equipment: null,
    database: null,
    links: null,
  };

  // Upload photo
  if (freelancer.PhotoBlobID) {
    const photoFiles = fs.readdirSync(path.join(MEDIA_DIR, "photos"));
    const photoFile = photoFiles.find((f) =>
      f.startsWith(freelancer.PhotoBlobID),
    );

    if (photoFile) {
      const photoPath = path.join(MEDIA_DIR, "photos", photoFile);
      results.photo = await uploadToAzure(photoPath, photoFile);
    } else {
      results.photo = { success: false, error: "File not found" };
    }
  }

  // Upload CV
  if (freelancer.CVBlobID) {
    const cvFiles = fs.readdirSync(path.join(MEDIA_DIR, "cvs"));
    const cvFile = cvFiles.find((f) => f.startsWith(freelancer.CVBlobID));

    if (cvFile) {
      const cvPath = path.join(MEDIA_DIR, "cvs", cvFile);
      results.cv = await uploadToAzure(cvPath, cvFile);
    } else {
      results.cv = { success: false, error: "File not found" };
    }
  }

  // Upload equipment
  if (freelancer.EquipmentBlobID) {
    const equipFiles = fs.readdirSync(path.join(MEDIA_DIR, "equipment"));
    const equipFile = equipFiles.find((f) =>
      f.startsWith(freelancer.EquipmentBlobID),
    );

    if (equipFile) {
      const equipPath = path.join(MEDIA_DIR, "equipment", equipFile);
      results.equipment = await uploadToAzure(equipPath, equipFile);
    } else {
      results.equipment = { success: false, error: "File not found" };
    }
  }

  // Update database
  results.database = await updateDatabase(freelancer, pool);

  // Update links
  results.links = await updateLinks(
    freelancer.FreelancerID,
    freelancerLinks,
    pool,
    freelancer.DisplayName,
  );

  return results;
}

// Main function
async function productionUpdate() {
  log("=".repeat(70));
  log("PRODUCTION UPDATE - ALL FREELANCERS");
  log("=".repeat(70));

  // Load data
  if (!fs.existsSync(DATA_FILE)) {
    log("ERROR: Data file not found!");
    log(`Expected: ${DATA_FILE}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const allFreelancers = data.tblFreelancerWebsiteData;
  const allLinks = data.tblFreelancerWebsiteDataLinks;

  log(`\nLoaded ${allFreelancers.length} freelancers from data file`);

  // Show summary
  console.log("\n" + "=".repeat(70));
  console.log("PRODUCTION UPDATE SUMMARY");
  console.log("=".repeat(70));
  console.log(`Total freelancers to update: ${allFreelancers.length}`);
  console.log(`Total links to update: ${allLinks.length}`);
  console.log(`Database: ${dbConfig.server}/${dbConfig.database}`);
  console.log(`Azure Blob: ${blobConfig.baseUrl}`);
  console.log("\nThis will:");
  console.log("  1. Upload all photos to Azure Blob Storage");
  console.log("  2. Upload all CVs to Azure Blob Storage");
  console.log("  3. Upload all equipment lists to Azure Blob Storage");
  console.log("  4. Update all freelancer records in the database");
  console.log("  5. Update all freelancer links");
  console.log("=".repeat(70));

  // Confirm with user
  const answer = await promptUser("\nDo you want to proceed? (yes/no): ");

  if (answer !== "yes" && answer !== "y") {
    console.log("\nOperation cancelled.");
    process.exit(0);
  }

  log("\n✓ User confirmed - starting production update");

  // Connect to database
  log(`\nConnecting to database...`);
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    log(`✓ Connected to: ${dbConfig.server}/${dbConfig.database}`);
  } catch (error) {
    log(`✗ Database connection failed: ${error.message}`);
    process.exit(1);
  }

  const stats = {
    total: allFreelancers.length,
    success: 0,
    failed: 0,
    photos_uploaded: 0,
    cvs_uploaded: 0,
    equipment_uploaded: 0,
    database_updated: 0,
    links_updated: 0,
    photos_failed: 0,
    cvs_failed: 0,
    equipment_failed: 0,
    database_failed: 0,
    links_failed: 0,
  };

  const errors = [];
  const startTime = Date.now();

  // Process each freelancer
  log(`\n${"=".repeat(70)}`);
  log(`PROCESSING ${allFreelancers.length} FREELANCERS`);
  log(`${"=".repeat(70)}`);

  for (let i = 0; i < allFreelancers.length; i++) {
    const freelancer = allFreelancers[i];
    const freelancerLinks = allLinks.filter(
      (l) => l.FreelancerID === freelancer.FreelancerID,
    );

    // Progress update every 50 freelancers
    if ((i + 1) % 50 === 0 || i === 0) {
      log(`\nProgress: ${i + 1}/${allFreelancers.length}`);
    }

    const results = await processFreelancer(freelancer, freelancerLinks, pool);

    // Track stats
    if (results.photo) {
      if (results.photo.success) stats.photos_uploaded++;
      else stats.photos_failed++;
    }
    if (results.cv) {
      if (results.cv.success) stats.cvs_uploaded++;
      else stats.cvs_failed++;
    }
    if (results.equipment) {
      if (results.equipment.success) stats.equipment_uploaded++;
      else stats.equipment_failed++;
    }
    if (results.database) {
      if (results.database.success) stats.database_updated++;
      else stats.database_failed++;
    }
    if (results.links) {
      if (results.links.success) stats.links_updated++;
      else stats.links_failed++;
    }

    const allSuccess = Object.values(results)
      .filter((r) => r !== null)
      .every((r) => r.success);

    if (allSuccess) {
      stats.success++;
    } else {
      stats.failed++;
      errors.push({
        freelancer_id: freelancer.FreelancerID,
        name: freelancer.DisplayName,
        slug: freelancer.Slug,
        results,
      });

      // Log individual failures
      const failedOps = [];
      Object.entries(results).forEach(([key, result]) => {
        if (result && !result.success) {
          failedOps.push(`${key}: ${result.error}`);
        }
      });
      log(
        `  ✗ ${freelancer.DisplayName} (ID ${freelancer.FreelancerID}): ${failedOps.join(", ")}`,
      );
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Close connection
  await pool.close();
  log(`\n✓ Database connection closed`);

  // Save errors
  if (errors.length > 0) {
    fs.writeFileSync(ERROR_FILE, JSON.stringify(errors, null, 2));
    log(`✓ Saved ${errors.length} errors to: ${ERROR_FILE}`);
  }

  // Save missing links if any
  if (missingLinks.length > 0) {
    const missingLinksFile = path.join(
      __dirname,
      "output",
      "missing_links_for_insert.json",
    );
    const missingLinksData = {
      generated_at: new Date().toISOString(),
      total_missing: missingLinks.length,
      description: "Links that need to be manually inserted by DB developer",
      table: "tblFreelancerWebsiteDataLinks",
      columns: ["FreelancerID", "LinkName", "LinkURL"],
      missing_links: missingLinks,
    };

    fs.writeFileSync(
      missingLinksFile,
      JSON.stringify(missingLinksData, null, 2),
    );
    log(`✓ Saved ${missingLinks.length} missing links to: ${missingLinksFile}`);
    log(`⚠ These links need to be manually inserted by the DB developer`);
  } else {
    log(`✓ No missing links - all links already exist in database`);
  }

  // Final summary
  log(`\n${"=".repeat(70)}`);
  log(`PRODUCTION UPDATE COMPLETE`);
  log(`${"=".repeat(70)}`);
  log(`Duration: ${duration} seconds`);
  log(``);
  log(`Total Freelancers:    ${stats.total}`);
  log(`  Successful:         ${stats.success}`);
  log(`  Failed:             ${stats.failed}`);
  log(``);
  log(
    `Photos:               ${stats.photos_uploaded} uploaded, ${stats.photos_failed} failed`,
  );
  log(
    `CVs:                  ${stats.cvs_uploaded} uploaded, ${stats.cvs_failed} failed`,
  );
  log(
    `Equipment:            ${stats.equipment_uploaded} uploaded, ${stats.equipment_failed} failed`,
  );
  log(
    `Database Updates:     ${stats.database_updated} success, ${stats.database_failed} failed`,
  );
  log(
    `Links Updates:        ${stats.links_updated} success, ${stats.links_failed} failed`,
  );

  if (stats.failed > 0) {
    log(`\n⚠ ${stats.failed} freelancers had errors`);
    log(`Review errors in: ${ERROR_FILE}`);
  } else {
    log(`\n🎉 ALL FREELANCERS UPDATED SUCCESSFULLY!`);
  }

  log(`\n✓ Production update complete!`);
  log(`Log saved to: ${LOG_FILE}`);
}

// Run
productionUpdate().catch((error) => {
  log(`\nFATAL ERROR: ${error.message}`);
  console.error(error);
  process.exit(1);
});
