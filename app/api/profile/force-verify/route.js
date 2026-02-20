// app/api/profile/force-verify/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { executeUpdate, TABLES, STATUS_CODES } from "../../../lib/db";

/**
 * POST /api/profile/force-verify
 * Forces verification status to VERIFIED for current user
 * This is a temporary endpoint to fix existing profiles
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const freelancerId = parseInt(session.user.id);

    // Update photo and CV status to VERIFIED
    await executeUpdate(
      TABLES.FREELANCER_WEBSITE_DATA,
      {
        PhotoStatusID: STATUS_CODES.VERIFIED,
        CVStatusID: STATUS_CODES.VERIFIED,
      },
      { FreelancerID: freelancerId },
    );

    return NextResponse.json({
      success: true,
      message: "Verification status updated to VERIFIED",
      freelancerId,
      photoStatus: STATUS_CODES.VERIFIED,
      cvStatus: STATUS_CODES.VERIFIED,
    });
  } catch (error) {
    console.error("Error forcing verification:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update verification status",
      },
      { status: 500 },
    );
  }
}

/**
 * BROWSER CONSOLE SCRIPT
 * Run this in your browser console to:
 * 1. Update verification status for your profile
 * 2. Clear all caches
 * 3. Reload the page
 *
 * HOW TO USE:
 * 1. Open browser console (F12 or Cmd+Option+J on Mac)
 * 2. Copy and paste this entire script
 * 3. Press Enter
 */

// (async function() {
//   console.log('🚀 Starting verification status update and cache clear...');

//   try {
//     // Step 1: Update verification status directly in database via API
//     console.log('📝 Step 1: Updating verification status...');

//     const updateResponse = await fetch('/api/profile/force-verify', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });

//     const updateResult = await updateResponse.json();

//     if (updateResult.success) {
//       console.log('✅ Verification status updated:', updateResult);
//     } else {
//       console.log('⚠️ Verification status update response:', updateResult);
//     }

//     // Step 2: Clear all caches
//     console.log('🗑️ Step 2: Clearing caches...');

//     const clearCacheResponse = await fetch('/api/clear-cache', {
//       method: 'POST',
//     });

//     const cacheResult = await clearCacheResponse.json();
//     console.log('✅ Cache cleared:', cacheResult);

//     // Step 3: Wait a moment then reload
//     console.log('🔄 Step 3: Reloading page in 2 seconds...');

//     setTimeout(() => {
//       console.log('✅ All done! Reloading...');
//       location.reload();
//     }, 2000);

//   } catch (error) {
//     console.error('❌ Error:', error);
//     console.log('Please try the manual SQL approach instead.');
//   }
// })();
