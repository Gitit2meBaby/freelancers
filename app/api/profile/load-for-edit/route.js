// app/api/profile/load-for-edit/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { executeQuery, VIEWS, TABLES } from "@/app/lib/db";

/**
 * GET /api/profile/load-for-edit
 * Load profile data for editing - includes ALL link values (even empty ones)
 * This is different from the public profile API which only shows verified/non-empty data
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

    console.log(
      `📝 Loading profile for editing - FreelancerID: ${freelancerId}`
    );

    // Get main profile data (use VIEW for verified/displayed data)
    const profileQuery = `
      SELECT 
        FreelancerID,
        Slug,
        DisplayName,
        FreelancerBio,
        PhotoBlobID,
        CVBlobID
      FROM ${VIEWS.FREELANCERS}
      WHERE FreelancerID = @freelancerId
    `;

    const profileData = await executeQuery(profileQuery, { freelancerId });

    if (profileData.length === 0) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    const profile = profileData[0];

    // CRITICAL: Get links from TABLE (not VIEW) to include empty links
    const linksQuery = `
      SELECT 
        FreelancerWebsiteDataLinkID,
        LinkName,
        LinkURL
      FROM ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}
      WHERE FreelancerID = @freelancerId
    `;

    console.log(
      `📊 Fetching links from TABLE: ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}`
    );
    const linksData = await executeQuery(linksQuery, { freelancerId });
    console.log(`✅ Found ${linksData.length} link(s)`);

    // Convert links array to object with proper capitalization
    const links = {
      Website: "",
      Instagram: "",
      Imdb: "",
      LinkedIn: "",
    };

    linksData.forEach((link) => {
      // Use the LinkName from database as the key (it's already properly capitalized)
      links[link.LinkName] = link.LinkURL || "";
    });

    console.log(`📋 Links loaded:`, links);

    return NextResponse.json({
      success: true,
      data: {
        freelancerId: profile.FreelancerID,
        slug: profile.Slug,
        name: profile.DisplayName,
        bio: profile.FreelancerBio,
        photoUrl: profile.PhotoBlobID
          ? `/api/blob/${profile.PhotoBlobID}`
          : null,
        cvUrl: profile.CVBlobID ? `/api/blob/${profile.CVBlobID}` : null,
        links: links, // All 4 links with their current values (empty or not)
      },
    });
  } catch (error) {
    console.error("❌ Load profile for edit error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load profile",
      },
      { status: 500 }
    );
  }
}
