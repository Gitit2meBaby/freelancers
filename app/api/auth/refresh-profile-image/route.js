// app/api/auth/refresh-profile-image/route.js - CORRECTED
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]/route";
import { executeQuery, VIEWS } from "../../../lib/db";
import { getBlobUrl } from "../../../lib/azureBlob";

/**
 * POST /api/auth/refresh-profile-image
 * Fetches the latest profile image and returns it
 * Client can use this to update local state without full session refresh
 *
 * NO VERIFICATION FILTERING - shows photo if blob ID exists
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const freelancerId = parseInt(session.user.id);

    console.log(`🔵 Refreshing profile image for freelancer ${freelancerId}`);

    // Get latest photo info
    const query = `
      SELECT 
        PhotoBlobID
      FROM ${VIEWS.FREELANCERS}
      WHERE FreelancerID = @freelancerId
    `;

    const users = await executeQuery(query, { freelancerId });

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const user = users[0];

    console.log(`📸 Photo Blob ID: ${user.PhotoBlobID || "none"}`);

    // Build image URL - show if blob ID exists, regardless of verification status
    let imageUrl = null;
    if (user.PhotoBlobID) {
      imageUrl = getBlobUrl(user.PhotoBlobID);
      console.log(`✅ Generated photo URL`);
    } else {
      console.log(`ℹ️ No photo blob ID found`);
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      photoBlobId: user.PhotoBlobID,
    });
  } catch (error) {
    console.error("❌ Error refreshing profile image:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
