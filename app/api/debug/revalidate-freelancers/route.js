// app/api/debug/revalidate-freelancers/route.js
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Force revalidate freelancer cache
 * Call this endpoint to clear cached freelancer data
 *
 * Usage: GET http://localhost:3000/api/revalidate-freelancers
 */
export async function GET() {
  try {
    // Revalidate the freelancers tag
    revalidateTag("freelancers");

    return NextResponse.json({
      success: true,
      message: "Freelancer cache invalidated",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error revalidating:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
