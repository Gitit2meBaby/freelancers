// app/api/tests/test-links/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import {
  executeQuery,
  executeUpdate,
  VIEWS,
  TABLES,
  LINK_TYPES,
} from "@/app/lib/db";

/**
 * GET /api/test-links
 * Test endpoint to check links database structure and current values
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
    console.log("🔗 LINKS TEST ENDPOINT - GET");
    console.log("=".repeat(80));
    console.log(`FreelancerID: ${freelancerId}`);

    // Query 1: Get links from VIEW
    const viewQuery = `
      SELECT 
        FreelancerWebsiteDataLinkID,
        FreelancerID,
        LinkName,
        LinkURL
      FROM ${VIEWS.FREELANCER_LINKS}
      WHERE FreelancerID = @freelancerId
      ORDER BY LinkName
    `;

    console.log(`\n📊 Query 1: Fetching from VIEW - ${VIEWS.FREELANCER_LINKS}`);
    const viewLinks = await executeQuery(viewQuery, { freelancerId });
    console.log(`✅ Retrieved ${viewLinks.length} link(s) from VIEW`);

    // Query 2: Try to get links from TABLE directly
    const tableQuery = `
      SELECT 
        FreelancerWebsiteDataLinkID,
        FreelancerID,
        LinkName,
        LinkURL
      FROM ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}
      WHERE FreelancerID = @freelancerId
      ORDER BY LinkName
    `;

    let tableLinks = null;
    let tableError = null;

    console.log(
      `\n📊 Query 2: Fetching from TABLE - ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}`
    );
    try {
      tableLinks = await executeQuery(tableQuery, { freelancerId });
      console.log(`✅ Retrieved ${tableLinks.length} link(s) from TABLE`);
    } catch (error) {
      tableError = error.message;
      console.log(`❌ Cannot query TABLE: ${error.message}`);
    }

    // Query 3: Get ALL links in the table (not just for this freelancer)
    const allLinksQuery = `
      SELECT TOP 20
        FreelancerWebsiteDataLinkID,
        FreelancerID,
        LinkName,
        LinkURL
      FROM ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}
      ORDER BY FreelancerID, LinkName
    `;

    let allLinks = null;
    console.log(
      `\n📊 Query 3: Fetching sample of ALL links from TABLE (first 20)`
    );
    try {
      allLinks = await executeQuery(allLinksQuery, {});
      console.log(`✅ Retrieved ${allLinks.length} sample link(s)`);
    } catch (error) {
      console.log(`❌ Cannot query all links: ${error.message}`);
    }

    // Analysis
    const analysis = {
      expectedLinkTypes: Object.values(LINK_TYPES),
      foundInView: viewLinks.map((l) => l.LinkName),
      foundInTable: tableLinks ? tableLinks.map((l) => l.LinkName) : null,
      missingLinks: [],
      extraLinks: [],
      linkNameCaseCheck: {},
    };

    // Check for missing or extra links
    const expectedSet = new Set(Object.values(LINK_TYPES));
    const foundSet = new Set(viewLinks.map((l) => l.LinkName));

    expectedSet.forEach((expected) => {
      if (!foundSet.has(expected)) {
        analysis.missingLinks.push(expected);
      }
    });

    foundSet.forEach((found) => {
      if (!expectedSet.has(found)) {
        analysis.extraLinks.push(found);
      }
    });

    // Check case sensitivity
    viewLinks.forEach((link) => {
      const lowerName = link.LinkName.toLowerCase();
      const matchesExpected = Object.values(LINK_TYPES).find(
        (type) => type === link.LinkName
      );
      const matchesExpectedCaseInsensitive = Object.values(LINK_TYPES).find(
        (type) => type.toLowerCase() === lowerName
      );

      analysis.linkNameCaseCheck[link.LinkName] = {
        exactMatch: !!matchesExpected,
        caseInsensitiveMatch: !!matchesExpectedCaseInsensitive,
        expectedValue: matchesExpectedCaseInsensitive || "NOT FOUND",
      };
    });

    // Create a test payload example
    const testPayloadExample = {};
    viewLinks.forEach((link) => {
      const matchingType = Object.entries(LINK_TYPES).find(
        ([key, value]) => value === link.LinkName
      );
      if (matchingType) {
        testPayloadExample[
          matchingType[1]
        ] = `https://example.com/${matchingType[0].toLowerCase()}`;
      }
    });

    return NextResponse.json({
      success: true,
      freelancerId,

      // Raw data
      linksFromView: viewLinks,
      linksFromTable: tableLinks || `Cannot access table: ${tableError}`,
      sampleLinksFromTable: allLinks,

      // Analysis
      analysis,

      // Configuration
      configuration: {
        LINK_TYPES_constant: LINK_TYPES,
        VIEW_name: VIEWS.FREELANCER_LINKS,
        TABLE_name: TABLES.FREELANCER_WEBSITE_DATA_LINKS,
      },

      // Test instructions
      testInstructions: {
        description:
          "To test link updates, send a POST request to this endpoint",
        method: "POST",
        url: "/api/test-links",
        examplePayload: {
          links: testPayloadExample,
        },
        note: "The keys in 'links' object MUST match LinkName exactly (case-sensitive)",
      },

      // Issues
      issues: [
        ...(analysis.missingLinks.length > 0
          ? [
              {
                type: "MISSING_LINKS",
                severity: "HIGH",
                message: `Missing link records in database: ${analysis.missingLinks.join(
                  ", "
                )}`,
                solution:
                  "These link records need to be inserted into the database first",
              },
            ]
          : []),
        ...(analysis.extraLinks.length > 0
          ? [
              {
                type: "EXTRA_LINKS",
                severity: "LOW",
                message: `Extra link records in database: ${analysis.extraLinks.join(
                  ", "
                )}`,
                note: "These links exist in DB but are not in LINK_TYPES constant",
              },
            ]
          : []),
        ...(Object.values(analysis.linkNameCaseCheck).some(
          (check) => !check.exactMatch && check.caseInsensitiveMatch
        )
          ? [
              {
                type: "CASE_MISMATCH",
                severity: "HIGH",
                message:
                  "LinkName in database doesn't match LINK_TYPES constant (case difference)",
                affectedLinks: Object.entries(analysis.linkNameCaseCheck)
                  .filter(
                    ([name, check]) =>
                      !check.exactMatch && check.caseInsensitiveMatch
                  )
                  .map(([name, check]) => ({
                    database: name,
                    expected: check.expectedValue,
                  })),
              },
            ]
          : []),
      ],
    });
  } catch (error) {
    console.error("❌ Test links GET error:", error);
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

/**
 * POST /api/test-links
 * Test a link update without actually committing it (dry run)
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const freelancerId = parseInt(session.user.id);
    const data = await request.json();

    console.log("=".repeat(80));
    console.log("🔗 LINKS TEST ENDPOINT - POST (DRY RUN)");
    console.log("=".repeat(80));
    console.log(`FreelancerID: ${freelancerId}`);
    console.log(`Received data:`, JSON.stringify(data, null, 2));

    if (!data.links) {
      return NextResponse.json(
        {
          success: false,
          error: "No 'links' object provided in request body",
        },
        { status: 400 }
      );
    }

    // Get current links
    const currentLinksQuery = `
      SELECT FreelancerWebsiteDataLinkID, LinkName, LinkURL
      FROM ${VIEWS.FREELANCER_LINKS}
      WHERE FreelancerID = @freelancerId
    `;

    const currentLinks = await executeQuery(currentLinksQuery, {
      freelancerId,
    });
    console.log(`\nCurrent links in database: ${currentLinks.length}`);

    // Simulate what the update logic does
    const linkTypes = [
      { key: "Website", name: LINK_TYPES.WEBSITE },
      { key: "Instagram", name: LINK_TYPES.INSTAGRAM },
      { key: "Imdb", name: LINK_TYPES.IMDB },
      { key: "LinkedIn", name: LINK_TYPES.LINKEDIN },
    ];

    const simulationResults = [];

    for (const linkType of linkTypes) {
      console.log(`\n${"─".repeat(60)}`);
      console.log(`Simulating: ${linkType.name}`);

      const newUrl = data.links[linkType.key] || "";
      console.log(`1. Looking for key: "${linkType.key}"`);
      console.log(
        `2. Found in data: ${
          data.links[linkType.key] !== undefined ? "YES" : "NO"
        }`
      );
      console.log(`3. Value: "${data.links[linkType.key] || "(undefined)"}"`);
      console.log(`4. Will use: "${newUrl}"`);

      const existingLink = currentLinks.find(
        (l) => l.LinkName.toLowerCase() === linkType.name.toLowerCase()
      );

      const result = {
        linkType: linkType.name,
        searchKey: linkType.key,
        foundInData: data.links[linkType.key] !== undefined,
        dataValue: data.links[linkType.key],
        willSetTo: newUrl,
        existsInDatabase: !!existingLink,
      };

      if (existingLink) {
        result.databaseRecord = {
          id: existingLink.FreelancerWebsiteDataLinkID,
          name: existingLink.LinkName,
          currentUrl: existingLink.LinkURL || "(empty)",
        };
        result.currentUrl = existingLink.LinkURL || "";
        result.wouldChange = newUrl !== (existingLink.LinkURL || "");
        result.changeType =
          newUrl === "" && existingLink.LinkURL
            ? "CLEAR"
            : newUrl && !existingLink.LinkURL
            ? "ADD"
            : newUrl !== existingLink.LinkURL
            ? "UPDATE"
            : "NO_CHANGE";

        console.log(
          `5. Found in DB: YES (ID: ${existingLink.FreelancerWebsiteDataLinkID})`
        );
        console.log(`6. Current URL: "${existingLink.LinkURL || "(empty)"}"`);
        console.log(`7. Would change: ${result.wouldChange ? "YES" : "NO"}`);
        console.log(`8. Change type: ${result.changeType}`);

        if (result.wouldChange) {
          result.sqlQuery = `UPDATE ${TABLES.FREELANCER_WEBSITE_DATA_LINKS} SET LinkURL = '${newUrl}' WHERE FreelancerWebsiteDataLinkID = ${existingLink.FreelancerWebsiteDataLinkID}`;
          console.log(`9. Would execute: ${result.sqlQuery}`);
        }
      } else {
        result.error = "No matching record in database";
        console.log(`5. Found in DB: NO - CANNOT UPDATE!`);
        console.log(
          `❌ This link cannot be updated because it doesn't exist in the database`
        );
      }

      simulationResults.push(result);
    }

    // Summary
    const summary = {
      totalLinksInData: Object.keys(data.links).length,
      totalLinksInDatabase: currentLinks.length,
      wouldUpdate: simulationResults.filter((r) => r.wouldChange).length,
      wouldNotChange: simulationResults.filter(
        (r) => !r.wouldChange && r.existsInDatabase
      ).length,
      cannotUpdate: simulationResults.filter((r) => !r.existsInDatabase).length,
    };

    return NextResponse.json({
      success: true,
      mode: "DRY_RUN",
      message: "This is a simulation - no actual database changes were made",
      freelancerId,
      receivedData: data,
      currentLinksInDatabase: currentLinks,
      simulationResults,
      summary,
      recommendations: [
        ...(summary.cannotUpdate > 0
          ? [
              `⚠️ ${summary.cannotUpdate} link(s) cannot be updated because they don't exist in the database`,
            ]
          : []),
        ...(simulationResults.some((r) => !r.foundInData && r.existsInDatabase)
          ? [
              "⚠️ Some links exist in database but were not provided in the update data",
            ]
          : []),
        ...(summary.wouldUpdate > 0
          ? [
              `✅ ${summary.wouldUpdate} link(s) would be updated if this was a real request`,
            ]
          : []),
      ],
      nextSteps:
        summary.cannotUpdate > 0
          ? "Fix database: Insert missing link records before attempting updates"
          : summary.wouldUpdate > 0
          ? "This payload looks good! Use POST /api/profile/update to apply these changes"
          : "No changes would be made with this payload",
    });
  } catch (error) {
    console.error("❌ Test links POST error:", error);
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

/**
 * PUT /api/test-links
 * Actually perform a link update (same as profile/update but links only)
 */
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const freelancerId = parseInt(session.user.id);
    const data = await request.json();

    console.log("=".repeat(80));
    console.log("🔗 LINKS TEST ENDPOINT - PUT (ACTUAL UPDATE)");
    console.log("=".repeat(80));
    console.log(`FreelancerID: ${freelancerId}`);
    console.log(`Received data:`, JSON.stringify(data, null, 2));

    if (!data.links) {
      return NextResponse.json(
        {
          success: false,
          error: "No 'links' object provided in request body",
        },
        { status: 400 }
      );
    }

    // Get current links
    const currentLinksQuery = `
      SELECT FreelancerWebsiteDataLinkID, LinkName, LinkURL
      FROM ${VIEWS.FREELANCER_LINKS}
      WHERE FreelancerID = @freelancerId
    `;

    const currentLinks = await executeQuery(currentLinksQuery, {
      freelancerId,
    });

    const linkTypes = [
      { key: "Website", name: LINK_TYPES.WEBSITE },
      { key: "Instagram", name: LINK_TYPES.INSTAGRAM },
      { key: "Imdb", name: LINK_TYPES.IMDB },
      { key: "LinkedIn", name: LINK_TYPES.LINKEDIN },
    ];

    const updateResults = [];
    let linksChanged = 0;

    for (const linkType of linkTypes) {
      const newUrl = data.links[linkType.key] || "";

      const existingLink = currentLinks.find(
        (l) => l.LinkName.toLowerCase() === linkType.name.toLowerCase()
      );

      if (existingLink) {
        const currentUrl = existingLink.LinkURL || "";

        if (newUrl !== currentUrl) {
          console.log(
            `\nUpdating ${linkType.name}: "${currentUrl}" → "${newUrl}"`
          );

          try {
            const rowsAffected = await executeUpdate(
              TABLES.FREELANCER_WEBSITE_DATA_LINKS,
              { LinkURL: newUrl },
              {
                FreelancerWebsiteDataLinkID:
                  existingLink.FreelancerWebsiteDataLinkID,
              }
            );

            updateResults.push({
              linkType: linkType.name,
              linkId: existingLink.FreelancerWebsiteDataLinkID,
              oldValue: currentUrl,
              newValue: newUrl,
              success: true,
              rowsAffected,
            });

            linksChanged++;
          } catch (error) {
            updateResults.push({
              linkType: linkType.name,
              linkId: existingLink.FreelancerWebsiteDataLinkID,
              success: false,
              error: error.message,
            });
          }
        } else {
          updateResults.push({
            linkType: linkType.name,
            linkId: existingLink.FreelancerWebsiteDataLinkID,
            skipped: true,
            reason: "URL unchanged",
          });
        }
      } else {
        updateResults.push({
          linkType: linkType.name,
          skipped: true,
          reason: "Link record not found in database",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message:
        linksChanged > 0
          ? `Successfully updated ${linksChanged} link(s)`
          : "No links were updated",
      freelancerId,
      linksChanged,
      updateResults,
    });
  } catch (error) {
    console.error("❌ Test links PUT error:", error);
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
