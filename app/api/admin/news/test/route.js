// app/api/admin/news/test/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { executeQuery, TABLES } from "../../../../lib/db";

/**
 * GET /api/admin/news/test
 * Test endpoint to see the exact data structure of news items
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

    // Query to see the current structure
    const query = `
      SELECT 
        NewsItemID,
        NewsItem,
        NewsBlobID
      FROM ${TABLES.NEWS_ITEMS}
      ORDER BY NewsItemID
    `;

    const newsItems = await executeQuery(query);

    // Query to see stored documents structure
    const docsQuery = `
      SELECT 
        StoredDocumentID,
        StoredDocumentTypeID,
        BlobID,
        DocumentTitle,
        DateUploaded,
        UploadedByID,
        OriginalFileName
      FROM ${TABLES.STORED_DOCUMENTS}
      WHERE StoredDocumentTypeID = 4
      ORDER BY StoredDocumentID
    `;

    const storedDocs = await executeQuery(docsQuery);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        newsItems,
        storedDocuments: storedDocs,
        counts: {
          newsItems: newsItems.length,
          storedDocs: storedDocs.length,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching test data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
