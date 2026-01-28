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
const LOG_FILE = path.join(__dirname, "output", "update_test_single_log.txt");

// Target freelancer
const TARGET_ID = 1152;
const TARGET_SLUG = "dan-thomas";

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

    // Determine content type
    const contentTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".pdf": "application/pdf",
    };
    const contentType = contentTypes[ext] || "application/octet-stream";

    // Construct upload URL
    const uploadUrl = `${blobConfig.baseUrl}/${blobId}?${blobConfig.sasToken}`;

    log(`  Uploading to Azure: ${blobId}`);
    log(`    File size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
    log(`    Content type: ${contentType}`);

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
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    log(`  ✓ Uploaded successfully`);
    return { success: true, blobId };
  } catch (error) {
    log(`  ✗ Upload failed: ${error.message}`);
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

  // Remove null/undefined values
  Object.keys(updates).forEach((key) => {
    if (updates[key] === null || updates[key] === undefined) {
      delete updates[key];
    }
  });

  try {
    const request = pool.request();

    // Build SET clause
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = @param${index}`)
      .join(", ");

    // Add parameters
    Object.entries(updates).forEach(([key, value], index) => {
      request.input(`param${index}`, sql.NVarChar, value);
    });

    request.input("freelancerId", sql.Int, freelancer.FreelancerID);

    const query = `
      UPDATE tblFreelancerWebsiteData 
      SET ${setClause}
      WHERE FreelancerID = @freelancerId
    `;

    log(`  Executing database update...`);
    const result = await request.query(query);

    console.log("result:", result);

    if (result.rowsAffected[0] > 0) {
      log(`  ✓ Updated main data (${result.rowsAffected[0]} row)`);
      return { success: true };
    } else {
      log(`  ⚠ No rows updated - freelancer may not exist`);
      return { success: false, error: "No rows affected" };
    }
  } catch (error) {
    log(`  ✗ Database update failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Update links
async function updateLinks(freelancerId, links, pool, freelancerName) {
  if (!links || links.length === 0) {
    log(`  No links to update`);
    return { success: true };
  }

  try {
    log(`  Updating ${links.length} links...`);

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

      console.log("result:", result);

      if (result.rowsAffected[0] > 0) {
        // Update successful - link existed
        log(`    ✓ Updated ${link.LinkName}: ${link.LinkURL}`);
      } else {
        // Update affected 0 rows - link doesn't exist, needs INSERT
        missingLinks.push({
          FreelancerID: freelancerId,
          FreelancerName: freelancerName,
          LinkName: link.LinkName,
          LinkURL: link.LinkURL,
        });
        log(`    ⚠ Missing link (needs INSERT): ${link.LinkName}`);
      }
    }

    return { success: true };
  } catch (error) {
    log(`  ✗ Links update failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main function
async function testSingleUpdate() {
  log("=".repeat(70));
  log("TEST UPDATE - SINGLE FREELANCER (Glen - 0003)");
  log("=".repeat(70));

  // Load data
  if (!fs.existsSync(DATA_FILE)) {
    log("ERROR: Data file not found!");
    log(`Expected: ${DATA_FILE}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const freelancers = data.tblFreelancerWebsiteData;
  const allLinks = data.tblFreelancerWebsiteDataLinks;

  console.log(
    `Loaded ${freelancers.length} freelancers and ${allLinks.length} links`,
  );
  console.log("data:", data);

  // Find target freelancer
  const freelancer = freelancers.find((f) => f.FreelancerID === TARGET_ID);

  if (!freelancer) {
    log(`ERROR: Freelancer ${TARGET_ID} (${TARGET_SLUG}) not found in data!`);
    process.exit(1);
  }

  const freelancerLinks = allLinks.filter((l) => l.FreelancerID === TARGET_ID);

  log(`\nFound freelancer:`);
  log(`  ID: ${freelancer.FreelancerID}`);
  log(`  Name: ${freelancer.DisplayName}`);
  log(`  Slug: ${freelancer.Slug}`);
  log(`  Email: ${freelancer.Email || "N/A"}`);
  log(`  Photo Blob ID: ${freelancer.PhotoBlobID || "N/A"}`);
  log(`  CV Blob ID: ${freelancer.CVBlobID || "N/A"}`);
  log(`  Equipment Blob ID: ${freelancer.EquipmentBlobID || "N/A"}`);
  log(`  Links: ${freelancerLinks.length}`);

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

  const results = {
    photo_upload: null,
    cv_upload: null,
    equipment_upload: null,
    database_update: null,
    links_update: null,
  };

  console.log("results:", results);

  // Upload photo to Azure
  if (freelancer.PhotoBlobID) {
    log(`\n[1/5] Uploading photo...`);
    const photoFiles = fs.readdirSync(path.join(MEDIA_DIR, "photos"));
    const photoFile = photoFiles.find((f) =>
      f.startsWith(freelancer.PhotoBlobID),
    );

    if (photoFile) {
      const photoPath = path.join(MEDIA_DIR, "photos", photoFile);
      results.photo_upload = await uploadToAzure(photoPath, photoFile);
    } else {
      log(`  ⚠ Photo file not found for ${freelancer.PhotoBlobID}`);
      results.photo_upload = { success: false, error: "File not found" };
    }
  } else {
    log(`\n[1/5] No photo to upload`);
  }

  // Upload CV to Azure
  if (freelancer.CVBlobID) {
    log(`\n[2/5] Uploading CV...`);
    const cvFiles = fs.readdirSync(path.join(MEDIA_DIR, "cvs"));
    const cvFile = cvFiles.find((f) => f.startsWith(freelancer.CVBlobID));

    if (cvFile) {
      const cvPath = path.join(MEDIA_DIR, "cvs", cvFile);
      results.cv_upload = await uploadToAzure(cvPath, cvFile);
    } else {
      log(`  ⚠ CV file not found for ${freelancer.CVBlobID}`);
      results.cv_upload = { success: false, error: "File not found" };
    }
  } else {
    log(`\n[2/5] No CV to upload`);
  }

  // Upload equipment to Azure
  if (freelancer.EquipmentBlobID) {
    log(`\n[3/5] Uploading equipment list...`);
    const equipFiles = fs.readdirSync(path.join(MEDIA_DIR, "equipment"));
    const equipFile = equipFiles.find((f) =>
      f.startsWith(freelancer.EquipmentBlobID),
    );

    if (equipFile) {
      const equipPath = path.join(MEDIA_DIR, "equipment", equipFile);
      results.equipment_upload = await uploadToAzure(equipPath, equipFile);
    } else {
      log(`  ⚠ Equipment file not found for ${freelancer.EquipmentBlobID}`);
      results.equipment_upload = { success: false, error: "File not found" };
    }
  } else {
    log(`\n[3/5] No equipment list to upload`);
  }

  // Update main database record
  log(`\n[4/5] Updating database record...`);
  results.database_update = await updateDatabase(freelancer, pool);

  // Update links
  log(`\n[5/5] Updating links...`);
  results.links_update = await updateLinks(
    freelancer.FreelancerID,
    freelancerLinks,
    pool,
    freelancer.DisplayName,
  );

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
  log(`TEST SUMMARY`);
  log(`${"=".repeat(70)}`);
  log(
    `Photo Upload:     ${results.photo_upload?.success ? "✓ Success" : "✗ Failed"}`,
  );
  log(
    `CV Upload:        ${results.cv_upload?.success ? "✓ Success" : "✗ Failed"}`,
  );
  log(
    `Equipment Upload: ${results.equipment_upload?.success ? "✓ Success" : "✗ Failed"}`,
  );
  log(
    `Database Update:  ${results.database_update?.success ? "✓ Success" : "✗ Failed"}`,
  );
  log(
    `Links Update:     ${results.links_update?.success ? "✓ Success" : "✗ Failed"}`,
  );

  const allSuccess = Object.values(results)
    .filter((r) => r !== null)
    .every((r) => r.success);

  if (allSuccess) {
    log(`\n🎉 TEST SUCCESSFUL! All operations completed.`);
    log(`\nYou can verify the changes:`);
    log(`1. Check Azure Blob Storage for uploaded files`);
    log(`2. Query database for FreelancerID ${TARGET_ID}`);
  } else {
    log(`\n⚠ TEST COMPLETED WITH ERRORS`);
    log(`Review the log above for details`);
  }

  log(`\n✓ Test complete!`);
  log(`Log saved to: ${LOG_FILE}`);
}

// Run
testSingleUpdate().catch((error) => {
  log(`\nFATAL ERROR: ${error.message}`);
  console.error(error);
  process.exit(1);
});
