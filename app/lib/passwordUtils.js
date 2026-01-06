// app/lib/passwordUtils.js
import bcrypt from "bcryptjs";

/**
 * Password Utilities with FULL Database Access
 * Table: tblFreelancerWebsiteData
 */

/**
 * Check if a password hash exists and is valid
 */
export function hasPassword(hash) {
  return (
    hash !== null && hash !== undefined && hash !== "" && hash.trim().length > 0
  );
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Password is required");
  }

  return await bcrypt.hash(password, 12);
}

/**
 * Verify password against bcrypt hash
 */
export async function verifyPassword(password, hash) {
  if (!password || !hash) {
    return false;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error("❌ Password verification error:", error);
    return false;
  }
}

/**
 * Set initial password for user (first-time login)
 */
export async function setInitialPassword(userId, password) {
  try {
    const { executeUpdate } = await import("./db");

    const hash = await hashPassword(password);

    console.log(`🔐 Setting initial password for FreelancerID ${userId}`);

    // You have FULL access to update this table
    await executeUpdate(
      "tblFreelancerWebsiteData",
      {
        PasswordHash: hash,
        PasswordSetAt: new Date(),
      },
      { FreelancerID: userId }
    );

    console.log("✅ Initial password set successfully");

    return {
      success: true,
      hash,
    };
  } catch (error) {
    console.error("❌ Failed to set initial password:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  hasPassword,
  hashPassword,
  verifyPassword,
  setInitialPassword,
};

/**
 * YOU HAVE FULL ACCESS TO:
 *
 * tblFreelancerWebsiteData
 * ------------------------
 * - FreelancerID (PK)
 * - DisplayName ✅ READ, WRITE, UPDATE, DELETE
 * - FreelancerBio ✅ READ, WRITE, UPDATE, DELETE
 * - PhotoBlobID ✅ READ, WRITE, UPDATE, DELETE
 * - PhotoStatusID ✅ READ, WRITE, UPDATE, DELETE
 * - CVBlobID ✅ READ, WRITE, UPDATE, DELETE
 * - CVStatusID ✅ READ, WRITE, UPDATE, DELETE
 * - PasswordHash ✅ READ, WRITE, UPDATE, DELETE (once you add the field)
 * - PasswordSetAt ✅ READ, WRITE, UPDATE, DELETE (once you add the field)
 *
 * tblFreelancerWebsiteDataLinks
 * -----------------------------
 * - FreelancerLinkID (PK)
 * - FreelancerID (FK)
 * - LinkName ✅ READ, WRITE, UPDATE, DELETE
 * - LinkURL ✅ READ, WRITE, UPDATE, DELETE
 *
 * tblStoredDocuments
 * -----------------
 * - All fields ✅ READ, WRITE, UPDATE, DELETE
 */
