// app/api/admin/verify/route.js
import { NextResponse } from "next/server";

/**
 * POST /api/admin/verify
 *
 * Verifies the admin password server-side.
 *
 * Why this exists instead of checking process.env.NEXT_PUBLIC_ADMIN_PASSWORD
 * in the browser:
 *
 * 1. NEXT_PUBLIC_ vars are baked into the JS bundle at BUILD TIME by Next.js.
 *    If the var is set or changed in Azure App Settings after the last build,
 *    the old value (or undefined) stays in the bundle until the next deploy.
 *    This was causing "Incorrect credentials" for users on the live site even
 *    when the password in Azure was correct.
 *
 * 2. Putting any password in a NEXT_PUBLIC_ var exposes it in the browser
 *    bundle — anyone can find it in DevTools. Using a server-only var
 *    (ADMIN_PASSWORD, no NEXT_PUBLIC_ prefix) keeps it out of the bundle.
 *
 * This route reads process.env.ADMIN_PASSWORD at REQUEST TIME directly from
 * Azure App Settings — always current, never exposed to the client.
 *
 * Azure App Setting to add:
 *   Name:  ADMIN_PASSWORD
 *   Value: (your admin password)
 *
 * You can remove NEXT_PUBLIC_ADMIN_PASSWORD from Azure App Settings once
 * this is deployed.
 */
export async function POST(request) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password is required." },
        { status: 400 },
      );
    }

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      // Env var not configured — fail safely rather than allowing blank-password access
      console.error("❌ ADMIN_PASSWORD env var is not set");
      return NextResponse.json(
        {
          success: false,
          error:
            "Admin authentication is not configured. Contact your developer.",
        },
        { status: 500 },
      );
    }

    if (password !== adminPassword) {
      // Intentionally vague — don't confirm whether the user or password was wrong
      return NextResponse.json(
        { success: false, error: "Incorrect credentials. Please try again." },
        { status: 401 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Admin verify error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 },
    );
  }
}
