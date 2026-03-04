// app/api/profile/update/route.js
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
 *
 * CRITICAL RULES:
 * 1. Blob IDs are FIXED (P000123, C000123, E000123) based on FreelancerID
 * 2. Azure Blob automatically overwrites when uploading with same ID
 * 3. NO DELETION needed — we just update the database references
 * 4. NO VERIFICATION STATUS CHANGES — verification is set once during setup
 */
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const freelancerId = parseInt(session.user.id);
    const data = await request.json();

    let hasChanges = false;
    let textUpdates = {};

    // ==================================================
    // STEP 1: Handle Photo Update
    // ==================================================
    if (data.photoBlobId) {
      await executeUpdate(
        TABLES.FREELANCER_WEBSITE_DATA,
        { PhotoBlobID: data.photoBlobId },
        { FreelancerID: freelancerId },
      );
      hasChanges = true;
    }

    // ==================================================
    // STEP 2: Handle CV Update
    // ==================================================
    if (data.cvBlobId) {
      await executeUpdate(
        TABLES.FREELANCER_WEBSITE_DATA,
        { CVBlobID: data.cvBlobId },
        { FreelancerID: freelancerId },
      );
      hasChanges = true;
    }

    // ==================================================
    // STEP 3: Handle Equipment List Update
    // ==================================================
    if (data.EquipmentBlobID) {
      await executeUpdate(
        TABLES.FREELANCER_WEBSITE_DATA,
        { EquipmentBlobID: data.EquipmentBlobID },
        { FreelancerID: freelancerId },
      );
      hasChanges = true;
    }

    // ==================================================
    // STEP 4: Update Bio and Name (with change detection)
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
    // STEP 5: Update Links
    // ==================================================
    let linksChanged = false;

    if (data.links) {
      const currentLinksQuery = `
        SELECT FreelancerWebsiteDataLinkID, LinkName, LinkURL
        FROM ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}
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

      for (const linkType of linkTypes) {
        const newUrl = data.links[linkType.key] || "";
        const existingLink = currentLinks.find(
          (l) => l.LinkName.toLowerCase() === linkType.name.toLowerCase(),
        );

        if (existingLink) {
          const currentUrl = existingLink.LinkURL || "";
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

    if (!hasChanges) {
      return NextResponse.json({
        success: true,
        message: "No changes detected",
        changes: {
          photo: false,
          cv: false,
          equipment: false,
          name: false,
          bio: false,
          links: false,
        },
      });
    }

    // ==================================================
    // CACHE INVALIDATION
    //
    // IMPORTANT: slug must come from DB, not session.
    // Session slug can be stale or undefined for users who haven't
    // re-authenticated since their profile was created, causing
    // revalidatePath to fire on the wrong URL and serve stale images.
    // ==================================================
    const slugResult = await executeQuery(
      `SELECT Slug FROM ${VIEWS.FREELANCERS} WHERE FreelancerID = @freelancerId`,
      { freelancerId },
    );
    const slug = slugResult[0]?.Slug;

    if (!slug) {
      // Still succeed — data is saved, cache will expire naturally
      console.warn(
        `⚠️ Could not resolve slug for freelancer ${freelancerId} — skipping targeted revalidation`,
      );
    } else {
      // revalidateTag busts the unstable_cache block in the [slug] API route.
      // This is the only invalidation that actually matters for ISR-cached pages.
      // revalidatePath calls below are belt-and-suspenders for page-level ISR.
      revalidateTag("freelancers");
      console.log(`♻️ Invalidated tag: freelancers (slug=${slug})`);

      revalidatePath(`/api/freelancer/${slug}`);
      revalidatePath(`/my-account/${slug}`);
      revalidatePath("/crew-directory"); // crew directory lists ALL freelancers
      revalidatePath("/edit-profile");
      console.log(`♻️ Revalidated paths for slug: ${slug}`);
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      changes: {
        photo: !!data.photoBlobId,
        cv: !!data.cvBlobId,
        equipment: !!data.EquipmentBlobID,
        name: textUpdates.DisplayName !== undefined,
        bio: textUpdates.FreelancerBio !== undefined,
        links: linksChanged,
      },
    });
  } catch (error) {
    console.error("❌ Profile update error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update profile" },
      { status: 500 },
    );
  }
}
