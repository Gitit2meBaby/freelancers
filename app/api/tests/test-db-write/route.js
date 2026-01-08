// app/api/test-db-write/route.js
import { NextResponse } from "next/server";
import { executeQuery, executeUpdate, VIEWS, TABLES } from "@/app/lib/db";

export async function GET() {
  try {
    console.log("🧪 Testing database access...");

    // STEP 1: Test READ access
    console.log("📖 Step 1: Testing READ access...");
    const readResult = await executeQuery(
      `SELECT TOP 1 FreelancerID, DisplayName, Email FROM ${VIEWS.FREELANCERS} ORDER BY FreelancerID`,
      {}
    );

    if (readResult.length === 0) {
      throw new Error("No freelancers found in database");
    }

    const testFreelancer = readResult[0];
    console.log(`✅ Read access works! Found: ${testFreelancer.DisplayName}`);

    // STEP 2: Test WRITE access
    console.log("✏️ Step 2: Testing WRITE access...");

    const testTimestamp = new Date().toISOString();
    const originalBio = testFreelancer.FreelancerBio || "";

    try {
      await executeUpdate(
        TABLES.FREELANCER_WEBSITE_DATA,
        {
          FreelancerBio: `TEST UPDATE - ${testTimestamp}`,
        },
        { FreelancerID: testFreelancer.FreelancerID }
      );

      console.log(
        `✅ Write access works! Updated FreelancerID: ${testFreelancer.FreelancerID}`
      );

      // STEP 3: Verify the write worked
      const verifyResult = await executeQuery(
        `SELECT FreelancerBio FROM ${VIEWS.FREELANCERS} WHERE FreelancerID = @freelancerId`,
        { freelancerId: testFreelancer.FreelancerID }
      );

      const newBio = verifyResult[0]?.FreelancerBio || "";
      const writeVerified = newBio.includes(testTimestamp);

      // STEP 4: Restore original bio
      if (originalBio) {
        await executeUpdate(
          TABLES.FREELANCER_WEBSITE_DATA,
          { FreelancerBio: originalBio },
          { FreelancerID: testFreelancer.FreelancerID }
        );
        console.log(`🔄 Restored original bio`);
      }

      return NextResponse.json({
        success: true,
        message: "✅ FULL DATABASE ACCESS CONFIRMED",
        details: {
          readAccess: true,
          writeAccess: true,
          writeVerified: writeVerified,
          testedOn: {
            freelancerId: testFreelancer.FreelancerID,
            name: testFreelancer.DisplayName,
          },
        },
      });
    } catch (writeError) {
      // Write failed - probably permissions issue
      console.error("❌ Write access failed:", writeError.message);

      return NextResponse.json(
        {
          success: false,
          message: "❌ WRITE ACCESS DENIED",
          details: {
            readAccess: true,
            writeAccess: false,
            error: writeError.message,
            hint: "You need to ask Paul for UPDATE/INSERT/DELETE permissions on tblFreelancerWebsiteData",
          },
        },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("❌ Database test failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
