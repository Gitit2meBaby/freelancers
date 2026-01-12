// app/lib/passwordUtils.js
import bcrypt from "bcryptjs";
import { executeQuery, executeUpdate, TABLES } from "./db";

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password from database
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, hash) {
  if (!hash) return false;
  return await bcrypt.compare(password, hash);
}

/**
 * Check if a user has a password set
 * @param {string|null} passwordHash - Password hash from database
 * @returns {boolean} True if user has a password
 */
export function hasPassword(passwordHash) {
  return (
    passwordHash !== null && passwordHash !== undefined && passwordHash !== ""
  );
}

/**
 * Set initial password for a user (first-time login)
 * @param {number} freelancerId - The user's FreelancerID
 * @param {string} password - Plain text password to set
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function setInitialPassword(freelancerId, password) {
  try {
    // Hash the password
    const passwordHash = await hashPassword(password);

    // Update the database
    const rowsAffected = await executeUpdate(
      TABLES.FREELANCER_WEBSITE_DATA,
      { PasswordHash: passwordHash },
      { FreelancerID: freelancerId }
    );

    if (rowsAffected === 0) {
      return {
        success: false,
        error: "Failed to update password - user not found",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error setting initial password:", error);
    return {
      success: false,
      error: error.message || "Failed to set password",
    };
  }
}

/**
 * Update password for an existing user
 * @param {number} freelancerId - The user's FreelancerID
 * @param {string} currentPassword - Current password (for verification)
 * @param {string} newPassword - New password to set
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updatePassword(
  freelancerId,
  currentPassword,
  newPassword
) {
  try {
    // Get current password hash
    const query = `
      SELECT PasswordHash
      FROM ${TABLES.FREELANCER_WEBSITE_DATA}
      WHERE FreelancerID = @freelancerId
    `;

    const result = await executeQuery(query, { freelancerId });

    if (result.length === 0) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const currentHash = result[0].PasswordHash;

    // Verify current password
    const isValid = await verifyPassword(currentPassword, currentHash);

    if (!isValid) {
      return {
        success: false,
        error: "Current password is incorrect",
      };
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update the database
    const rowsAffected = await executeUpdate(
      TABLES.FREELANCER_WEBSITE_DATA,
      { PasswordHash: newPasswordHash },
      { FreelancerID: freelancerId }
    );

    if (rowsAffected === 0) {
      return {
        success: false,
        error: "Failed to update password",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating password:", error);
    return {
      success: false,
      error: error.message || "Failed to update password",
    };
  }
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long",
    };
  }

  // Add more validation rules as needed
  // Example: require uppercase, lowercase, numbers, special chars

  return { valid: true };
}
