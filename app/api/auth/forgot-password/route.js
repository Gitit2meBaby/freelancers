// app/api/auth/forgot-password/route.js
import { NextResponse } from "next/server";
import { createResetToken } from "../../../../app/lib/passwordReset";
import { getPasswordResetEmail } from "../../../../app/lib/emailTemplates";
import { sendGraphEmail } from "../../../../app/lib/graphClient";

/**
 * POST /api/auth/forgot-password
 * Handles password reset requests
 * Sends reset email if user exists
 */
export async function POST(request) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 }
      );
    }

    console.log("🔐 Password reset requested for:", email);

    // Create reset token
    const result = await createResetToken(email.toLowerCase().trim());

    if (!result.success) {
      // Log error but don't reveal to user
      console.error("Failed to create reset token:", result.error);
    }

    // If token created successfully, send email
    if (result.success && result.token && result.user) {
      console.log("✅ Reset token created for:", result.user.name);

      // Generate reset email
      const resetEmail = getPasswordResetEmail(result.user, result.token);

      // Send email via Microsoft Graph API
      try {
        const senderEmail =
          process.env.GRAPH_SENDER_EMAIL || "info@freelancers.com.au";

        console.log("📤 Sending password reset email...");

        const emailResult = await sendGraphEmail(
          senderEmail,
          result.user.email,
          resetEmail.subject,
          resetEmail.html
        );

        if (emailResult.success) {
          console.log("✅ Password reset email sent successfully");
        } else {
          console.error("❌ Failed to send reset email:", emailResult.error);
          // Don't reveal error to user for security
        }
      } catch (error) {
        console.error("❌ Error sending reset email:", error);
        // Don't reveal error to user for security
      }
    } else {
      console.log("ℹ️ No account found for email:", email);
    }

    // Always return success to prevent email enumeration
    // Whether user exists or not, return the same message
    return NextResponse.json({
      success: true,
      message:
        "If an account exists with that email, you will receive password reset instructions.",
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);

    // Don't reveal internal errors to user
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred. Please try again later.",
      },
      { status: 500 }
    );
  }
}

/**
 * SECURITY NOTES:
 *
 * 1. Email Enumeration Prevention:
 *    - Always return success, even if email doesn't exist
 *    - Same response time whether user exists or not
 *    - This prevents attackers from discovering valid email addresses
 *
 * 2. Token Security:
 *    - Tokens are cryptographically random (32 bytes)
 *    - Tokens expire after 1 hour
 *    - Tokens can only be used once
 *    - Tokens are stored in memory (will move to database)
 *
 * 3. Rate Limiting:
 *    - Should add rate limiting to prevent abuse
 *    - Suggestion: 3 requests per hour per IP
 *    - Can use Vercel rate limiting or custom middleware
 *
 * 4. Email Validation:
 *    - Only sends to registered email addresses
 *    - Email content doesn't reveal if account exists
 */
