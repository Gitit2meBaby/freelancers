// app/api/profile/load-for-edit/route.js - FIXED VERSION
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
        { status: 401 },
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
        CVBlobID,
        EquipmentBlobID
      FROM ${VIEWS.FREELANCERS}
      WHERE FreelancerID = @freelancerId
    `;

    const profileData = await executeQuery(profileQuery, { freelancerId });

    if (profileData.length === 0) {
      console.error(`❌ Profile not found for freelancer ${freelancerId}`);
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 },
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

    // Generate blob URLs
    const photoUrl = profile.PhotoBlobID?.trim()
      ? getBlobUrl(profile.PhotoBlobID)
      : null;

    const cvUrl = profile.CVBlobID?.trim()
      ? getBlobUrl(profile.CVBlobID)
      : null;

    const equipmentListUrl = profile.EquipmentBlobID?.trim()
      ? getBlobUrl(profile.EquipmentBlobID)
      : null;

    const responseData = {
      freelancerId: profile.FreelancerID,
      slug: profile.Slug,
      name: profile.DisplayName,
      bio: profile.FreelancerBio,
      photoUrl: photoUrl,
      photoBlobId: profile.PhotoBlobID, // Include blob ID for debugging
      cvUrl: cvUrl,
      cvBlobId: profile.CVBlobID, // Include blob ID for debugging
      equipmentListUrl: equipmentListUrl,
      EquipmentBlobID: profile.EquipmentBlobID, // Include blob ID for debugging
      links: links,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("❌ Load profile for edit error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load profile",
      },
      { status: 500 },
    );
  }
}
