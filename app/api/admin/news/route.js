// app/api/admin/news/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { executeQuery, TABLES } from "../../../lib/db";
import { getBlobUrl } from "../../../lib/azureBlob";

/**
 * GET /api/admin/news
 * Returns all 4 news items for admin management
 * (Unlike public /api/news, this shows ALL items regardless of active status)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Query to get all 4 news items with their associated stored document info
    const query = `
      SELECT 
        n.NewsItemID,
        n.NewsItem as Title,
        n.NewsBlobID as BlobID,
        sd.DocumentTitle,
        sd.OriginalFileName,
        sd.DateUploaded,
        sd.StoredDocumentID
      FROM ${TABLES.NEWS_ITEMS} n
      LEFT JOIN ${TABLES.STORED_DOCUMENTS} sd 
        ON n.NewsBlobID = sd.BlobID 
        AND sd.StoredDocumentTypeID = 4
      ORDER BY n.NewsItemID
    `;

    const results = await executeQuery(query);

    const newsItems = results.map((item) => ({
      id: item.NewsItemID,
      title: item.Title || "Untitled",
      blobId: item.BlobID,
      pdfUrl: item.BlobID ? getBlobUrl(item.BlobID) : null,
      pdfFileName: item.OriginalFileName || "No file",
      publishDate: item.DateUploaded || new Date().toISOString(),
      storedDocumentId: item.StoredDocumentID,
    }));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: newsItems,
      count: newsItems.length,
    });
  } catch (error) {
    console.error("❌ Error fetching admin news items:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
