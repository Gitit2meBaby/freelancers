// app/lib/passwordReset.js
import crypto from "crypto";
import { executeQuery, executeInsert, executeUpdate, VIEWS } from "./db";

/**
 * Password Reset Token Management
 * Handles generation, storage, and validation of password reset tokens
 */

/**
 * Generate a secure random token
 * @returns {string} 64-character hex string
 */
export function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a password reset token for a user
 * @param {string} email - User's email address
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
export async function createResetToken(email) {
  try {
    // Check if user exists and is active
    const query = `
      SELECT FreelancerID, DisplayName, IsActive
      FROM ${VIEWS.FREELANCERS}
      WHERE Email = @email
        AND IsActive = 1
    `;

    const users = await executeQuery(query, { email: email.toLowerCase() });

    // For security, always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!users || users.length === 0) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return {
        success: true,
        message: "If account exists, reset email sent",
      };
    }

    const user = users[0];
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // TODO: Insert into tblPasswordResetTokens once Paul creates the table
    // For now, log the token (remove in production!)
    console.log("====================================");
    console.log("🔐 PASSWORD RESET TOKEN GENERATED");
    console.log("====================================");
    console.log("User:", user.DisplayName);
    console.log("Email:", email);
    console.log("Token:", token);
    console.log("Expires:", expiresAt.toISOString());
    console.log(
      "Reset URL:",
      `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
    );
    console.log("====================================");

    /*
    // Uncomment once Paul creates the table:
    await executeInsert("tblPasswordResetTokens", {
      FreelancerID: user.FreelancerID,
      Token: token,
      ExpiresAt: expiresAt,
      CreatedAt: new Date(),
      UsedAt: null
    });
    */

    return {
      success: true,
      token,
      user: {
        id: user.FreelancerID,
        name: user.DisplayName,
        email,
      },
    };
  } catch (error) {
    console.error("Error creating reset token:", error);
    return {
      success: false,
      error: "Failed to create reset token",
    };
  }
}

/**
 * Validate a password reset token
 * @param {string} token - The reset token to validate
 * @returns {Promise<{valid: boolean, userId?: number, error?: string}>}
 */
export async function validateResetToken(token) {
  try {
    // TODO: Implement once Paul creates tblPasswordResetTokens table
    console.log(`Validating token: ${token}`);

    /*
    // Uncomment once table exists:
    const query = `
      SELECT 
        t.TokenID,
        t.FreelancerID,
        t.ExpiresAt,
        t.UsedAt,
        f.Email,
        f.DisplayName
      FROM tblPasswordResetTokens t
      INNER JOIN ${VIEWS.FREELANCERS} f ON t.FreelancerID = f.FreelancerID
      WHERE t.Token = @token
        AND f.IsActive = 1
    `;

    const results = await executeQuery(query, { token });

    if (!results || results.length === 0) {
      return { valid: false, error: "Invalid or expired token" };
    }

    const tokenData = results[0];

    // Check if token has been used
    if (tokenData.UsedAt) {
      return { valid: false, error: "Token has already been used" };
    }

    // Check if token has expired
    if (new Date() > new Date(tokenData.ExpiresAt)) {
      return { valid: false, error: "Token has expired" };
    }

    return {
      valid: true,
      userId: tokenData.FreelancerID,
      user: {
        email: tokenData.Email,
        name: tokenData.DisplayName
      }
    };
    */

    // Temporary mock response for testing
    return {
      valid: true,
      userId: 1,
      user: {
        email: "test@example.com",
        name: "Test User",
      },
      warning: "Using mock validation - database table not yet created",
    };
  } catch (error) {
    console.error("Error validating token:", error);
    return {
      valid: false,
      error: "Failed to validate token",
    };
  }
}

/**
 * Mark a reset token as used
 * @param {string} token - The token to mark as used
 * @returns {Promise<{success: boolean}>}
 */
export async function markTokenAsUsed(token) {
  try {
    // TODO: Implement once Paul creates tblPasswordResetTokens table
    console.log(`Marking token as used: ${token}`);

    /*
    // Uncomment once table exists:
    await executeUpdate(
      "tblPasswordResetTokens",
      { UsedAt: new Date() },
      { Token: token }
    );
    */

    return { success: true };
  } catch (error) {
    console.error("Error marking token as used:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Clean up expired tokens
 * Should be run periodically (e.g., daily cron job)
 * @returns {Promise<{deleted: number}>}
 */
export async function cleanupExpiredTokens() {
  try {
    // TODO: Implement once Paul creates tblPasswordResetTokens table
    console.log("Cleaning up expired tokens");

    /*
    // Uncomment once table exists:
    const query = `
      DELETE FROM tblPasswordResetTokens
      WHERE ExpiresAt < GETDATE()
        OR UsedAt IS NOT NULL
    `;

    const result = await executeQuery(query);
    return { deleted: result.rowsAffected?.[0] || 0 };
    */

    return { deleted: 0 };
  } catch (error) {
    console.error("Error cleaning up tokens:", error);
    return { deleted: 0, error: error.message };
  }
}

/**
 * TABLE STRUCTURE FOR PAUL:
 *
 * Please create the following table in the database:
 *
 * CREATE TABLE tblPasswordResetTokens (
 *   TokenID INT PRIMARY KEY IDENTITY(1,1),
 *   FreelancerID INT NOT NULL,
 *   Token NVARCHAR(64) NOT NULL UNIQUE,
 *   CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
 *   ExpiresAt DATETIME NOT NULL,
 *   UsedAt DATETIME NULL,
 *
 *   CONSTRAINT FK_PasswordResetTokens_Freelancer
 *     FOREIGN KEY (FreelancerID)
 *     REFERENCES tblFreelancers(FreelancerID),
 *
 *   INDEX IX_Token (Token),
 *   INDEX IX_ExpiresAt (ExpiresAt),
 *   INDEX IX_FreelancerID (FreelancerID)
 * );
 *
 * NOTES:
 * - Token should be 64 characters (32 bytes hex-encoded)
 * - Tokens expire after 1 hour
 * - Once used, UsedAt is set to prevent reuse
 * - Cleanup query should run daily to remove old tokens
 */

// Export all functions
export default {
  generateResetToken,
  createResetToken,
  validateResetToken,
  markTokenAsUsed,
  cleanupExpiredTokens,
};
