// app/api/admin/fix-news-metadata/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { blobConfig } from "../../../lib/azureBlob";

/**
 * POST /api/admin/fix-news-metadata
 * One-time fix: Sets Content-Type metadata for existing news PDFs
 * This makes them download correctly with proper extension
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const newsBlobIds = ["N000001", "N000002", "N000003", "N000004"];
    const results = [];

    for (const blobId of newsBlobIds) {
      try {
        // Azure REST API endpoint to set blob properties
        const url = `${blobConfig.baseUrl}/${blobId}?comp=properties&${blobConfig.sasToken}`;

        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "x-ms-blob-content-type": "application/pdf",
            "x-ms-blob-content-disposition": 'inline; filename="document.pdf"',
          },
        });

        if (response.ok) {
          results.push({
            blobId,
            success: true,
            message: "Metadata updated",
          });
          console.log(`✅ Updated metadata for ${blobId}`);
        } else {
          const errorText = await response.text();
          results.push({
            blobId,
            success: false,
            error: `${response.status}: ${errorText}`,
          });
          console.error(`❌ Failed to update ${blobId}: ${errorText}`);
        }
      } catch (error) {
        results.push({
          blobId,
          success: false,
          error: error.message,
        });
        console.error(`❌ Error updating ${blobId}:`, error);
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      message: `Updated ${successCount} of ${newsBlobIds.length} blobs`,
      results,
      note: "You may need to clear browser cache to see the change",
    });
  } catch (error) {
    console.error("❌ Metadata update error:", error);
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
 * GET /api/admin/fix-news-metadata
 * Shows instructions
 */
export async function GET() {
  return NextResponse.json({
    message: "This endpoint fixes Content-Type metadata for news PDFs",
    usage: "Send POST request to execute the fix",
    note: "This is a one-time operation to fix manually uploaded PDFs",
  });
}
