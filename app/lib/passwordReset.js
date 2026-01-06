// app/lib/passwordReset.js
import crypto from "crypto";
import { executeQuery, VIEWS } from "./db";

/**
 * Generates a cryptographically secure random token
 * @returns {string} 64-character hex string
 */
export function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Creates a password reset token for a user
 * @param {string} email - User's email address
 * @returns {Promise<{success: boolean, token?: string, user?: object, error?: string}>}
 */
export async function createResetToken(email) {
  try {
    console.log("🔑 Creating reset token for:", email);

    // Check if user exists - NO IsActive column!
    const query = `
      SELECT 
        FreelancerID,
        DisplayName,
        Email,
        Slug
      FROM ${VIEWS.FREELANCERS}
      WHERE Email = @email
    `;

    const users = await executeQuery(query, {
      email: email.toLowerCase().trim(),
    });

    if (!users || users.length === 0) {
      console.log("❌ User not found:", email);
      return {
        success: false,
        error: "User not found",
      };
    }

    const user = users[0];
    console.log("✅ User found:", user.DisplayName);

    // Generate token
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Temporary: Store in memory
    if (!global.passwordResetTokens) {
      global.passwordResetTokens = new Map();
    }

    global.passwordResetTokens.set(token, {
      freelancerId: user.FreelancerID,
      email: user.Email,
      displayName: user.DisplayName,
      slug: user.Slug,
      expiresAt,
      used: false,
    });

    console.log("✅ Token stored");

    return {
      success: true,
      token,
      user: {
        id: user.FreelancerID,
        name: user.DisplayName,
        email: user.Email,
        slug: user.Slug,
      },
    };
  } catch (error) {
    console.error("Error creating reset token:", error);
    return {
      success: false,
      error: error.message || "Failed to create reset token",
    };
  }
}

/**
 * Validates a password reset token
 */
export async function validateResetToken(token) {
  try {
    console.log("🔍 Validating token");

    if (!global.passwordResetTokens) {
      global.passwordResetTokens = new Map();
    }

    const tokenData = global.passwordResetTokens.get(token);

    if (!tokenData) {
      console.log("❌ Token not found");
      return {
        valid: false,
        error: "Invalid token",
      };
    }

    if (tokenData.used) {
      console.log("❌ Token already used");
      return {
        valid: false,
        error: "Token has already been used",
      };
    }

    const now = new Date();
    if (now > tokenData.expiresAt) {
      console.log("❌ Token expired");
      return {
        valid: false,
        error: "Token has expired",
      };
    }

    console.log("✅ Token valid");

    return {
      valid: true,
      userId: tokenData.freelancerId,
      user: {
        id: tokenData.freelancerId,
        name: tokenData.displayName,
        email: tokenData.email,
        slug: tokenData.slug,
      },
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
 * Marks a reset token as used
 */
export async function markTokenAsUsed(token) {
  try {
    if (!global.passwordResetTokens) {
      global.passwordResetTokens = new Map();
    }

    const tokenData = global.passwordResetTokens.get(token);

    if (tokenData) {
      tokenData.used = true;
      tokenData.usedAt = new Date();
      console.log("✅ Token marked as used");
    }

    return { success: true };
  } catch (error) {
    console.error("Error marking token as used:", error);
    return {
      success: false,
      error: "Failed to mark token as used",
    };
  }
}
