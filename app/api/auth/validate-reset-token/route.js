// app/api/auth/validate-reset-token/route.js
import { NextResponse } from "next/server";
import { validateResetToken } from "../../../../app/lib/passwordReset";

/**
 * POST /api/auth/validate-reset-token
 * Validates a password reset token
 */
export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const result = await validateResetToken(token);

    if (result.valid) {
      return NextResponse.json({
        valid: true,
        // Don't send sensitive user data to client
      });
    } else {
      return NextResponse.json({
        valid: false,
        error: result.error || "Invalid or expired token",
      });
    }
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate token" },
      { status: 500 }
    );
  }
}

// ==========================================
// app/api/auth/reset-password/route.js
// ==========================================
/**
 * POST /api/auth/reset-password
 * Resets a user's password using a valid token
 */

import bcrypt from "bcryptjs";
import { executeUpdate, TABLES, VIEWS } from "@/app/lib/db";
import { markTokenAsUsed } from "@/app/lib/passwordReset";
import { getPasswordChangeEmail, sendEmail } from "@/app/lib/emailTemplates";

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    // Validate inputs
    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: "Token and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 8 characters long",
        },
        { status: 400 }
      );
    }

    if (
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must contain uppercase, lowercase, and numbers",
        },
        { status: 400 }
      );
    }

    // Validate token
    const tokenResult = await validateResetToken(token);

    if (!tokenResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: tokenResult.error || "Invalid or expired token",
        },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // TODO: Update password in database once Paul grants write access
    console.log("====================================");
    console.log("🔐 PASSWORD RESET");
    console.log("====================================");
    console.log("User ID:", tokenResult.userId);
    console.log("User:", tokenResult.user?.name);
    console.log("New Password Hash:", hashedPassword);
    console.log("====================================");

    /*
    // Uncomment once write access is granted:
    await executeUpdate(
      TABLES.FREELANCER_WEBSITE_DATA,
      { PasswordHash: hashedPassword },
      { FreelancerID: tokenResult.userId }
    );
    */

    // Mark token as used
    await markTokenAsUsed(token);

    // Send confirmation email
    if (tokenResult.user) {
      const confirmationEmail = getPasswordChangeEmail(tokenResult.user);

      // TODO: Send email via Microsoft Graph API
      /*
      await sendEmail(tokenResult.user.email, confirmationEmail);
      */

      console.log("📧 Password change email preview:");
      console.log("To:", tokenResult.user.email);
      console.log("Subject:", confirmationEmail.subject);
    }

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to reset password. Please try again.",
      },
      { status: 500 }
    );
  }
}

/**
 * PASSWORD HASHING NOTES:
 *
 * 1. Using bcrypt with cost factor 12 (recommended)
 * 2. Higher cost = more secure but slower
 * 3. Cost factor 12 = ~300ms to hash
 * 4. Never store passwords in plain text
 *
 * PASSWORD REQUIREMENTS:
 *
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - (Optional) Special characters
 *
 * SECURITY CONSIDERATIONS:
 *
 * 1. Token Validation:
 *    - Check expiration time
 *    - Check if already used
 *    - Check if user is active
 *
 * 2. Password Hashing:
 *    - Use bcrypt (or argon2)
 *    - Use high cost factor
 *    - Never log actual passwords
 *
 * 3. Audit Trail:
 *    - Log password changes
 *    - Store IP address
 *    - Send confirmation email
 *
 * 4. Token Cleanup:
 *    - Mark as used immediately
 *    - Delete expired tokens daily
 *    - Prevent token reuse
 */
