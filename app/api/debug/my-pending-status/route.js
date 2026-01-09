// app/api/my-pending-status/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { executeQuery, VIEWS, TABLES } from "@/app/lib/db";

/**
 * GET /api/my-pending-status
 * Checks if the current user has any pending (unverified) changes
 * Returns status for photo, CV, and bio
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const freelancerId = parseInt(session.user.id);

    // Get current status from view
    const query = `
      SELECT 
        PhotoBlobID,
        PhotoStatusID,
        CVBlobID,
        CVStatusID,
        FreelancerBio
      FROM ${VIEWS.FREELANCERS}
      WHERE FreelancerID = @freelancerId
    `;

    // Also get from table to check for unverified data
    const tableQuery = `
      SELECT 
        PhotoBlobID,
        PhotoStatusID,
        CVBlobID,
        CVStatusID,
        FreelancerBio
      FROM ${TABLES.FREELANCER_WEBSITE_DATA}
      WHERE FreelancerID = @freelancerId
    `;

    const viewData = await executeQuery(query, { freelancerId });

    let tableData;
    try {
      tableData = await executeQuery(tableQuery, { freelancerId });
    } catch (error) {
      // No SELECT permission on table - use view only
      tableData = viewData;
    }

    if (viewData.length === 0) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    const view = viewData[0];
    const table = tableData[0] || view;

    // Status codes:
    // 0 = None
    // 1 = To Be Verified
    // 2 = Verified
    // 3 = Rejected

    const pending = {
      photo: table.PhotoStatusID === 1, // Has photo waiting for verification
      cv: table.CVStatusID === 1, // Has CV waiting for verification
      bio: false, // Bio doesn't have status code, so we can't detect this easily
    };

    const details = {
      photo: {
        hasPending: pending.photo,
        statusCode: table.PhotoStatusID,
        blobId: table.PhotoBlobID,
        message: pending.photo
          ? "Photo update awaiting verification"
          : "No pending photo changes",
      },
      cv: {
        hasPending: pending.cv,
        statusCode: table.CVStatusID,
        blobId: table.CVBlobID,
        message: pending.cv
          ? "CV update awaiting verification"
          : "No pending CV changes",
      },
      bio: {
        hasPending: pending.bio,
        message: "Bio update awaiting verification",
      },
    };

    console.log("details:", details);

    return NextResponse.json({
      success: true,
      pending,
      details,
      summary: {
        hasPendingChanges: pending.photo || pending.cv || pending.bio,
        pendingCount:
          (pending.photo ? 1 : 0) +
          (pending.cv ? 1 : 0) +
          (pending.bio ? 1 : 0),
      },
    });
  } catch (error) {
    console.error("❌ Error checking pending status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
