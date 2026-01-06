// scripts/add-password-field.js
/**
 * Adds PasswordHash field to tblFreelancerWebsiteData
 */

import { executeQuery } from "../app/lib/db.js";

async function addPasswordField() {
  try {
    console.log("🔗 Checking database...");

    // Confirmed from Paul's email: passwords go in tblFreelancerWebsiteData
    const tableName = "tblFreelancerWebsiteData";

    console.log(`📋 Checking if PasswordHash exists in ${tableName}...`);

    // Check if field exists
    const checkQuery = `
      SELECT COUNT(*) as FieldExists
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${tableName}'
        AND COLUMN_NAME = 'PasswordHash'
    `;

    const checkResult = await executeQuery(checkQuery);

    if (checkResult[0].FieldExists > 0) {
      console.log("✅ PasswordHash field already exists!");
      return;
    }

    console.log("➕ Adding PasswordHash field to tblFreelancerWebsiteData...");

    // Add PasswordHash column
    const alterQuery = `
      ALTER TABLE ${tableName}
      ADD PasswordHash NVARCHAR(255) NULL
    `;

    await executeQuery(alterQuery);
    console.log("✅ PasswordHash field added!");

    // Optionally add tracking field
    console.log("➕ Adding PasswordSetAt tracking field...");

    const trackingQuery = `
      ALTER TABLE ${tableName}
      ADD PasswordSetAt DATETIME NULL
    `;

    await executeQuery(trackingQuery);
    console.log("✅ PasswordSetAt field added!");

    // Verify the fields were added
    console.log("\n📋 Verifying fields...");
    const verifyQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${tableName}'
        AND COLUMN_NAME IN ('PasswordHash', 'PasswordSetAt')
      ORDER BY COLUMN_NAME
    `;

    const verifyResult = await executeQuery(verifyQuery);
    console.table(verifyResult);

    console.log("\n✅ Migration complete!");
    console.log("\nNew structure of tblFreelancerWebsiteData:");
    console.log("  • FreelancerID (PK)");
    console.log("  • DisplayName");
    console.log("  • FreelancerBio");
    console.log("  • PhotoBlobID");
    console.log("  • PhotoStatusID");
    console.log("  • CVBlobID");
    console.log("  • CVStatusID");
    console.log("  • PasswordHash ← NEW");
    console.log("  • PasswordSetAt ← NEW");
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

// Run it
addPasswordField()
  .then(() => {
    console.log("\n🎉 All done! You can now use the authentication system.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  });

/**
 * USAGE:
 *
 * 1. Wait for UPDATE credentials
 *
 * 2. Update your .env with the new credentials:
 *    DB_USER=webdeveloper2_UPDATE  (or whatever Paul provides)
 *    DB_PASSWORD=new_password
 *
 * 3. Run the script:
 *    node scripts/add-password-field.js
 */
