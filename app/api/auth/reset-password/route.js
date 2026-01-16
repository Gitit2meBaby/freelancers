// app/api/auth/reset-password/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { executeUpdate, TABLES } from "../../../../app/lib/db";
import {
  validateResetToken,
  markTokenAsUsed,
} from "../../../../app/lib/passwordReset";
import { getPasswordChangeEmail } from "../../../../app/lib/emailTemplates";
import { sendGraphEmail } from "../../../../app/lib/graphClient";

/**
 * POST /api/auth/reset-password
 * Resets a user's password using a valid token
 */
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

    console.log("🔐 Password reset attempt with token");

    // Validate token
    const tokenResult = await validateResetToken(token);

    if (!tokenResult.valid) {
      console.error("❌ Invalid token");
      return NextResponse.json(
        {
          success: false,
          error: tokenResult.error || "Invalid or expired token",
        },
        { status: 400 }
      );
    }

    console.log("✅ Token valid for user:", tokenResult.user?.name);

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log("🔐 Updating password in database...");

    // Update password in database
    try {
      const rowsAffected = await executeUpdate(
        TABLES.FREELANCER_WEBSITE_DATA,
        { PasswordHash: hashedPassword },
        { FreelancerID: tokenResult.userId }
      );

      if (rowsAffected === 0) {
        console.error("❌ Failed to update password - no rows affected");
        return NextResponse.json(
          {
            success: false,
            error: "Failed to update password. Please try again.",
          },
          { status: 500 }
        );
      }

      console.log("✅ Password updated in database");
    } catch (dbError) {
      console.error("❌ Database error updating password:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update password. Please try again.",
        },
        { status: 500 }
      );
    }

    // Mark token as used
    await markTokenAsUsed(token);
    console.log("✅ Token marked as used");

    // Send confirmation email
    if (tokenResult.user) {
      try {
        const confirmationEmail = getPasswordChangeEmail(tokenResult.user);
        const senderEmail =
          process.env.GRAPH_SENDER_EMAIL || "info@freelancers.com.au";

        console.log("📤 Sending password change confirmation email...");

        const emailResult = await sendGraphEmail(
          senderEmail,
          tokenResult.user.email,
          confirmationEmail.subject,
          confirmationEmail.html
        );

        if (emailResult.success) {
          console.log("✅ Confirmation email sent");
        } else {
          console.error(
            "❌ Failed to send confirmation email:",
            emailResult.error
          );
          // Don't fail the request if email fails - password was changed successfully
        }
      } catch (emailError) {
        console.error("❌ Error sending confirmation email:", emailError);
        // Don't fail the request if email fails
      }
    }

    console.log("✅ Password reset completed successfully");

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("❌ Password reset error:", error);
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
 *
 * SECURITY CONSIDERATIONS:
 *
 * 1. Token Validation:
 *    - Check expiration time
 *    - Check if already used
 *    - Token stored in memory (temporary)
 *
 * 2. Password Hashing:
 *    - Use bcrypt with high cost factor
 *    - Never log actual passwords
 *
 * 3. Audit Trail:
 *    - Log password changes (console for now)
 *    - Send confirmation email
 *
 * 4. Token Cleanup:
 *    - Mark as used immediately
 *    - Prevent token reuse
 */
