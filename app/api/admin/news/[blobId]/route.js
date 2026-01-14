// app/api/admin/news/[blobId]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { executeQuery, executeUpdate, TABLES } from "../../../../lib/db";
import { deleteBlob } from "../../../../lib/azureBlob";
import { revalidateTag } from "next/cache";

/**
 * PATCH /api/admin/news/[blobId]
 * Update a news item's title and/or PDF file
 */
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { blobId } = await params;
    const data = await request.json();

    // Validate that we have at least a title
    if (!data.title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    // ==================================================
    // STEP 1: Get current blob info for cleanup (if new file uploaded)
    // ==================================================
    const currentDataQuery = `
      SELECT NewsBlobID
      FROM ${TABLES.NEWS_ITEMS}
      WHERE NewsBlobID = @blobId
    `;

    const currentData = await executeQuery(currentDataQuery, { blobId });

    if (currentData.length === 0) {
      return NextResponse.json(
        { success: false, error: "News item not found" },
        { status: 404 }
      );
    }

    // ==================================================
    // STEP 2: Handle PDF replacement (if new file was uploaded)
    // ==================================================
    let finalBlobId = blobId; // Default to current blob ID
    let needsBlobCleanup = false;

    if (data.newBlobId && data.fileName) {
      // New file was uploaded, delete old blob
      if (blobId && blobId !== data.newBlobId) {
        try {
          await deleteBlob(blobId);
          needsBlobCleanup = true;
          finalBlobId = data.newBlobId;
        } catch (error) {
          console.warn(`⚠️ Failed to delete old PDF blob: ${error.message}`);
          // Continue anyway - the update is more important
        }
      }
    }

    // ==================================================
    // STEP 3: UPDATE tblNewsItems (Title and potentially new BlobID)
    // ==================================================
    const newsItemUpdates = {
      NewsItem: data.title,
    };

    // If we have a new blob ID, update the reference
    if (needsBlobCleanup) {
      newsItemUpdates.NewsBlobID = finalBlobId;
    }

    await executeUpdate(
      TABLES.NEWS_ITEMS,
      newsItemUpdates,
      { NewsBlobID: blobId } // WHERE clause - find by OLD blob ID
    );

    // ==================================================
    // STEP 4: UPDATE tblStoredDocuments
    // ==================================================
    // Per Paul's instructions:
    // - Always update DocumentTitle when title changes
    // - Only update OriginalFileName and DateUploaded when NEW PDF uploaded

    const storedDocUpdates = {
      DocumentTitle: data.title,
    };

    // Only update filename and date if a NEW PDF was uploaded
    if (data.fileName) {
      storedDocUpdates.OriginalFileName = data.fileName;
      storedDocUpdates.DateUploaded = new Date().toISOString();
    }

    // If we have a new blob, we need to update the BlobID in stored documents too
    if (needsBlobCleanup) {
      storedDocUpdates.BlobID = finalBlobId;
    }

    await executeUpdate(TABLES.STORED_DOCUMENTS, storedDocUpdates, {
      BlobID: blobId, // WHERE clause - find by OLD blob ID
      StoredDocumentTypeID: 4, // News Items type
    });

    // ==================================================
    // STEP 5: Revalidate cache
    // ==================================================
    revalidateTag("news");

    return NextResponse.json({
      success: true,
      message: "News item updated successfully",
      data: {
        updatedFields: {
          title: true,
          file: !!data.newBlobId,
          blobId: finalBlobId,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error updating news item:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
