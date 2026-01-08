// app/api/test-my-files/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { executeQuery, VIEWS } from "@/app/lib/db";
import { getBlobUrl } from "@/app/lib/azureBlob";

/**
 * GET /api/test-my-files
 * Shows direct URLs to your uploaded photo and CV
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Not logged in" },
        { status: 401 }
      );
    }

    const freelancerId = parseInt(session.user.id);

    // Get current photo and CV blob IDs
    const query = `
      SELECT 
        FreelancerID,
        DisplayName,
        PhotoBlobID,
        PhotoStatusID,
        CVBlobID,
        CVStatusID
      FROM ${VIEWS.FREELANCERS}
      WHERE FreelancerID = @freelancerId
    `;

    const result = await executeQuery(query, { freelancerId });

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    const profile = result[0];

    // Generate Azure Blob URLs
    const photoUrl = profile.PhotoBlobID
      ? await getBlobUrl(profile.PhotoBlobID)
      : null;
    const cvUrl = profile.CVBlobID ? await getBlobUrl(profile.CVBlobID) : null;

    // Status meanings
    const statusMeanings = {
      0: "None",
      1: "To Be Verified (won't show on public profile)",
      2: "Verified (shows on public profile)",
      3: "Rejected by admin",
    };

    return NextResponse.json({
      success: true,
      freelancer: {
        id: profile.FreelancerID,
        name: profile.DisplayName,
      },
      photo: {
        blobId: profile.PhotoBlobID,
        status: statusMeanings[profile.PhotoStatusID] || "Unknown",
        statusCode: profile.PhotoStatusID,
        url: photoUrl,
        canView: !!photoUrl,
        note:
          profile.PhotoStatusID === 1
            ? "Photo uploaded but awaiting admin verification"
            : profile.PhotoStatusID === 2
            ? "Photo is verified and shows on your public profile"
            : "No photo or photo rejected",
      },
      cv: {
        blobId: profile.CVBlobID,
        status: statusMeanings[profile.CVStatusID] || "Unknown",
        statusCode: profile.CVStatusID,
        url: cvUrl,
        canView: !!cvUrl,
        note:
          profile.CVStatusID === 1
            ? "CV uploaded but awaiting admin verification"
            : profile.CVStatusID === 2
            ? "CV is verified and shows on your public profile"
            : "No CV or CV rejected",
      },
      instructions: {
        viewPhoto: photoUrl
          ? `Open this URL in browser: ${photoUrl}`
          : "No photo uploaded",
        viewCV: cvUrl ? `Open this URL in browser: ${cvUrl}` : "No CV uploaded",
        directLinks: {
          photo: photoUrl,
          cv: cvUrl,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
