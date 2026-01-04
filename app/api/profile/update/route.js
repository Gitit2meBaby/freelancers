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
  LINK_TYPES,
  STATUS_CODES,
  DOCUMENT_TYPES,
  SYSTEM_USER_ID,
} from "@/app/lib/db";
import { deleteBlob } from "../../../lib/azureBlob";

/**
 * PUT /api/profile/update
 * Updates freelancer profile data
 * Handles cleanup of old files and data
 * Requires authentication
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
    // STEP 1: Get current data to identify what needs cleanup
    // ==================================================
    const currentDataQuery = `
      SELECT 
        PhotoBlobID,
        PhotoStatusID,
        CVBlobID,
        CVStatusID
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

    // ==================================================
    // STEP 2: Handle Photo Update & Cleanup
    // ==================================================
    if (data.photoBlobId) {
      console.log(`🖼️ Updating photo...`);

      // Delete old photo from Azure if it exists
      if (current.PhotoBlobID) {
        console.log(`🗑️ Deleting old photo: ${current.PhotoBlobID}`);
        await deleteBlob(current.PhotoBlobID);

        // Delete old stored document record
        await executeDelete(TABLES.STORED_DOCUMENTS, {
          BlobID: current.PhotoBlobID,
        });
      }

      // Update freelancer with new photo blob ID
      await executeUpdate(
        TABLES.FREELANCER_WEBSITE_DATA,
        {
          PhotoBlobID: data.photoBlobId,
          PhotoStatusID: STATUS_CODES.TO_BE_VERIFIED, // Needs verification
        },
        { FreelancerID: freelancerId }
      );

      // Create new stored document record
      await executeInsert(TABLES.STORED_DOCUMENTS, {
        StoredDocumentTypeID: DOCUMENT_TYPES.PHOTO,
        BlobID: data.photoBlobId,
        DocumentTitle: data.displayName || "Profile Photo",
        DateUploaded: new Date().toISOString(),
        UploadedByID: SYSTEM_USER_ID,
        OriginalFileName: `${data.photoBlobId}.jpg`,
      });

      console.log(`✅ Photo updated successfully`);
    }

    // ==================================================
    // STEP 3: Handle CV Update & Cleanup
    // ==================================================
    if (data.cvBlobId) {
      console.log(`📄 Updating CV...`);

      // Delete old CV from Azure if it exists
      if (current.CVBlobID) {
        console.log(`🗑️ Deleting old CV: ${current.CVBlobID}`);
        await deleteBlob(current.CVBlobID);

        // Delete old stored document record
        await executeDelete(TABLES.STORED_DOCUMENTS, {
          BlobID: current.CVBlobID,
        });
      }

      // Update freelancer with new CV blob ID
      await executeUpdate(
        TABLES.FREELANCER_WEBSITE_DATA,
        {
          CVBlobID: data.cvBlobId,
          CVStatusID: STATUS_CODES.TO_BE_VERIFIED, // Needs verification
        },
        { FreelancerID: freelancerId }
      );

      // Create new stored document record
      await executeInsert(TABLES.STORED_DOCUMENTS, {
        StoredDocumentTypeID: DOCUMENT_TYPES.CV,
        BlobID: data.cvBlobId,
        DocumentTitle: `${data.displayName || "CV"} - Resume`,
        DateUploaded: new Date().toISOString(),
        UploadedByID: SYSTEM_USER_ID,
        OriginalFileName: `${data.cvBlobId}.pdf`,
      });

      console.log(`✅ CV updated successfully`);
    }

    // ==================================================
    // STEP 4: Update Text Fields (Name, Bio)
    // ==================================================
    const textUpdates = {};

    if (data.displayName !== undefined) {
      textUpdates.DisplayName = data.displayName;
    }

    if (data.bio !== undefined) {
      textUpdates.FreelancerBio = data.bio;
    }

    if (Object.keys(textUpdates).length > 0) {
      console.log(`📝 Updating text fields...`);
      await executeUpdate(TABLES.FREELANCER_WEBSITE_DATA, textUpdates, {
        FreelancerID: freelancerId,
      });
      console.log(`✅ Text fields updated successfully`);
    }

    // ==================================================
    // STEP 5: Update Links (Website, Instagram, IMDb, LinkedIn)
    // ==================================================
    if (data.links) {
      console.log(`🔗 Updating links...`);

      // Get current links
      const currentLinksQuery = `
        SELECT FreelancerLinkID, LinkName, LinkURL
        FROM ${VIEWS.FREELANCER_LINKS}
        WHERE FreelancerID = @freelancerId
      `;

      const currentLinks = await executeQuery(currentLinksQuery, {
        freelancerId,
      });

      // Update each link type
      const linkTypes = [
        { key: "website", name: LINK_TYPES.WEBSITE },
        { key: "instagram", name: LINK_TYPES.INSTAGRAM },
        { key: "imdb", name: LINK_TYPES.IMDB },
        { key: "linkedin", name: LINK_TYPES.LINKEDIN },
      ];

      for (const linkType of linkTypes) {
        const newUrl = data.links[linkType.key];
        const existingLink = currentLinks.find(
          (l) => l.LinkName.toLowerCase() === linkType.name.toLowerCase()
        );

        if (existingLink) {
          // Update existing link
          await executeUpdate(
            TABLES.FREELANCER_WEBSITE_DATA_LINKS,
            { LinkURL: newUrl || "" },
            { FreelancerLinkID: existingLink.FreelancerLinkID }
          );
        } else {
          // Insert new link if it doesn't exist
          await executeInsert(TABLES.FREELANCER_WEBSITE_DATA_LINKS, {
            FreelancerID: freelancerId,
            LinkName: linkType.name,
            LinkURL: newUrl || "",
          });
        }
      }

      console.log(`✅ Links updated successfully`);
    }

    // ==================================================
    // STEP 6: Return success response
    // ==================================================
    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        freelancerId,
        updatedFields: {
          photo: !!data.photoBlobId,
          cv: !!data.cvBlobId,
          textFields: Object.keys(textUpdates).length > 0,
          links: !!data.links,
        },
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
 * GET /api/profile/update
 * Returns current profile status for debugging
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const freelancerId = parseInt(session.user.id);

    // Get current profile data
    const query = `
      SELECT 
        FreelancerID,
        DisplayName,
        Slug,
        FreelancerBio,
        PhotoBlobID,
        PhotoStatusID,
        CVBlobID,
        CVStatusID
      FROM ${VIEWS.FREELANCERS}
      WHERE FreelancerID = @freelancerId
    `;

    const result = await executeQuery(query, { freelancerId });

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
