// app/api/test-last-update/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { executeQuery, VIEWS, TABLES } from "@/app/lib/db";

/**
 * GET /api/test-last-update
 * Comprehensive check of what was updated and current database state
 */
export async function GET() {
  // Helper function to identify missing links
  function getMissingLinks(existingLinks) {
    const required = ["Website", "Instagram", "Imdb", "LinkedIn"];
    const existing = existingLinks.map((l) => l.LinkName.toLowerCase());
    const missing = required.filter((r) => !existing.includes(r));
    return missing.join(", ");
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Not logged in" },
        { status: 401 }
      );
    }

    const freelancerId = parseInt(session.user.id);

    // Check bio in view (we have permission)
    const bioCheckView = await executeQuery(
      `SELECT FreelancerID, DisplayName, FreelancerBio, LEN(FreelancerBio) as BioLength
       FROM ${VIEWS.FREELANCERS}
       WHERE FreelancerID = @freelancerId`,
      { freelancerId }
    );

    // Check if YOUR links exist in the view (we have permission)
    const yourLinksView = await executeQuery(
      `SELECT 
        FreelancerWebsiteDataLinkID,
        FreelancerID,
        LinkName,
        LinkURL,
        LEN(LinkURL) as URLLength
       FROM ${VIEWS.FREELANCER_LINKS}
       WHERE FreelancerID = @freelancerId`,
      { freelancerId }
    );

    // Check some other user's links to see if links exist in the system at all
    const sampleLinksView = await executeQuery(
      `SELECT TOP 5
        FreelancerWebsiteDataLinkID,
        FreelancerID, 
        LinkName, 
        LinkURL
       FROM ${VIEWS.FREELANCER_LINKS}
       WHERE FreelancerID != @freelancerId`,
      { freelancerId }
    );

    return NextResponse.json({
      success: true,
      freelancerId,

      bioCheck: {
        bio: bioCheckView[0]?.FreelancerBio || "",
        bioLength: bioCheckView[0]?.BioLength || 0,
        isEmpty:
          !bioCheckView[0]?.FreelancerBio ||
          bioCheckView[0]?.FreelancerBio === "",
        displayName: bioCheckView[0]?.DisplayName,
      },

      linksCheck: {
        yourLinks: {
          count: yourLinksView.length,
          links: yourLinksView.map((l) => ({
            id: l.FreelancerWebsiteDataLinkID,
            name: l.LinkName,
            url: l.LinkURL || "(empty)",
            urlLength: l.URLLength || 0,
          })),
        },
        otherUsersLinks: {
          description:
            "Sample links from other users (to verify links work in system)",
          count: sampleLinksView.length,
          sample: sampleLinksView.map((l) => ({
            freelancerId: l.FreelancerID,
            name: l.LinkName,
            url: l.LinkURL ? "✅ Has URL" : "❌ Empty",
          })),
        },
      },

      diagnosis: {
        bioStatus:
          bioCheckView[0]?.BioLength === 0
            ? "⚠️ Bio is empty. Did you fill it in the form?"
            : `✅ Bio has ${bioCheckView[0]?.BioLength} characters`,

        linksStatus:
          yourLinksView.length === 0
            ? "❌ CRITICAL: You have NO link records in the database. Paul needs to create 4 link records for your FreelancerID (1152) in tblFreelancerWebsiteDataLinks with LinkNames: 'website', 'instagram', 'imdb', 'linked in'"
            : yourLinksView.length < 4
            ? `⚠️ You only have ${
                yourLinksView.length
              }/4 link records. Missing: ${getMissingLinks(yourLinksView)}`
            : `✅ You have all 4 link records`,

        nextSteps:
          yourLinksView.length === 0
            ? "Email Paul: Ask him to create 4 link records for FreelancerID 1152 with LinkNames: 'website', 'instagram', 'imdb', 'linked in' (all with empty LinkURL initially)"
            : "Links exist - updates should work",
      },
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
