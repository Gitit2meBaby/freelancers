// app/api/profile/load-for-edit/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { executeQuery, VIEWS, TABLES } from "@/app/lib/db";
import { getBlobUrl } from "@/app/lib/azureBlob";

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

    // Get main profile data
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

    // Get links from TABLE (not VIEW) to include empty links
    const linksQuery = `
      SELECT 
        FreelancerWebsiteDataLinkID,
        LinkName,
        LinkURL
      FROM ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}
      WHERE FreelancerID = @freelancerId
    `;

    const linksData = await executeQuery(linksQuery, { freelancerId });

    // Convert links array to object with proper capitalization
    const links = {
      Website: "",
      Instagram: "",
      Imdb: "",
      LinkedIn: "",
    };

    linksData.forEach((link) => {
      links[link.LinkName] = link.LinkURL || "";
    });

    return NextResponse.json({
      success: true,
      data: {
        freelancerId: profile.FreelancerID,
        slug: profile.Slug,
        name: profile.DisplayName,
        bio: profile.FreelancerBio,
        photoUrl: profile.PhotoBlobID ? getBlobUrl(profile.PhotoBlobID) : null,
        cvUrl: profile.CVBlobID ? getBlobUrl(profile.CVBlobID) : null,
        links: links,
      },
    });
  } catch (error) {
    console.error("Load profile for edit error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load profile",
      },
      { status: 500 }
    );
  }
}
