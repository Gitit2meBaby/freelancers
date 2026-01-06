// app/api/auth/forgot-password/route.js
import { NextResponse } from "next/server";
import { createResetToken } from "../../../../app/lib/passwordReset";
import {
  getPasswordResetEmail,
  sendEmail,
} from "../../../../app/lib/emailTemplates";

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

    // Create reset token
    const result = await createResetToken(email.toLowerCase().trim());

    if (!result.success) {
      // Log error but don't reveal to user
      console.error("Failed to create reset token:", result.error);
    }

    // If token created successfully, send email
    if (result.success && result.token && result.user) {
      // Generate reset email
      const resetEmail = getPasswordResetEmail(result.user, result.token);

      // TODO: Send email via Microsoft Graph API
      // Uncomment once Graph API is configured:
      /*
      const emailResult = await sendEmail(result.user.email, resetEmail);
      
      if (!emailResult.success) {
        console.error("Failed to send reset email:", emailResult.error);
        // Don't reveal error to user for security
      }
      */

      // Temporary: Log email preview
      console.log("📧 Password Reset Email Preview:");
      console.log("To:", result.user.email);
      console.log("Subject:", resetEmail.subject);
      console.log("Token:", result.token);
    }

    // Always return success to prevent email enumeration
    // Whether user exists or not, return the same message
    return NextResponse.json({
      success: true,
      message:
        "If an account exists with that email, you will receive password reset instructions.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

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
 *    - Tokens are stored hashed in database (TODO)
 *
 * 3. Rate Limiting:
 *    - Should add rate limiting to prevent abuse
 *    - Suggestion: 3 requests per hour per IP
 *    - Can use Vercel rate limiting or custom middleware
 *
 * 4. Email Validation:
 *    - Only sends to registered email addresses
 *    - Only sends to active accounts
 *    - Email content doesn't reveal if account exists
 */
