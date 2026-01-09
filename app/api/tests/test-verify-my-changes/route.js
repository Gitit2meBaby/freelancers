// app/api/test-verify-my-changes/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  executeQuery,
  executeUpdate,
  VIEWS,
  TABLES,
  STATUS_CODES,
} from "../../../lib/db";

/**
 * POST /api/test-verify-my-changes
 *
 * FOR TESTING ONLY: Simulates admin verification of your pending changes
 * Sets PhotoStatusID and CVStatusID from 1 (To Be Verified) to 2 (Verified)
 *
 */
export async function POST() {
  try {
    // ============================================
    // STEP 1: Get the current user's session
    // ============================================
    const session = await getServerSession(authOptions);

    // Check if user is logged in
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Not logged in" },
        { status: 401 }
      );
    }

    // Get freelancer ID from session
    // session.user.id is stored as a string, convert to number
    const freelancerId = parseInt(session.user.id);

    console.log(`🔍 Verifying changes for FreelancerID: ${freelancerId}`);

    // ============================================
    // STEP 2: Check current status
    // ============================================
    // First, let's see what the current status is
    // We use the VIEW to read the data (we have SELECT permission on views)
    const currentStatusQuery = `
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

    const currentData = await executeQuery(currentStatusQuery, {
      freelancerId,
    });

    // Check if freelancer exists
    if (currentData.length === 0) {
      return NextResponse.json(
        { success: false, error: "Freelancer not found" },
        { status: 404 }
      );
    }

    const current = currentData[0];

    console.log("📊 Current status:", {
      photo: current.PhotoStatusID,
      cv: current.CVStatusID,
    });

    // ============================================
    // STEP 3: Update status codes to "Verified"
    // ============================================
    // Now we UPDATE the actual TABLE (not the view)
    // We have UPDATE permission on tables

    // Build update object - only update fields that need verification
    const updates = {};
    let changesDetected = false;

    // Check if photo needs verification (status = 1)
    if (current.PhotoStatusID === STATUS_CODES.TO_BE_VERIFIED) {
      updates.PhotoStatusID = STATUS_CODES.VERIFIED; // Change 1 → 2
      changesDetected = true;
      console.log("✅ Will verify photo");
    }

    // Check if CV needs verification (status = 1)
    if (current.CVStatusID === STATUS_CODES.TO_BE_VERIFIED) {
      updates.CVStatusID = STATUS_CODES.VERIFIED; // Change 1 → 2
      changesDetected = true;
      console.log("✅ Will verify CV");
    }

    // If no changes need verification, return early
    if (!changesDetected) {
      return NextResponse.json({
        success: true,
        message: "No pending changes to verify",
        current: {
          photoStatus: current.PhotoStatusID,
          cvStatus: current.CVStatusID,
        },
      });
    }

    // Execute the UPDATE on the TABLE
    // executeUpdate(tableName, dataToUpdate, whereCondition)
    await executeUpdate(
      TABLES.FREELANCER_WEBSITE_DATA, // ← The actual table (not view)
      updates, // ← What to change { PhotoStatusID: 2 }
      { FreelancerID: freelancerId } // ← WHERE clause (which row to update)
    );

    console.log("✅ Status updated successfully");

    // ============================================
    // STEP 4: Verify the update worked
    // ============================================
    // Query again to confirm the changes were saved
    const verifiedData = await executeQuery(currentStatusQuery, {
      freelancerId,
    });
    const verified = verifiedData[0];

    // ============================================
    // STEP 5: Return success response
    // ============================================
    return NextResponse.json({
      success: true,
      message:
        "Changes verified successfully! Your updates should now be visible on your profile.",
      before: {
        photoStatus: `${current.PhotoStatusID} (${getStatusName(
          current.PhotoStatusID
        )})`,
        cvStatus: `${current.CVStatusID} (${getStatusName(
          current.CVStatusID
        )})`,
      },
      after: {
        photoStatus: `${verified.PhotoStatusID} (${getStatusName(
          verified.PhotoStatusID
        )})`,
        cvStatus: `${verified.CVStatusID} (${getStatusName(
          verified.CVStatusID
        )})`,
      },
      nextSteps: [
        "Visit your profile page to see the changes",
        "Your photo/CV should now be visible",
        "Yellow pending indicators should be gone",
      ],
    });
  } catch (error) {
    console.error("❌ Error verifying changes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        hint: "Check that you have UPDATE permission on tblFreelancerWebsiteData",
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get human-readable status name
 */
function getStatusName(statusCode) {
  const statuses = {
    0: "None",
    1: "To Be Verified",
    2: "Verified",
    3: "Rejected",
  };
  return statuses[statusCode] || "Unknown";
}

/**
 * ============================================
 * HOW THIS WORKS - LINE BY LINE:
 * ============================================
 *
 * 1. Get your FreelancerID from session
 *    const freelancerId = parseInt(session.user.id);
 *
 * 2. Read current status from VIEW
 *    SELECT PhotoStatusID, CVStatusID FROM vwFreelancersListWEB2
 *
 * 3. Build update object for fields that need verification
 *    updates.PhotoStatusID = 2;  // 1 → 2 (To Be Verified → Verified)
 *
 * 4. Execute UPDATE on TABLE (not view)
 *    await executeUpdate(
 *      "tblFreelancerWebsiteData",     // Table name
 *      { PhotoStatusID: 2 },           // What to change
 *      { FreelancerID: 1152 }          // Which row (WHERE clause)
 *    );
 *
 * 5. Verify it worked by querying again
 *    SELECT PhotoStatusID FROM vwFreelancersListWEB2
 *
 * ============================================
 * SQL EQUIVALENT:
 * ============================================
 *
 * UPDATE tblFreelancerWebsiteData
 * SET PhotoStatusID = 2,
 *     CVStatusID = 2
 * WHERE FreelancerID = 1152;
 *
 * ============================================
 */
