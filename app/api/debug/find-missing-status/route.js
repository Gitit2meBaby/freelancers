// app/api/find-missing-status/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { executeQuery, VIEWS, TABLES } from "@/app/lib/db";

/**
 * GET /api/find-missing-status
 *
 * Finds ALL columns in the freelancer table to identify
 * which status/verification fields we're missing
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

    // ============================================
    // 1. Get ALL column names from the table
    // ============================================
    const tableColumnsQuery = `
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'tblFreelancerWebsiteData'
      ORDER BY ORDINAL_POSITION
    `;

    const allColumns = await executeQuery(tableColumnsQuery, {});

    // Filter for status-related columns
    const statusColumns = allColumns.filter(
      (col) =>
        col.COLUMN_NAME.toLowerCase().includes("status") ||
        col.COLUMN_NAME.toLowerCase().includes("active") ||
        col.COLUMN_NAME.toLowerCase().includes("verified") ||
        col.COLUMN_NAME.toLowerCase().includes("show") ||
        col.COLUMN_NAME.toLowerCase().includes("visible") ||
        col.COLUMN_NAME.toLowerCase().includes("enabled")
    );

    // ============================================
    // 2. Try to SELECT all columns from view for your record
    // ============================================
    const viewAllQuery = `
      SELECT *
      FROM ${VIEWS.FREELANCERS}
      WHERE FreelancerID = @freelancerId
    `;

    const viewAllData = await executeQuery(viewAllQuery, { freelancerId });
    const yourData = viewAllData[0] || null;

    // ============================================
    // 3. Check common status column names
    // ============================================
    const commonStatusFields = [
      "StatusID",
      "Status",
      "VerificationStatusID",
      "IsVerified",
      "IsActive",
      "ShowOnWebsite",
      "IsEnabled",
      "AccountStatus",
      "ProfileStatus",
      "MemberStatus",
      "Active",
    ];

    const foundStatusFields = {};
    if (yourData) {
      for (const field of commonStatusFields) {
        if (yourData.hasOwnProperty(field)) {
          foundStatusFields[field] = yourData[field];
        }
      }
    }

    // ============================================
    // 4. Get a sample verified user for comparison
    // ============================================
    const verifiedUserQuery = `
      SELECT TOP 1 *
      FROM ${VIEWS.FREELANCERS}
      WHERE FreelancerID != @freelancerId
      AND PhotoBlobID IS NOT NULL
      AND FreelancerBio IS NOT NULL
    `;

    const verifiedSample = await executeQuery(verifiedUserQuery, {
      freelancerId,
    });
    const verifiedUser = verifiedSample[0] || null;

    // Compare status fields
    const comparison = {};
    if (yourData && verifiedUser) {
      const allKeys = new Set([
        ...Object.keys(yourData),
        ...Object.keys(verifiedUser),
      ]);

      for (const key of allKeys) {
        if (
          key.toLowerCase().includes("status") ||
          key.toLowerCase().includes("active") ||
          key.toLowerCase().includes("show") ||
          key.toLowerCase().includes("verified")
        ) {
          comparison[key] = {
            yours: yourData[key],
            working: verifiedUser[key],
            match: yourData[key] === verifiedUser[key],
          };
        }
      }
    }

    // ============================================
    // 5. Return comprehensive status analysis
    // ============================================
    return NextResponse.json({
      success: true,

      allTableColumns: {
        total: allColumns.length,
        columns: allColumns.map((c) => c.COLUMN_NAME),
      },

      statusRelatedColumns: {
        found: statusColumns.length,
        columns: statusColumns.map((c) => ({
          name: c.COLUMN_NAME,
          type: c.DATA_TYPE,
          nullable: c.IS_NULLABLE,
        })),
      },

      yourStatusValues: foundStatusFields,

      allYourData: yourData,

      comparison: {
        description: "Comparing your record vs a working verified user",
        differences: comparison,
      },

      suspiciousFindings: Object.entries(comparison)
        .filter(([key, val]) => !val.match)
        .map(([key, val]) => ({
          column: key,
          yourValue: val.yours,
          workingValue: val.working,
          likelyIssue:
            val.yours === null || val.yours === 0 || val.yours === false,
        })),

      recommendations: [
        "Look for columns where yours=false/0/null but working=true/1/value",
        "These are likely the fields blocking your profile from showing",
        "You'll need to UPDATE these to match the working user",
      ],
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
