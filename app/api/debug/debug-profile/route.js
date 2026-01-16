// app/api/debug/debug-profile/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  executeQuery,
  VIEWS,
  TABLES,
  LINK_TYPES,
  STATUS_CODES,
  // DOCUMENT_TYPES,
} from "../../../lib/db";

/**
 * GET /api/debug-profile
 * Comprehensive debug endpoint showing all freelancer data
 * Helps diagnose issues with profile updates, especially links
 */
export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const freelancerId = parseInt(session.user.id);

    console.log(
      `🔍 DEBUG: Fetching all data for FreelancerID: ${freelancerId}`
    );

    // ==================================================
    // 1. VIEW DATA (What shows on website - verified only)
    // ==================================================
    const viewQuery = `
      SELECT 
        FreelancerID,
        Slug,
        DisplayName,
        FreelancerBio,
        PhotoBlobID,
        PhotoStatusID,
        CVBlobID,
        CVStatusID
      FROM ${VIEWS.FREELANCERS}
      WHERE FreelancerID = @freelancerId
    `;

    const viewData = await executeQuery(viewQuery, { freelancerId });

    // ==================================================
    // 2. TABLE DATA (Raw database - includes unverified)
    // ==================================================
    const tableQuery = `
      SELECT 
        FreelancerID,
        DisplayName,
        FreelancerBio,
        PhotoBlobID,
        PhotoStatusID,
        CVBlobID,
        CVStatusID
      FROM ${TABLES.FREELANCER_WEBSITE_DATA}
      WHERE FreelancerID = @freelancerId
    `;

    let tableData;
    try {
      tableData = await executeQuery(tableQuery, { freelancerId });
    } catch (error) {
      tableData = null;
      console.log("ℹ️ No SELECT permission on table (using view only)");
    }

    // ==================================================
    // 3. LINKS DATA (All 4 link types)
    // ==================================================
    const linksQuery = `
      SELECT 
        FreelancerWebsiteDataLinkID,
        FreelancerID,
        LinkName,
        LinkURL
      FROM ${VIEWS.FREELANCER_LINKS}
      WHERE FreelancerID = @freelancerId
      ORDER BY LinkName
    `;

    const links = await executeQuery(linksQuery, { freelancerId });

    // Also try to get from table directly
    const linksTableQuery = `
      SELECT 
        FreelancerWebsiteDataLinkID,
        FreelancerID,
        LinkName,
        LinkURL
      FROM ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}
      WHERE FreelancerID = @freelancerId
      ORDER BY LinkName
    `;

    let linksTableData;
    try {
      linksTableData = await executeQuery(linksTableQuery, { freelancerId });
    } catch (error) {
      linksTableData = null;
      console.log("ℹ️ No SELECT permission on links table");
    }

    // ==================================================
    // 4. SKILLS DATA (if available)
    // ==================================================
    const skillsQuery = `
      SELECT 
        FreelancerID,
        DepartmentID,
        DepartmentName,
        SkillID,
        SkillName
      FROM ${VIEWS.FREELANCER_SKILLS}
      WHERE FreelancerID = @freelancerId
    `;

    let skills;
    try {
      skills = await executeQuery(skillsQuery, { freelancerId });
    } catch (error) {
      skills = [];
      console.log("ℹ️ No skills data available");
    }

    // ==================================================
    // 5. STORED DOCUMENTS (Photos, CVs, Equipment Lists)
    // ==================================================
    const documentsQuery = `
      SELECT 
        StoredDocumentID,
        FreelancerID,
        DocumentTypeID,
        BlobID,
        FileName,
        StatusID
      FROM ${VIEWS.STORED_DOCUMENTS}
      WHERE FreelancerID = @freelancerId
    `;

    let documents;
    try {
      documents = await executeQuery(documentsQuery, { freelancerId });
    } catch (error) {
      documents = [];
      console.log("ℹ️ No documents data available");
    }

    // ==================================================
    // 6. CREATE HELPFUL MAPPINGS AND COMPARISONS
    // ==================================================

    // Status code meanings
    const statusMeanings = {
      0: "None",
      1: "To Be Verified (pending admin approval)",
      2: "Verified (visible on website)",
      3: "Rejected (admin rejected changes)",
    };

    // Document type meanings
    const documentTypeMeanings = {
      1: "Photo",
      2: "CV",
      3: "Equipment List",
    };

    // Create a structured links object
    const linksStructured = {
      fromView: {},
      fromTable: {},
      expected: {},
    };

    // Process links from VIEW
    links.forEach((link) => {
      const linkType = link.LinkName.toLowerCase();
      linksStructured.fromView[linkType] = {
        id: link.FreelancerWebsiteDataLinkID,
        name: link.LinkName,
        url: link.LinkURL || "(empty)",
      };
    });

    // Process links from TABLE if available
    if (linksTableData) {
      linksTableData.forEach((link) => {
        const linkType = link.LinkName.toLowerCase();
        linksStructured.fromTable[linkType] = {
          id: link.FreelancerWebsiteDataLinkID,
          name: link.LinkName,
          url: link.LinkURL || "(empty)",
        };
      });
    }

    // Expected link types based on LINK_TYPES constant
    Object.entries(LINK_TYPES).forEach(([key, value]) => {
      linksStructured.expected[value.toLowerCase()] = {
        constantKey: key,
        constantValue: value,
        caseSensitiveKey: value, // This is what the backend expects
        frontendKey: value.toLowerCase(), // This is what frontend might send
      };
    });

    // ==================================================
    // 7. IDENTIFY POTENTIAL ISSUES
    // ==================================================
    const issues = [];

    // Check for case sensitivity mismatches
    const viewLinkNames = links.map((l) => l.LinkName);
    const expectedLinkNames = Object.values(LINK_TYPES);

    expectedLinkNames.forEach((expectedName) => {
      if (!viewLinkNames.includes(expectedName)) {
        issues.push({
          type: "MISSING_LINK_RECORD",
          severity: "HIGH",
          message: `Expected link "${expectedName}" not found in database`,
          impact: "Updates to this link will fail",
        });
      }
    });

    // Check for case sensitivity in link matching
    const caseMismatchCheck = links.some((link) => {
      const lowerName = link.LinkName.toLowerCase();
      const upperName = link.LinkName;
      return lowerName !== upperName;
    });

    if (caseMismatchCheck) {
      issues.push({
        type: "CASE_SENSITIVITY_WARNING",
        severity: "MEDIUM",
        message: "Link names use mixed case - frontend must match exactly",
        impact:
          "Frontend sending lowercase keys will not match database LinkName",
        solution:
          "Frontend should send: {Website: url, Instagram: url, Imdb: url, LinkedIn: url}",
        currentlyReceiving:
          "Frontend is sending: {website: url, instagram: url, imdb: url, linkedin: url}",
      });
    }

    // Check for unverified changes
    if (
      tableData &&
      tableData[0] &&
      (tableData[0].PhotoStatusID === STATUS_CODES.TO_BE_VERIFIED ||
        tableData[0].CVStatusID === STATUS_CODES.TO_BE_VERIFIED)
    ) {
      issues.push({
        type: "PENDING_VERIFICATION",
        severity: "INFO",
        message: "You have changes pending admin verification",
        details: {
          photo:
            tableData[0].PhotoStatusID === STATUS_CODES.TO_BE_VERIFIED
              ? "Pending"
              : "OK",
          cv:
            tableData[0].CVStatusID === STATUS_CODES.TO_BE_VERIFIED
              ? "Pending"
              : "OK",
        },
      });
    }

    // ==================================================
    // 8. BUILD RESPONSE
    // ==================================================
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      freelancerId,
      session: {
        userId: session.user.id,
        name: session.user.name,
        email: session.user.email,
        slug: session.user.slug,
      },

      // Main profile data
      profile: {
        view: {
          description: "Data from VIEW - what shows on website (verified only)",
          data: viewData[0] || null,
          photoStatus: viewData[0]?.PhotoStatusID
            ? {
                code: viewData[0].PhotoStatusID,
                meaning: statusMeanings[viewData[0].PhotoStatusID],
              }
            : null,
          cvStatus: viewData[0]?.CVStatusID
            ? {
                code: viewData[0].CVStatusID,
                meaning: statusMeanings[viewData[0].CVStatusID],
              }
            : null,
        },
        table: tableData
          ? {
              description:
                "Data from TABLE - raw database (includes unverified)",
              data: tableData[0] || null,
              photoStatus: tableData[0]?.PhotoStatusID
                ? {
                    code: tableData[0].PhotoStatusID,
                    meaning: statusMeanings[tableData[0].PhotoStatusID],
                  }
                : null,
              cvStatus: tableData[0]?.CVStatusID
                ? {
                    code: tableData[0].CVStatusID,
                    meaning: statusMeanings[tableData[0].CVStatusID],
                  }
                : null,
            }
          : {
              description: "No SELECT permission on table",
              data: null,
            },
      },

      // Links data with detailed analysis
      links: {
        count: links.length,
        structured: linksStructured,
        raw: {
          fromView: links,
          fromTable: linksTableData || "No access to table",
        },
        analysis: {
          expectedLinkTypes: Object.values(LINK_TYPES),
          foundLinkTypes: viewLinkNames,
          missingLinks: expectedLinkNames.filter(
            (name) => !viewLinkNames.includes(name)
          ),
        },
      },

      // Skills
      skills: {
        count: skills.length,
        data: skills,
      },

      // Documents
      documents: {
        count: documents.length,
        data: documents.map((doc) => ({
          ...doc,
          documentType: documentTypeMeanings[doc.DocumentTypeID],
          status: statusMeanings[doc.StatusID],
        })),
      },

      // Configuration reference
      configuration: {
        statusCodes: STATUS_CODES,
        statusMeanings,
        linkTypes: LINK_TYPES,
        // documentTypes: DOCUMENT_TYPES,
        documentTypeMeanings,
        views: VIEWS,
        tables: TABLES,
      },

      // Issues and warnings
      issues: issues.length > 0 ? issues : "No issues detected",

      // Debugging tips
      debugInfo: {
        tip1: "Check 'issues' array for problems",
        tip2: "Compare 'links.structured.expected' with 'links.structured.fromView'",
        tip3: "If frontend sends lowercase keys, they won't match LinkName in database",
        tip4: "Use POST /api/debug-profile to test what data the update endpoint receives",
      },
    });
  } catch (error) {
    console.error("❌ Debug endpoint error:", error);
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
 * POST /api/debug-profile
 * Test endpoint to see what data the update endpoint would receive
 * Send the same payload you'd send to /api/profile/update
 */
export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const freelancerId = parseInt(session.user.id);
    const data = await request.json();

    console.log(
      `🔍 DEBUG POST: Received data for FreelancerID: ${freelancerId}`
    );
    console.log("Data:", JSON.stringify(data, null, 2));

    // ==================================================
    // Analyze the incoming data
    // ==================================================
    const analysis = {
      receivedData: data,
      dataStructure: {
        hasDisplayName: data.displayName !== undefined,
        hasBio: data.bio !== undefined,
        hasPhotoBlobId: data.photoBlobId !== undefined,
        hasCvBlobId: data.cvBlobId !== undefined,
        hasLinks: data.links !== undefined,
        linksIsObject: typeof data.links === "object",
      },
    };

    // Analyze links if present
    if (data.links) {
      const linkKeys = Object.keys(data.links);
      const linkValues = Object.entries(data.links);

      analysis.linksAnalysis = {
        keysReceived: linkKeys,
        keysExpectedByBackend: Object.values(LINK_TYPES),
        caseMismatch: linkKeys.map((key) => {
          const expectedKey = Object.values(LINK_TYPES).find(
            (type) => type.toLowerCase() === key.toLowerCase()
          );
          return {
            received: key,
            expected: expectedKey,
            matches: key === expectedKey,
            willWork: key === expectedKey,
          };
        }),
        linkValues: linkValues.map(([key, value]) => ({
          key,
          value: value || "(empty)",
          isEmpty: !value || value.trim() === "",
        })),
      };

      // Simulate what the update logic will do
      const simulatedUpdates = [];
      const linkTypes = [
        { key: "Website", name: LINK_TYPES.WEBSITE },
        { key: "Instagram", name: LINK_TYPES.INSTAGRAM },
        { key: "Imdb", name: LINK_TYPES.IMDB },
        { key: "LinkedIn", name: LINK_TYPES.LINKEDIN },
      ];

      for (const linkType of linkTypes) {
        const newUrl = data.links[linkType.key] || "";
        simulatedUpdates.push({
          linkType: linkType.name,
          lookingForKey: linkType.key,
          foundValue: data.links[linkType.key],
          willSet: newUrl,
          warning:
            data.links[linkType.key] === undefined
              ? "❌ KEY NOT FOUND - will set empty string!"
              : newUrl === ""
              ? "⚠️ Will clear this link"
              : "✅ Will update",
        });
      }

      analysis.simulatedUpdates = simulatedUpdates;
    }

    // ==================================================
    // Get current database state for comparison
    // ==================================================
    const currentLinksQuery = `
      SELECT FreelancerWebsiteDataLinkID, LinkName, LinkURL
      FROM ${VIEWS.FREELANCER_LINKS}
      WHERE FreelancerID = @freelancerId
    `;

    const currentLinks = await executeQuery(currentLinksQuery, {
      freelancerId,
    });

    const comparison = currentLinks.map((currentLink) => {
      const linkType = Object.values(LINK_TYPES).find(
        (type) => type.toLowerCase() === currentLink.LinkName.toLowerCase()
      );

      let newValue = undefined;
      if (data.links && linkType) {
        // This simulates what the backend code does
        newValue = data.links[linkType] || "";
      }

      return {
        id: currentLink.FreelancerWebsiteDataLinkID,
        linkName: currentLink.LinkName,
        currentValue: currentLink.LinkURL || "(empty)",
        newValue: newValue !== undefined ? newValue || "(empty)" : "NOT SENT",
        willChange:
          newValue !== undefined && newValue !== (currentLink.LinkURL || ""),
        changeType:
          newValue !== undefined
            ? newValue === "" && currentLink.LinkURL
              ? "CLEAR"
              : newValue && !currentLink.LinkURL
              ? "ADD"
              : newValue !== currentLink.LinkURL
              ? "UPDATE"
              : "NO CHANGE"
            : "NO DATA SENT",
      };
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      freelancerId,
      analysis,
      comparison: {
        description:
          "What would happen if this data was sent to /api/profile/update",
        data: comparison,
      },
      recommendation: {
        issue:
          "Frontend sends lowercase link keys (website, instagram, imdb, linkedin)",
        expected:
          "Backend expects capitalized keys (Website, Instagram, Imdb, LinkedIn)",
        solution:
          "Change frontend to send: { links: { Website: url, Instagram: url, Imdb: url, LinkedIn: url } }",
        alternativeSolution:
          "Change backend linkTypes array to use lowercase keys: { key: 'website', name: LINK_TYPES.WEBSITE }",
      },
    });
  } catch (error) {
    console.error("❌ Debug POST endpoint error:", error);
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
