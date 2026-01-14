// app/api/debug/debug-news/route.js
import { NextResponse } from "next/server";
import { executeQuery } from "../../../lib/db";
import { getBlobUrl } from "../../../lib/azureBlob";

/**
 * GET /api/debug-news
 * Debug endpoint to see exact differences between the 4 news items
 */
export async function GET() {
  try {
    console.log("🔍 Debugging news items...");

    // Query 1: tblNewsItems
    const newsItemsQuery = `
      SELECT *
      FROM tblNewsItems
      ORDER BY NewsItemID
    `;

    // Query 2: tblStoredDocuments for news
    const storedDocsQuery = `
      SELECT *
      FROM tblStoredDocuments
      WHERE StoredDocumentTypeID = 4
      ORDER BY StoredDocumentID
    `;

    // Query 3: Joined data
    const joinedQuery = `
      SELECT 
        n.*,
        sd.StoredDocumentID,
        sd.BlobID as StoredDocBlobID,
        sd.DocumentTitle,
        sd.OriginalFileName,
        sd.StoredDocumentTypeID
      FROM tblNewsItems n
      LEFT JOIN tblStoredDocuments sd 
        ON n.NewsBlobID = sd.BlobID 
        AND sd.StoredDocumentTypeID = 4
      ORDER BY n.NewsItemID
    `;

    const [newsItems, storedDocs, joined] = await Promise.all([
      executeQuery(newsItemsQuery),
      executeQuery(storedDocsQuery),
      executeQuery(joinedQuery),
    ]);

    // Test blob URLs
    const blobTests = await Promise.all(
      newsItems.map(async (item) => {
        const blobUrl = getBlobUrl(item.NewsBlobID);

        try {
          const response = await fetch(blobUrl, { method: "HEAD" });
          const contentType = response.headers.get("content-type");
          const contentDisposition = response.headers.get(
            "content-disposition"
          );

          return {
            blobId: item.NewsBlobID,
            exists: response.ok,
            status: response.status,
            contentType,
            contentDisposition,
            url: blobUrl,
          };
        } catch (error) {
          return {
            blobId: item.NewsBlobID,
            exists: false,
            error: error.message,
            url: blobUrl,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        newsItems: {
          count: newsItems.length,
          data: newsItems,
        },
        storedDocuments: {
          count: storedDocs.length,
          data: storedDocs,
        },
        joined: {
          count: joined.length,
          data: joined,
        },
        blobTests,
      },
      analysis: {
        question: "Compare N000002 (working) vs others (not working)",
        checkFor: [
          "Are NewsBlobID values correct in tblNewsItems?",
          "Are BlobID values matching in tblStoredDocuments?",
          "Do all blobs exist in Azure (check blobTests)?",
          "Do all blobs have correct Content-Type headers?",
          "Are OriginalFileName values correct?",
        ],
      },
    });
  } catch (error) {
    console.error("❌ Debug error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
