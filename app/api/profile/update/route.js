// app/api/profile/update/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  executeQuery,
  executeUpdate,
  executeDelete,
  VIEWS,
  TABLES,
  LINK_TYPES,
  STATUS_CODES,
} from "@/app/lib/db";
import { deleteBlob } from "@/app/lib/azureBlob";

/**
 * PUT /api/profile/update
 * Simple profile updates - bio, photo, and 4 links
 * Only UPDATE operations, no INSERTs needed
 */
export async function PUT(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const freelancerId = parseInt(session.user.id);
    const data = await request.json();

    console.log(`📝 Updating profile for freelancer ID: ${freelancerId}`);

    // ==================================================
    // STEP 1: Get current photo and CV blob IDs for cleanup
    // ==================================================
    const currentDataQuery = `
      SELECT PhotoBlobID, CVBlobID
      FROM ${VIEWS.FREELANCERS}
      WHERE FreelancerID = @freelancerId
    `;

    const currentData = await executeQuery(currentDataQuery, { freelancerId });

    if (currentData.length === 0) {
      return NextResponse.json(
        { success: false, error: "Freelancer not found" },
        { status: 404 }
      );
    }

    const current = currentData[0];
    let hasChanges = false; // Track if any changes were made
    let textUpdates = {}; // Track text field updates

    // ==================================================
    // STEP 2: Handle Photo Update
    // ==================================================
    if (data.photoBlobId) {
      console.log(`📸 Updating photo...`);

      // Delete old photo from Azure Blob if it exists and is different
      if (current.PhotoBlobID && current.PhotoBlobID !== data.photoBlobId) {
        console.log(`🗑️ Deleting old photo: ${current.PhotoBlobID}`);
        try {
          await deleteBlob(current.PhotoBlobID);
        } catch (error) {
          console.warn(`⚠️ Failed to delete old photo blob: ${error.message}`);
        }
      }

      // Update freelancer with new photo blob ID
      await executeUpdate(
        TABLES.FREELANCER_WEBSITE_DATA,
        {
          PhotoBlobID: data.photoBlobId,
          PhotoStatusID: STATUS_CODES.TO_BE_VERIFIED,
        },
        { FreelancerID: freelancerId }
      );

      hasChanges = true;
      console.log(`✅ Photo updated successfully`);
    }

    // ==================================================
    // STEP 3: Handle CV Update
    // ==================================================
    if (data.cvBlobId) {
      console.log(`📄 Updating CV...`);

      // Delete old CV from Azure Blob if it exists and is different
      if (current.CVBlobID && current.CVBlobID !== data.cvBlobId) {
        console.log(`🗑️ Deleting old CV: ${current.CVBlobID}`);
        try {
          await deleteBlob(current.CVBlobID);
        } catch (error) {
          console.warn(`⚠️ Failed to delete old CV blob: ${error.message}`);
        }
      }

      // Update freelancer with new CV blob ID
      await executeUpdate(
        TABLES.FREELANCER_WEBSITE_DATA,
        {
          CVBlobID: data.cvBlobId,
          CVStatusID: STATUS_CODES.TO_BE_VERIFIED,
        },
        { FreelancerID: freelancerId }
      );

      hasChanges = true;
      console.log(`✅ CV updated successfully`);
    }

    // ==================================================
    // STEP 4: Update Bio and Name (with change detection)
    // ==================================================
    // First, get current values to check if they actually changed
    const currentTextQuery = `
      SELECT DisplayName, FreelancerBio
      FROM ${VIEWS.FREELANCERS}
      WHERE FreelancerID = @freelancerId
    `;

    const currentText = await executeQuery(currentTextQuery, { freelancerId });
    const currentValues = currentText[0] || {};

    if (
      data.displayName !== undefined &&
      data.displayName !== currentValues.DisplayName
    ) {
      textUpdates.DisplayName = data.displayName;
      console.log(`📝 Updating display name`);
    }

    if (data.bio !== undefined && data.bio !== currentValues.FreelancerBio) {
      textUpdates.FreelancerBio = data.bio;
      console.log(`📝 Updating bio`);
    }

    if (Object.keys(textUpdates).length > 0) {
      await executeUpdate(TABLES.FREELANCER_WEBSITE_DATA, textUpdates, {
        FreelancerID: freelancerId,
      });
      hasChanges = true;
      console.log(`✅ Text fields updated successfully`);
    }

    // ==================================================
    // STEP 5: Update Links (4 existing links only, with change detection)
    // ==================================================
    let linksChanged = false;

    if (data.links) {
      console.log(`🔗 Updating links...`);

      // Get current links from VIEW (includes FreelancerWebsiteDataLinkID)
      const currentLinksQuery = `
        SELECT FreelancerWebsiteDataLinkID, LinkName, LinkURL
        FROM ${VIEWS.FREELANCER_LINKS}
        WHERE FreelancerID = @freelancerId
      `;

      const currentLinks = await executeQuery(currentLinksQuery, {
        freelancerId,
      });

      // Update each of the 4 link types
      const linkTypes = [
        { key: "website", name: LINK_TYPES.WEBSITE },
        { key: "instagram", name: LINK_TYPES.INSTAGRAM },
        { key: "imdb", name: LINK_TYPES.IMDB },
        { key: "linkedin", name: LINK_TYPES.LINKEDIN },
      ];

      for (const linkType of linkTypes) {
        const newUrl = data.links[linkType.key] || "";

        // Find the existing link record
        const existingLink = currentLinks.find(
          (l) => l.LinkName.toLowerCase() === linkType.name.toLowerCase()
        );

        if (existingLink) {
          // Only update if URL changed
          const currentUrl = existingLink.LinkURL || "";
          if (newUrl !== currentUrl) {
            await executeUpdate(
              TABLES.FREELANCER_WEBSITE_DATA_LINKS,
              { LinkURL: newUrl },
              {
                FreelancerWebsiteDataLinkID:
                  existingLink.FreelancerWebsiteDataLinkID,
              }
            );
            linksChanged = true;
            hasChanges = true;
            console.log(
              `🔗 Updated ${linkType.name}: ${newUrl || "(cleared)"}`
            );
          }
        } else {
          // Link record doesn't exist - this shouldn't happen if DB is set up correctly
          console.warn(
            `⚠️ Link record for '${linkType.name}' not found for freelancer ${freelancerId}`
          );
        }
      }

      if (linksChanged) {
        console.log(`✅ Links updated successfully`);
      } else {
        console.log(`ℹ️ No link changes detected`);
      }
    }

    // ==================================================
    // STEP 6: Return success response
    // ==================================================

    // If no changes were made, return early
    if (!hasChanges) {
      console.log(`ℹ️ No changes detected - nothing to update`);
      return NextResponse.json({
        success: true,
        message: "No changes detected",
        needsVerification: false,
        changes: {
          photo: false,
          cv: false,
          name: false,
          bio: false,
          links: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      needsVerification: true, // Always show modal when changes are made
      changes: {
        photo: !!data.photoBlobId,
        cv: !!data.cvBlobId,
        name: textUpdates.DisplayName !== undefined,
        bio: textUpdates.FreelancerBio !== undefined,
        links: linksChanged,
      },
    });
  } catch (error) {
    console.error("❌ Profile update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update profile",
      },
      { status: 500 }
    );
  }
}
