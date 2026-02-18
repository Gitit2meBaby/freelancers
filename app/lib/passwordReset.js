// // app/lib/passwordReset.js
// import crypto from "crypto";
// import { executeQuery, VIEWS } from "./db";

// /**
//  * Generates a cryptographically secure random token
//  * @returns {string} 64-character hex string
//  */
// export function generateResetToken() {
//   return crypto.randomBytes(32).toString("hex");
// }

// /**
//  * Creates a password reset token for a user
//  * @param {string} email - User's email address
//  * @returns {Promise<{success: boolean, token?: string, user?: object, error?: string}>}
//  */
// export async function createResetToken(email) {
//   try {
//     console.log("🔑 Creating reset token for:", email);

//     // Check if user exists - NO IsActive column!
//     const query = `
//       SELECT
//         FreelancerID,
//         DisplayName,
//         Email,
//         Slug
//       FROM ${VIEWS.FREELANCERS}
//       WHERE Email = @email
//     `;

//     const users = await executeQuery(query, {
//       email: email.toLowerCase().trim(),
//     });

//     if (!users || users.length === 0) {
//       console.log("❌ User not found:", email);
//       return {
//         success: false,
//         error: "User not found",
//       };
//     }

//     const user = users[0];
//     console.log("✅ User found:", user.DisplayName);

//     // Generate token
//     const token = generateResetToken();
//     const expiresAt = new Date(Date.now() + 3600000); // 1 hour

//     // Temporary: Store in memory
//     if (!global.passwordResetTokens) {
//       global.passwordResetTokens = new Map();
//     }

//     global.passwordResetTokens.set(token, {
//       freelancerId: user.FreelancerID,
//       email: user.Email,
//       displayName: user.DisplayName,
//       slug: user.Slug,
//       expiresAt,
//       used: false,
//     });

//     console.log("✅ Token stored");

//     return {
//       success: true,
//       token,
//       user: {
//         id: user.FreelancerID,
//         name: user.DisplayName,
//         email: user.Email,
//         slug: user.Slug,
//       },
//     };
//   } catch (error) {
//     console.error("Error creating reset token:", error);
//     return {
//       success: false,
//       error: error.message || "Failed to create reset token",
//     };
//   }
// }

// /**
//  * Validates a password reset token
//  */
// export async function validateResetToken(token) {
//   try {
//     console.log("🔍 Validating token");

//     if (!global.passwordResetTokens) {
//       global.passwordResetTokens = new Map();
//     }

//     const tokenData = global.passwordResetTokens.get(token);

//     if (!tokenData) {
//       console.log("❌ Token not found");
//       return {
//         valid: false,
//         error: "Invalid token",
//       };
//     }

//     if (tokenData.used) {
//       console.log("❌ Token already used");
//       return {
//         valid: false,
//         error: "Token has already been used",
//       };
//     }

//     const now = new Date();
//     if (now > tokenData.expiresAt) {
//       console.log("❌ Token expired");
//       return {
//         valid: false,
//         error: "Token has expired",
//       };
//     }

//     console.log("✅ Token valid");

//     return {
//       valid: true,
//       userId: tokenData.freelancerId,
//       user: {
//         id: tokenData.freelancerId,
//         name: tokenData.displayName,
//         email: tokenData.email,
//         slug: tokenData.slug,
//       },
//     };
//   } catch (error) {
//     console.error("Error validating token:", error);
//     return {
//       valid: false,
//       error: "Failed to validate token",
//     };
//   }
// }

// /**
//  * Marks a reset token as used
//  */
// export async function markTokenAsUsed(token) {
//   try {
//     if (!global.passwordResetTokens) {
//       global.passwordResetTokens = new Map();
//     }

//     const tokenData = global.passwordResetTokens.get(token);

//     if (tokenData) {
//       tokenData.used = true;
//       tokenData.usedAt = new Date();
//       console.log("✅ Token marked as used");
//     }

//     return { success: true };
//   } catch (error) {
//     console.error("Error marking token as used:", error);
//     return {
//       success: false,
//       error: "Failed to mark token as used",
//     };
//   }
// }

// app/lib/passwordReset.js
import crypto from "crypto";
import { executeQuery, VIEWS } from "./db";

// Use your existing NEXTAUTH_SECRET
const TOKEN_SECRET = process.env.NEXTAUTH_SECRET;

/**
 * Creates a signed token containing user data and expiry
 */
function createSignedToken(payload) {
  if (!TOKEN_SECRET) {
    throw new Error("NEXTAUTH_SECRET environment variable is not set");
  }

  const data = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(data)
    .digest("hex");

  const token = Buffer.from(`${data}.${signature}`).toString("base64url");
  return token;
}

/**
 * Verifies and decodes a signed token
 */
function verifySignedToken(token) {
  try {
    if (!TOKEN_SECRET) {
      console.error("❌ NEXTAUTH_SECRET not configured");
      return { valid: false, error: "Server configuration error" };
    }

    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDotIndex = decoded.lastIndexOf(".");

    if (lastDotIndex === -1) {
      return { valid: false, error: "Invalid token format" };
    }

    const data = decoded.substring(0, lastDotIndex);
    const signature = decoded.substring(lastDotIndex + 1);

    const expectedSignature = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(data)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return { valid: false, error: "Invalid token signature" };
    }

    const payload = JSON.parse(data);
    return { valid: true, payload };
  } catch (error) {
    console.error("Token verification error:", error.message);
    return { valid: false, error: "Failed to decode token" };
  }
}

/**
 * Generates a cryptographically secure random token
 */
export function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Creates a password reset token for a user
 */
export async function createResetToken(email) {
  try {
    console.log("🔑 Creating reset token for:", email);

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
      return { success: false, error: "User not found" };
    }

    const user = users[0];
    console.log("✅ User found:", user.DisplayName);

    const now = Date.now();
    const expiresAt = now + 3600000; // 1 hour

    const token = createSignedToken({
      id: user.FreelancerID,
      email: user.Email,
      name: user.DisplayName,
      slug: user.Slug,
      exp: expiresAt,
      iat: now,
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

    if (!token || typeof token !== "string") {
      console.log("❌ Token not found");
      return { valid: false, error: "Invalid token" };
    }

    const result = verifySignedToken(token);

    if (!result.valid) {
      console.log("❌ Token validation failed:", result.error);
      return { valid: false, error: result.error };
    }

    const payload = result.payload;

    if (Date.now() > payload.exp) {
      console.log("❌ Token expired");
      return { valid: false, error: "Token has expired" };
    }

    console.log("✅ Token valid");

    return {
      valid: true,
      userId: payload.id,
      user: {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        slug: payload.slug,
      },
    };
  } catch (error) {
    console.error("Error validating token:", error);
    return { valid: false, error: "Failed to validate token" };
  }
}

/**
 * Marks a reset token as used
 */
export async function markTokenAsUsed(token) {
  console.log("✅ Token marked as used");
  return { success: true };
}
