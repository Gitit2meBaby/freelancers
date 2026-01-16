// app/api/debug-my-data/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { executeQuery, VIEWS, TABLES } from "../../../lib/db";

/**
 * GET /api/debug-my-data
 *
 * Comprehensive diagnostic to understand why data isn't showing
 * Compares what's in the TABLE vs what's in the VIEW
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

    console.log(`🔍 Debugging data for FreelancerID: ${freelancerId}`);

    // ============================================
    // 1. Check what's in the TABLE (raw data)
    // ============================================
    let tableData = null;
    try {
      const tableQuery = `
        SELECT 
          FreelancerID,
          DisplayName,
          FreelancerBio,
          PhotoBlobID,
          PhotoStatusID,
          CVBlobID,
          CVStatusID,
          ShowOnWebsite,
          IsActive
        FROM ${TABLES.FREELANCER_WEBSITE_DATA}
        WHERE FreelancerID = @freelancerId
      `;

      const tableResult = await executeQuery(tableQuery, { freelancerId });
      tableData = tableResult[0] || null;
    } catch (error) {
      console.log("⚠️ No SELECT permission on table");
    }

    // ============================================
    // 2. Check what's in the VIEW (filtered data)
    // ============================================
    const viewQuery = `
      SELECT 
        FreelancerID,
        DisplayName,
        FreelancerBio,
        PhotoBlobID,
        PhotoStatusID,
        CVBlobID,
        CVStatusID,
        Slug
      FROM ${VIEWS.FREELANCERS}
      WHERE FreelancerID = @freelancerId
    `;

    const viewResult = await executeQuery(viewQuery, { freelancerId });
    const viewData = viewResult[0] || null;

    // ============================================
    // 3. Check what columns the view actually has
    // ============================================
    const viewColumnsQuery = `
      SELECT TOP 1 * 
      FROM ${VIEWS.FREELANCERS}
      WHERE FreelancerID = @freelancerId
    `;

    const viewSample = await executeQuery(viewColumnsQuery, { freelancerId });
    const availableColumns =
      viewSample.length > 0 ? Object.keys(viewSample[0]) : [];

    // ============================================
    // 4. Check the view definition (if possible)
    // ============================================
    let viewDefinition = null;
    try {
      const viewDefQuery = `
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'vwFreelancersListWEB2'
        ORDER BY ORDINAL_POSITION
      `;
      viewDefinition = await executeQuery(viewDefQuery, {});
    } catch (error) {
      console.log("⚠️ Can't get view definition");
    }

    // ============================================
    // 5. Try to understand why data is null
    // ============================================
    const diagnosis = [];

    // Check if FreelancerBio column exists in view
    if (!availableColumns.includes("FreelancerBio")) {
      diagnosis.push({
        issue: "❌ CRITICAL: FreelancerBio column not in view",
        explanation: "The view doesn't include the bio column at all",
        solution: "Ask Paul to add FreelancerBio to vwFreelancersListWEB2",
      });
    }

    // Check if data exists in table vs view
    if (tableData) {
      if (tableData.FreelancerBio && !viewData?.FreelancerBio) {
        diagnosis.push({
          issue: "❌ Bio exists in TABLE but NULL in VIEW",
          tableValue: tableData.FreelancerBio,
          viewValue: viewData?.FreelancerBio,
          explanation:
            "View is filtering out the bio or bio column isn't mapped",
          solution: "Check view's SELECT statement for FreelancerBio",
        });
      }

      if (tableData.PhotoBlobID && !viewData?.PhotoBlobID) {
        diagnosis.push({
          issue: "❌ Photo exists in TABLE but NULL in VIEW",
          tableValue: tableData.PhotoBlobID,
          viewValue: viewData?.PhotoBlobID,
          photoStatus: tableData.PhotoStatusID,
          explanation: "View might be filtering by PhotoStatusID = 2",
          solution: "Verify PhotoStatusID is 2 (Verified)",
        });
      }

      if (tableData.ShowOnWebsite === false || tableData.ShowOnWebsite === 0) {
        diagnosis.push({
          issue: "❌ ShowOnWebsite is FALSE",
          value: tableData.ShowOnWebsite,
          explanation: "View filters WHERE ShowOnWebsite = True",
          solution: "Need to set ShowOnWebsite = True in table",
        });
      }

      if (tableData.IsActive === false || tableData.IsActive === 0) {
        diagnosis.push({
          issue: "❌ IsActive is FALSE",
          value: tableData.IsActive,
          explanation: "View might filter WHERE IsActive = True",
          solution: "Need to set IsActive = True in table",
        });
      }
    }

    // If view returns data but all fields are null
    if (viewData && !viewData.FreelancerBio && !viewData.PhotoBlobID) {
      diagnosis.push({
        issue: "⚠️ View returns row but all fields are NULL",
        explanation:
          "Either data doesn't exist or view isn't selecting the columns",
        solution:
          "Check if FreelancerBio, PhotoBlobID, CVBlobID are in view's SELECT",
      });
    }

    // ============================================
    // 6. Return comprehensive report
    // ============================================
    return NextResponse.json({
      success: true,
      freelancerId,

      rawTableData: tableData
        ? {
            bio: tableData.FreelancerBio || "(empty)",
            bioLength: tableData.FreelancerBio?.length || 0,
            photoBlobId: tableData.PhotoBlobID || "(none)",
            photoStatus: tableData.PhotoStatusID,
            cvBlobId: tableData.CVBlobID || "(none)",
            cvStatus: tableData.CVStatusID,
            showOnWebsite: tableData.ShowOnWebsite,
            isActive: tableData.IsActive,
          }
        : "No SELECT permission on table",

      viewData: viewData
        ? {
            bio: viewData.FreelancerBio || "(null in view)",
            photoBlobId: viewData.PhotoBlobID || "(null in view)",
            photoStatus: viewData.PhotoStatusID,
            cvBlobId: viewData.CVBlobID || "(null in view)",
            cvStatus: viewData.CVStatusID,
          }
        : "Not in view at all!",

      viewColumns: {
        available: availableColumns,
        hasBio: availableColumns.includes("FreelancerBio"),
        hasPhoto: availableColumns.includes("PhotoBlobID"),
        hasCV: availableColumns.includes("CVBlobID"),
      },

      viewDefinition: viewDefinition || "Not available",

      diagnosis:
        diagnosis.length > 0
          ? diagnosis
          : [
              {
                issue: "✅ No obvious issues detected",
                explanation: "Data might be legitimately empty",
              },
            ],

      recommendedActions: [
        "Check if ShowOnWebsite = True",
        "Check if IsActive = True",
        "Verify PhotoStatusID = 2 (Verified)",
        "Verify CVStatusID = 2 (Verified)",
        "Ask Paul if view filters by status codes",
        "Ask Paul to show you the view's SQL definition",
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
