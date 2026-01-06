// app/api/profile/update/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  executeQuery,
  executeUpdate,
  executeInsert,
  executeDelete,
  VIEWS,
  TABLES,
  STATUS_CODES,
  DOCUMENT_TYPES,
  SYSTEM_USER_ID,
} from "@/app/lib/db";
import { deleteBlob } from "../../../lib/azureBlob";

/**
 * PUT /api/profile/update
 *
 * Allows authenticated users to update:
 * - DisplayName
 * - FreelancerBio
 * - PhotoBlobID (via file upload)
 * - CVBlobID (via file upload)
 * - Links (website, instagram, imdb, linkedin)
 *
 * Sets verification status back to "To Be Verified" (1) after changes
 */
export async function PUT(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.freelancerId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const freelancerId = parseInt(session.user.freelancerId);
    const data = await request.json();

    console.log(`📝 Profile update for FreelancerID: ${freelancerId}`);

    // ================================================
    // STEP 1: Get current data
    // ================================================
    const currentDataQuery = `
      SELECT 
        PhotoBlobID,
        PhotoStatusID,
        CVBlobID,
        CVStatusID,
        DisplayName,
        FreelancerBio
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

    // ================================================
    // STEP 2: Handle Photo Upload (if new photo provided)
    // ================================================
    let newPhotoBlobID = null;
    let photoChanged = false;

    if (data.photoBlobId) {
      console.log(`📸 New photo uploaded: ${data.photoBlobId}`);
      photoChanged = true;

      // Delete old photo if exists
      if (current.PhotoBlobID) {
        console.log(`🗑️ Deleting old photo: ${current.PhotoBlobID}`);
        await deleteBlob(current.PhotoBlobID);
        await executeDelete(TABLES.STORED_DOCUMENTS, {
          BlobID: current.PhotoBlobID,
        });
      }

      newPhotoBlobID = data.photoBlobId;

      // Add new photo to stored documents
      await executeInsert(TABLES.STORED_DOCUMENTS, {
        StoredDocumentTypeID: DOCUMENT_TYPES.PHOTO,
        BlobID: newPhotoBlobID,
        DocumentTitle: data.displayName || current.DisplayName,
        DateUploaded: new Date(),
        UploadedByID: SYSTEM_USER_ID,
        OriginalFileName: data.photoFileName || "profile-photo.jpg",
      });

      console.log(`✅ New photo added to documents`);
    }

    // ================================================
    // STEP 3: Handle CV Upload (if new CV provided)
    // ================================================
    let newCVBlobID = null;
    let cvChanged = false;

    if (data.cvBlobId) {
      console.log(`📄 New CV uploaded: ${data.cvBlobId}`);
      cvChanged = true;

      // Delete old CV if exists
      if (current.CVBlobID) {
        console.log(`🗑️ Deleting old CV: ${current.CVBlobID}`);
        await deleteBlob(current.CVBlobID);
        await executeDelete(TABLES.STORED_DOCUMENTS, {
          BlobID: current.CVBlobID,
        });
      }

      newCVBlobID = data.cvBlobId;

      // Add new CV to stored documents
      await executeInsert(TABLES.STORED_DOCUMENTS, {
        StoredDocumentTypeID: DOCUMENT_TYPES.CV,
        BlobID: newCVBlobID,
        DocumentTitle: data.displayName || current.DisplayName,
        DateUploaded: new Date(),
        UploadedByID: SYSTEM_USER_ID,
        OriginalFileName: data.cvFileName || "resume.pdf",
      });

      console.log(`✅ New CV added to documents`);
    }

    // ================================================
    // STEP 4: Check if bio or name changed
    // ================================================
    const bioChanged = data.bio && data.bio !== current.FreelancerBio;
    const nameChanged =
      data.displayName && data.displayName !== current.DisplayName;

    // ================================================
    // STEP 5: Update main freelancer data
    // ================================================
    const updateData = {};
    let needsVerification = false;

    if (nameChanged) {
      updateData.DisplayName = data.displayName;
      needsVerification = true;
      console.log(`✏️ Display name changed`);
    }

    if (bioChanged) {
      updateData.FreelancerBio = data.bio;
      needsVerification = true;
      console.log(`✏️ Bio changed`);
    }

    if (photoChanged) {
      updateData.PhotoBlobID = newPhotoBlobID;
      updateData.PhotoStatusID = STATUS_CODES.TO_BE_VERIFIED; // Set to "To Be Verified"
      needsVerification = true;
      console.log(`✏️ Photo changed - status set to "To Be Verified"`);
    }

    if (cvChanged) {
      updateData.CVBlobID = newCVBlobID;
      updateData.CVStatusID = STATUS_CODES.TO_BE_VERIFIED; // Set to "To Be Verified"
      needsVerification = true;
      console.log(`✏️ CV changed - status set to "To Be Verified"`);
    }

    // Only update if there are changes
    if (Object.keys(updateData).length > 0) {
      await executeUpdate(TABLES.FREELANCER_WEBSITE_DATA, updateData, {
        FreelancerID: freelancerId,
      });
      console.log(`✅ Main data updated`);
    }

    // ================================================
    // STEP 6: Update Links
    // ================================================
    const linksChanged = await updateLinks(freelancerId, data.links);

    if (linksChanged) {
      needsVerification = true;
      console.log(`✏️ Links changed`);
    }

    // ================================================
    // STEP 7: Return success response
    // ================================================
    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      needsVerification, // Flag to show verification modal
      changes: {
        name: nameChanged,
        bio: bioChanged,
        photo: photoChanged,
        cv: cvChanged,
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

/**
 * Update freelancer links
 * @param {number} freelancerId - Freelancer ID
 * @param {Object} links - Links object with website, instagram, imdb, linkedin
 * @returns {Promise<boolean>} True if any links were changed
 */
async function updateLinks(freelancerId, links) {
  if (!links) return false;

  let anyChanged = false;

  // Link types that Paul specified: "website", "instagram", "imdb", "linked in"
  const linkTypes = {
    website: "website",
    instagram: "instagram",
    imdb: "imdb",
    linkedin: "linked in", // Note: Paul specified "linked in" with space
  };

  for (const [key, linkName] of Object.entries(linkTypes)) {
    const newUrl = links[key] || "";

    // Get current link
    const currentQuery = `
      SELECT LinkURL, FreelancerLinkID
      FROM ${VIEWS.FREELANCER_LINKS}
      WHERE FreelancerID = @freelancerId
        AND LinkName = @linkName
    `;

    const currentLink = await executeQuery(currentQuery, {
      freelancerId,
      linkName,
    });

    if (currentLink.length > 0) {
      // Link exists - update if different
      const currentUrl = currentLink[0].LinkURL || "";

      if (newUrl !== currentUrl) {
        await executeUpdate(
          TABLES.FREELANCER_WEBSITE_DATA_LINKS,
          { LinkURL: newUrl },
          { FreelancerLinkID: currentLink[0].FreelancerLinkID }
        );
        anyChanged = true;
        console.log(`🔗 Updated ${linkName}: ${newUrl || "(removed)"}`);
      }
    } else if (newUrl) {
      // Link doesn't exist but user provided one - create it
      await executeInsert(TABLES.FREELANCER_WEBSITE_DATA_LINKS, {
        FreelancerID: freelancerId,
        LinkName: linkName,
        LinkURL: newUrl,
      });
      anyChanged = true;
      console.log(`🔗 Created ${linkName}: ${newUrl}`);
    }
  }

  return anyChanged;
}

/**
 * VERIFICATION WORKFLOW:
 *
 * When a user updates their profile:
 * 1. Changes are saved immediately
 * 2. If photo/CV changed → StatusID set to 1 (To Be Verified)
 * 3. User sees modal: "Changes submitted for verification"
 * 4. Admin reviews in Access database
 * 5. Admin sets StatusID to 2 (Verified) or 3 (Rejected)
 * 6. Only verified content shows on public profile
 *
 * STATUS CODES:
 * 0 = None
 * 1 = To Be Verified (set automatically after user update)
 * 2 = Verified (set by admin)
 * 3 = Rejected (set by admin)
 */
