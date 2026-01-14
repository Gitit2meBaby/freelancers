// app/api/news/route.js - WORKING VERSION
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { executeQuery } from "../../lib/db";
import { getBlobUrl } from "../../lib/azureBlob";

/**
 * Cached function to get all active news items
 */
const getActiveNewsItems = unstable_cache(
  async () => {
    // Query tables directly - only columns we know exist
    const query = `
      SELECT 
        n.NewsItemID,
        n.NewsItem,
        n.NewsBlobID,
        sd.DocumentTitle,
        sd.OriginalFileName
      FROM tblNewsItems n
      LEFT JOIN tblStoredDocuments sd 
        ON n.NewsBlobID = sd.BlobID 
        AND sd.StoredDocumentTypeID = 4
      ORDER BY n.NewsItemID
    `;

    const results = await executeQuery(query);

    return results.map((item) => ({
      id: item.NewsItemID,
      title: item.NewsItem,
      pdfUrl: item.NewsBlobID ? getBlobUrl(item.NewsBlobID) : null,
      pdfFileName: item.OriginalFileName,
      blobId: item.NewsBlobID,
    }));
  },
  ["news-items"],
  {
    revalidate: 3600,
    tags: ["news"],
  }
);

/**
 * GET /api/news
 * Returns all active news items for public display
 */
export async function GET() {
  try {
    const newsItems = await getActiveNewsItems();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cached: true,
      data: newsItems,
      count: newsItems.length,
    });
  } catch (error) {
    console.error("❌ Error fetching news items:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
