import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sql from "mssql";
import dotenv from "dotenv";

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
const LOG_FILE = path.join(__dirname, "output", "update_test_batch_log.txt");

// Number of freelancers to test
const TEST_BATCH_SIZE = 10;

// Track links that need manual insertion
const missingLinks = [];

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
async function testBatchUpdate() {
  log("=".repeat(70));
  log(`TEST UPDATE - BATCH OF ${TEST_BATCH_SIZE} FREELANCERS`);
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

  // Select first N freelancers
  const testFreelancers = allFreelancers.slice(0, TEST_BATCH_SIZE);

  log(`\nSelected ${testFreelancers.length} freelancers for testing:`);
  testFreelancers.forEach((f, i) => {
    log(`  ${i + 1}. ${f.DisplayName} (ID: ${f.FreelancerID})`);
  });

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
    total: testFreelancers.length,
    success: 0,
    failed: 0,
    photos_uploaded: 0,
    cvs_uploaded: 0,
    equipment_uploaded: 0,
    database_updated: 0,
    links_updated: 0,
  };

  const failedFreelancers = [];

  // Process each freelancer
  log(`\n${"=".repeat(70)}`);
  log(`PROCESSING FREELANCERS`);
  log(`${"=".repeat(70)}`);

  for (let i = 0; i < testFreelancers.length; i++) {
    const freelancer = testFreelancers[i];
    const freelancerLinks = allLinks.filter(
      (l) => l.FreelancerID === freelancer.FreelancerID,
    );

    log(
      `\n[${i + 1}/${testFreelancers.length}] ${freelancer.DisplayName} (ID: ${freelancer.FreelancerID})`,
    );

    const results = await processFreelancer(freelancer, freelancerLinks, pool);

    // Track stats
    if (results.photo?.success) stats.photos_uploaded++;
    if (results.cv?.success) stats.cvs_uploaded++;
    if (results.equipment?.success) stats.equipment_uploaded++;
    if (results.database?.success) stats.database_updated++;
    if (results.links?.success) stats.links_updated++;

    const allSuccess = Object.values(results)
      .filter((r) => r !== null)
      .every((r) => r.success);

    if (allSuccess) {
      stats.success++;
      log(`  ✓ All operations successful`);
    } else {
      stats.failed++;
      failedFreelancers.push({
        id: freelancer.FreelancerID,
        name: freelancer.DisplayName,
        results,
      });
      log(`  ✗ Some operations failed`);

      // Log failures
      Object.entries(results).forEach(([key, result]) => {
        if (result && !result.success) {
          log(`    - ${key}: ${result.error}`);
        }
      });
    }
  }

  // Close connection
  await pool.close();
  log(`\n✓ Database connection closed`);

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
    log(
      `\n✓ Saved ${missingLinks.length} missing links to: ${missingLinksFile}`,
    );
    log(`⚠ These links need to be manually inserted by the DB developer`);
  } else {
    log(`\n✓ No missing links - all links already exist in database`);
  }

  // Summary
  log(`\n${"=".repeat(70)}`);
  log(`BATCH TEST SUMMARY`);
  log(`${"=".repeat(70)}`);
  log(`Total Freelancers:    ${stats.total}`);
  log(`Successful:           ${stats.success}`);
  log(`Failed:               ${stats.failed}`);
  log(``);
  log(`Photos Uploaded:      ${stats.photos_uploaded}`);
  log(`CVs Uploaded:         ${stats.cvs_uploaded}`);
  log(`Equipment Uploaded:   ${stats.equipment_uploaded}`);
  log(`Database Updated:     ${stats.database_updated}`);
  log(`Links Updated:        ${stats.links_updated}`);

  if (failedFreelancers.length > 0) {
    log(`\n${"=".repeat(70)}`);
    log(`FAILED FREELANCERS (${failedFreelancers.length})`);
    log(`${"=".repeat(70)}`);
    failedFreelancers.forEach((f) => {
      log(`  ${f.name} (ID: ${f.id})`);
    });
  }

  if (stats.failed === 0) {
    log(
      `\n🎉 BATCH TEST SUCCESSFUL! All ${stats.total} freelancers processed.`,
    );
  } else {
    log(`\n⚠ BATCH TEST COMPLETED WITH ERRORS`);
    log(`${stats.success} succeeded, ${stats.failed} failed`);
  }

  log(`\n✓ Test complete!`);
  log(`Log saved to: ${LOG_FILE}`);
}

// Run
testBatchUpdate().catch((error) => {
  log(`\nFATAL ERROR: ${error.message}`);
  console.error(error);
  process.exit(1);
});
