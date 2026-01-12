// app/api/admin/news/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import {
  executeQuery,
  executeUpdate,
  executeDelete,
  TABLES,
} from "../../../../lib/db";
import { deleteBlob } from "../../../../lib/azureBlob";
import { revalidateTag } from "next/cache";

/**
 * PATCH /api/admin/news/[id]
 * Update a news item (e.g., toggle active status)
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

    const { id } = await params;
    const data = await request.json();

    const updates = {};

    if (data.isActive !== undefined) {
      updates.IsActive = data.isActive;
    }

    if (data.title) {
      updates.Title = data.title;
    }

    updates.ModifiedDate = new Date().toISOString();

    await executeUpdate(TABLES.NEWS_ITEMS, updates, {
      NewsItemID: parseInt(id),
    });

    // Revalidate the news cache
    revalidateTag("news");

    return NextResponse.json({
      success: true,
      message: "News item updated successfully",
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

/**
 * DELETE /api/admin/news/[id]
 * Delete a news item and its associated PDF from blob storage
 */
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get the PDF blob ID before deleting
    const query = `
      SELECT PDFBlobID
      FROM ${TABLES.NEWS_ITEMS}
      WHERE NewsItemID = @id
    `;

    const results = await executeQuery(query, { id: parseInt(id) });

    if (results.length === 0) {
      return NextResponse.json(
        { success: false, error: "News item not found" },
        { status: 404 }
      );
    }

    const pdfBlobId = results[0].PDFBlobID;

    // Delete from database
    await executeDelete(TABLES.NEWS_ITEMS, { NewsItemID: parseInt(id) });

    // Delete PDF from Azure Blob Storage
    if (pdfBlobId) {
      try {
        await deleteBlob(pdfBlobId);
        console.log(`✅ Deleted PDF blob: ${pdfBlobId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to delete PDF blob: ${error.message}`);
      }
    }

    // Revalidate the news cache
    revalidateTag("news");

    return NextResponse.json({
      success: true,
      message: "News item deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting news item:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
