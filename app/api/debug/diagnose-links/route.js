// app/api/debug/diagnose-links/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { executeQuery, VIEWS, TABLES, LINK_TYPES } from "../../../lib/db";

/**
 * GET /api/diagnose-links
 * Deep diagnostic to find out why links are not showing up
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const freelancerId = parseInt(session.user.id);

    console.log("=".repeat(80));
    console.log("🔬 DEEP LINKS DIAGNOSTIC");
    console.log("=".repeat(80));
    console.log(
      `Session User ID: ${session.user.id} (type: ${typeof session.user.id})`
    );
    console.log(
      `Parsed FreelancerID: ${freelancerId} (type: ${typeof freelancerId})`
    );
    console.log(`Session User:`, JSON.stringify(session.user, null, 2));

    const results = {};

    // ========================================
    // TEST 1: Query the VIEW (what we're currently doing)
    // ========================================
    console.log("\n" + "─".repeat(70));
    console.log("TEST 1: Query from VIEW (current method)");
    console.log("─".repeat(70));

    const viewQuery = `
      SELECT 
        FreelancerWebsiteDataLinkID,
        FreelancerID,
        LinkName,
        LinkURL
      FROM ${VIEWS.FREELANCER_LINKS}
      WHERE FreelancerID = @freelancerId
    `;

    console.log(`View name: ${VIEWS.FREELANCER_LINKS}`);
    console.log(`Query: ${viewQuery}`);
    console.log(`Parameter: FreelancerID = ${freelancerId}`);

    try {
      const viewResult = await executeQuery(viewQuery, { freelancerId });
      console.log(`✅ Query succeeded, returned ${viewResult.length} row(s)`);

      results.test1_view = {
        success: true,
        viewName: VIEWS.FREELANCER_LINKS,
        rowCount: viewResult.length,
        data: viewResult,
      };
    } catch (error) {
      console.log(`❌ Query failed: ${error.message}`);
      results.test1_view = {
        success: false,
        error: error.message,
      };
    }

    // ========================================
    // TEST 2: Query the TABLE directly
    // ========================================
    console.log("\n" + "─".repeat(70));
    console.log("TEST 2: Query from TABLE directly");
    console.log("─".repeat(70));

    const tableQuery = `
      SELECT 
        FreelancerWebsiteDataLinkID,
        FreelancerID,
        LinkName,
        LinkURL
      FROM ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}
      WHERE FreelancerID = @freelancerId
    `;

    console.log(`Table name: ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}`);
    console.log(`Query: ${tableQuery}`);
    console.log(`Parameter: FreelancerID = ${freelancerId}`);

    try {
      const tableResult = await executeQuery(tableQuery, { freelancerId });
      console.log(`✅ Query succeeded, returned ${tableResult.length} row(s)`);

      if (tableResult.length > 0) {
        console.log(`📋 Found links in TABLE:`);
        tableResult.forEach((link, i) => {
          console.log(
            `   ${i + 1}. ID: ${link.FreelancerWebsiteDataLinkID}, Name: "${
              link.LinkName
            }", URL: "${link.LinkURL || "(empty)"}"`
          );
        });
      }

      results.test2_table = {
        success: true,
        tableName: TABLES.FREELANCER_WEBSITE_DATA_LINKS,
        rowCount: tableResult.length,
        data: tableResult,
      };
    } catch (error) {
      console.log(`❌ Query failed: ${error.message}`);
      results.test2_table = {
        success: false,
        error: error.message,
      };
    }

    // ========================================
    // TEST 3: Check if FreelancerID exists in main table
    // ========================================
    console.log("\n" + "─".repeat(70));
    console.log("TEST 3: Check FreelancerID in main table");
    console.log("─".repeat(70));

    const freelancerCheckQuery = `
      SELECT FreelancerID, DisplayName
      FROM ${TABLES.FREELANCER_WEBSITE_DATA}
      WHERE FreelancerID = @freelancerId
    `;

    console.log(`Query: ${freelancerCheckQuery}`);

    try {
      const freelancerResult = await executeQuery(freelancerCheckQuery, {
        freelancerId,
      });
      console.log(
        `✅ Query succeeded, found ${freelancerResult.length} record(s)`
      );

      if (freelancerResult.length > 0) {
        console.log(`   FreelancerID: ${freelancerResult[0].FreelancerID}`);
        console.log(`   DisplayName: ${freelancerResult[0].DisplayName}`);
      } else {
        console.log(`❌ FreelancerID ${freelancerId} NOT FOUND in main table!`);
      }

      results.test3_freelancer = {
        success: true,
        found: freelancerResult.length > 0,
        data: freelancerResult[0] || null,
      };
    } catch (error) {
      console.log(`❌ Query failed: ${error.message}`);
      results.test3_freelancer = {
        success: false,
        error: error.message,
      };
    }

    // ========================================
    // TEST 4: Check for ANY links for this FreelancerID (no WHERE)
    // ========================================
    console.log("\n" + "─".repeat(70));
    console.log("TEST 4: Check if ANY links exist for this FreelancerID");
    console.log("─".repeat(70));

    const anyLinksQuery = `
      SELECT COUNT(*) as LinkCount
      FROM ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}
      WHERE FreelancerID = @freelancerId
    `;

    console.log(`Query: ${anyLinksQuery}`);

    try {
      const countResult = await executeQuery(anyLinksQuery, { freelancerId });
      const count = countResult[0].LinkCount;
      console.log(`✅ Found ${count} link record(s)`);

      results.test4_count = {
        success: true,
        count,
      };
    } catch (error) {
      console.log(`❌ Query failed: ${error.message}`);
      results.test4_count = {
        success: false,
        error: error.message,
      };
    }

    // ========================================
    // TEST 5: Get sample links from table (any FreelancerID)
    // ========================================
    console.log("\n" + "─".repeat(70));
    console.log("TEST 5: Sample of ALL links in table (to verify structure)");
    console.log("─".repeat(70));

    const sampleQuery = `
      SELECT TOP 10
        FreelancerWebsiteDataLinkID,
        FreelancerID,
        LinkName,
        LinkURL
      FROM ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}
      ORDER BY FreelancerID
    `;

    console.log(`Query: ${sampleQuery}`);

    try {
      const sampleResult = await executeQuery(sampleQuery, {});
      console.log(`✅ Found ${sampleResult.length} sample record(s)`);

      if (sampleResult.length > 0) {
        console.log(`📋 Sample data structure:`);
        const sample = sampleResult[0];
        console.log(`   Columns: ${Object.keys(sample).join(", ")}`);
        console.log(
          `   First record FreelancerID: ${
            sample.FreelancerID
          } (type: ${typeof sample.FreelancerID})`
        );
        console.log(
          `   Our FreelancerID: ${freelancerId} (type: ${typeof freelancerId})`
        );
        console.log(
          `   Types match: ${
            typeof sample.FreelancerID === typeof freelancerId
          }`
        );
      }

      results.test5_sample = {
        success: true,
        rowCount: sampleResult.length,
        data: sampleResult,
        columnNames:
          sampleResult.length > 0 ? Object.keys(sampleResult[0]) : [],
      };
    } catch (error) {
      console.log(`❌ Query failed: ${error.message}`);
      results.test5_sample = {
        success: false,
        error: error.message,
      };
    }

    // ========================================
    // TEST 6: Try querying without parameter binding
    // ========================================
    console.log("\n" + "─".repeat(70));
    console.log("TEST 6: Direct SQL query (no parameter binding)");
    console.log("─".repeat(70));

    const directQuery = `
      SELECT 
        FreelancerWebsiteDataLinkID,
        FreelancerID,
        LinkName,
        LinkURL
      FROM ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}
      WHERE FreelancerID = ${freelancerId}
    `;

    console.log(`Query: ${directQuery}`);
    console.log(
      `⚠️ Warning: This is for testing only - using direct SQL interpolation`
    );

    try {
      const directResult = await executeQuery(directQuery, {});
      console.log(`✅ Query succeeded, returned ${directResult.length} row(s)`);

      results.test6_direct = {
        success: true,
        rowCount: directResult.length,
        data: directResult,
      };
    } catch (error) {
      console.log(`❌ Query failed: ${error.message}`);
      results.test6_direct = {
        success: false,
        error: error.message,
      };
    }

    // ========================================
    // TEST 7: Check VIEW definition/columns
    // ========================================
    console.log("\n" + "─".repeat(70));
    console.log("TEST 7: Check VIEW columns and sample data");
    console.log("─".repeat(70));

    const viewSampleQuery = `
      SELECT TOP 5 *
      FROM ${VIEWS.FREELANCER_LINKS}
    `;

    console.log(`Query: ${viewSampleQuery}`);

    try {
      const viewSampleResult = await executeQuery(viewSampleQuery, {});
      console.log(
        `✅ Query succeeded, returned ${viewSampleResult.length} row(s)`
      );

      if (viewSampleResult.length > 0) {
        console.log(
          `📋 VIEW columns: ${Object.keys(viewSampleResult[0]).join(", ")}`
        );
        console.log(
          `📋 Sample FreelancerIDs in VIEW: ${[
            ...new Set(viewSampleResult.map((r) => r.FreelancerID)),
          ].join(", ")}`
        );
      }

      results.test7_viewStructure = {
        success: true,
        rowCount: viewSampleResult.length,
        columns:
          viewSampleResult.length > 0 ? Object.keys(viewSampleResult[0]) : [],
        sampleFreelancerIds: [
          ...new Set(viewSampleResult.map((r) => r.FreelancerID)),
        ],
        sampleData: viewSampleResult,
      };
    } catch (error) {
      console.log(`❌ Query failed: ${error.message}`);
      results.test7_viewStructure = {
        success: false,
        error: error.message,
      };
    }

    // ========================================
    // ANALYSIS
    // ========================================
    console.log("\n" + "=".repeat(80));
    console.log("📊 ANALYSIS");
    console.log("=".repeat(80));

    const analysis = {
      viewReturnsData: results.test1_view?.rowCount > 0,
      tableReturnsData: results.test2_table?.rowCount > 0,
      freelancerExists: results.test3_freelancer?.found,
      linkCountInTable: results.test4_count?.count,
      possibleIssues: [],
    };

    if (!analysis.freelancerExists) {
      analysis.possibleIssues.push({
        severity: "CRITICAL",
        issue: "FreelancerID not found in main table",
        solution:
          "Check if FreelancerID is correct or if account needs to be set up",
      });
    }

    if (analysis.linkCountInTable === 0) {
      analysis.possibleIssues.push({
        severity: "CRITICAL",
        issue: "No link records exist in table for this FreelancerID",
        solution:
          "Links need to be created in the database first (contact DB admin)",
      });
    }

    if (analysis.tableReturnsData && !analysis.viewReturnsData) {
      analysis.possibleIssues.push({
        severity: "HIGH",
        issue: "Links exist in TABLE but not in VIEW",
        solution:
          "VIEW may be filtering based on status or other criteria. Check VIEW definition.",
      });
    }

    if (results.test6_direct?.rowCount !== results.test2_table?.rowCount) {
      analysis.possibleIssues.push({
        severity: "MEDIUM",
        issue: "Parameter binding may be causing issues",
        solution: "Check if FreelancerID data type matches in query",
      });
    }

    console.log(`\n🔍 Key Findings:`);
    console.log(`   VIEW returns data: ${analysis.viewReturnsData}`);
    console.log(`   TABLE returns data: ${analysis.tableReturnsData}`);
    console.log(`   Freelancer exists: ${analysis.freelancerExists}`);
    console.log(`   Link count: ${analysis.linkCountInTable}`);
    console.log(`   Issues found: ${analysis.possibleIssues.length}`);

    if (analysis.possibleIssues.length > 0) {
      console.log(`\n⚠️ Possible Issues:`);
      analysis.possibleIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. [${issue.severity}] ${issue.issue}`);
        console.log(`      → ${issue.solution}`);
      });
    }

    console.log("=".repeat(80));

    return NextResponse.json({
      success: true,
      freelancerId,
      sessionUserId: session.user.id,
      results,
      analysis,
      configuration: {
        VIEW_FREELANCER_LINKS: VIEWS.FREELANCER_LINKS,
        TABLE_FREELANCER_WEBSITE_DATA_LINKS:
          TABLES.FREELANCER_WEBSITE_DATA_LINKS,
        TABLE_FREELANCER_WEBSITE_DATA: TABLES.FREELANCER_WEBSITE_DATA,
        LINK_TYPES,
      },
    });
  } catch (error) {
    console.error("❌ Diagnose links error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
