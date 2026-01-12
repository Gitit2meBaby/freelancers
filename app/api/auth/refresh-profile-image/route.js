// app/api/auth/refresh-profile-image/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]/route";
import { executeQuery, VIEWS } from "@/app/lib/db";
import { getBlobUrl } from "@/app/lib/azureBlob";

/**
 * POST /api/auth/refresh-profile-image
 * Fetches the latest profile image and returns it
 * Client can use this to update local state without full session refresh
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const freelancerId = parseInt(session.user.id);

    // Get latest photo info
    const query = `
      SELECT 
        PhotoBlobID,
        PhotoStatusID
      FROM ${VIEWS.FREELANCERS}
      WHERE FreelancerID = @freelancerId
    `;

    const users = await executeQuery(query, { freelancerId });

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const user = users[0];

    // Build image URL
    let imageUrl = null;
    if (user.PhotoBlobID && user.PhotoStatusID === 2) {
      imageUrl = getBlobUrl(user.PhotoBlobID);
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      photoBlobId: user.PhotoBlobID,
      photoStatusId: user.PhotoStatusID,
    });
  } catch (error) {
    console.error("Error refreshing profile image:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
