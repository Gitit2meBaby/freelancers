// app/api/profile/update/route.js - CORRECTED WITH EQUIPMENT LIST
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  executeQuery,
  executeUpdate,
  VIEWS,
  TABLES,
  LINK_TYPES,
} from "../../../lib/db";

/**
 * PUT /api/profile/update
 * Simple profile updates - bio, photo, CV, equipment list, and 4 links
 * Only UPDATE operations, no INSERTs needed
 *
 * CRITICAL RULES:
 * 1. Blob IDs are FIXED (P000123, C000123, E000123) based on FreelancerID
 * 2. Azure Blob automatically overwrites when uploading with same ID
 * 3. NO DELETION needed - we just update the database references
 * 4. NO VERIFICATION STATUS CHANGES - verification is set once during setup
 */
export async function PUT(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const freelancerId = parseInt(session.user.id);
    const slug = session.user.slug; // Get slug from session
    const data = await request.json();

    let hasChanges = false;
    let textUpdates = {};

    // ==================================================
    // STEP 1: Handle Photo Update
    // ==================================================
    if (data.photoBlobId) {
      // Simply update the database with the new blob ID
      // NO DELETION - Azure Blob has already overwritten the file
      // NO VERIFICATION STATUS CHANGE - verification is permanent
      await executeUpdate(
        TABLES.FREELANCER_WEBSITE_DATA,
        {
          PhotoBlobID: data.photoBlobId,
        },
        { FreelancerID: freelancerId },
      );

      hasChanges = true;
    }

    // ==================================================
    // STEP 2: Handle CV Update
    // ==================================================
    if (data.cvBlobId) {
      // Simply update the database with the new blob ID
      // NO DELETION - Azure Blob has already overwritten the file
      // NO VERIFICATION STATUS CHANGE - verification is permanent
      await executeUpdate(
        TABLES.FREELANCER_WEBSITE_DATA,
        {
          CVBlobID: data.cvBlobId,
        },
        { FreelancerID: freelancerId },
      );

      hasChanges = true;
    }

    // ==================================================
    // STEP 2.5: Handle Equipment List Update
    // ==================================================
    // ✅ ADDED EQUIPMENT LIST HANDLING
    if (data.EquipmentBlobID) {
      // Simply update the database with the new blob ID
      // NO DELETION - Azure Blob has already overwritten the file
      // NO VERIFICATION STATUS CHANGE - verification is permanent
      await executeUpdate(
        TABLES.FREELANCER_WEBSITE_DATA,
        {
          EquipmentBlobID: data.EquipmentBlobID,
        },
        { FreelancerID: freelancerId },
      );

      hasChanges = true;
    }

    // ==================================================
    // STEP 3: Update Bio and Name (with change detection)
    // ==================================================
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
    }

    if (data.bio !== undefined && data.bio !== currentValues.FreelancerBio) {
      textUpdates.FreelancerBio = data.bio;
    }

    if (Object.keys(textUpdates).length > 0) {
      await executeUpdate(TABLES.FREELANCER_WEBSITE_DATA, textUpdates, {
        FreelancerID: freelancerId,
      });
      hasChanges = true;
    }

    // ==================================================
    // STEP 4: Update Links (4 existing links only, with change detection)
    // ==================================================
    let linksChanged = false;

    if (data.links) {
      // Query TABLE directly (not VIEW) to include empty links
      const currentLinksQuery = `
        SELECT FreelancerWebsiteDataLinkID, LinkName, LinkURL
        FROM ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}
        WHERE FreelancerID = @freelancerId
      `;

      const currentLinks = await executeQuery(currentLinksQuery, {
        freelancerId,
      });

      // Update each of the 4 link types
      const linkTypes = [
        { key: "Website", name: LINK_TYPES.WEBSITE },
        { key: "Instagram", name: LINK_TYPES.INSTAGRAM },
        { key: "Imdb", name: LINK_TYPES.IMDB },
        { key: "LinkedIn", name: LINK_TYPES.LINKEDIN },
      ];

      for (const linkType of linkTypes) {
        const newUrl = data.links[linkType.key] || "";

        // Find the existing link record
        const existingLink = currentLinks.find(
          (l) => l.LinkName.toLowerCase() === linkType.name.toLowerCase(),
        );

        if (existingLink) {
          const currentUrl = existingLink.LinkURL || "";

          // Only update if URL changed
          if (newUrl !== currentUrl) {
            await executeUpdate(
              TABLES.FREELANCER_WEBSITE_DATA_LINKS,
              { LinkURL: newUrl },
              {
                FreelancerWebsiteDataLinkID:
                  existingLink.FreelancerWebsiteDataLinkID,
              },
            );
            linksChanged = true;
            hasChanges = true;
          }
        } else {
          console.warn(
            `⚠️ Link record for '${linkType.name}' not found for freelancer ${freelancerId}`,
          );
        }
      }
    }

    // ==================================================
    // STEP 5: Return success response
    // ==================================================
    if (!hasChanges) {
      return NextResponse.json({
        success: true,
        message: "No changes detected",
        changes: {
          photo: false,
          cv: false,
          equipment: false, // ✅ ADDED
          name: false,
          bio: false,
          links: false,
        },
      });
    }

    // ==================================================
    // CRITICAL: COMPREHENSIVE CACHE INVALIDATION
    // ==================================================

    // 1. Invalidate the generic freelancers tag
    revalidateTag("freelancers");
    console.log(`♻️ Invalidated 'freelancers' tag`);

    // 2. Invalidate specific freelancer's API route path
    revalidatePath(`/api/freelancer/${slug}`);
    console.log(`♻️ Revalidated path: /api/freelancer/${slug}`);

    // 3. Invalidate the profile page path
    revalidatePath(`/my-account/${slug}`);
    console.log(`♻️ Revalidated path: /my-account/${slug}`);

    // 4. Invalidate the edit profile page
    revalidatePath("/edit-profile");
    console.log(`♻️ Revalidated path: /edit-profile`);

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      changes: {
        photo: !!data.photoBlobId,
        cv: !!data.cvBlobId,
        equipment: !!data.EquipmentBlobID, // ✅ ADDED
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
      { status: 500 },
    );
  }
}
