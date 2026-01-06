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
