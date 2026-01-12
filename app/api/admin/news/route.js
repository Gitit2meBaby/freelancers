// app/api/news/route.js
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { executeQuery, VIEWS } from "../../../lib/db";
import { getBlobUrl } from "../../../lib/azureBlob";

/**
 * Cached function to get all active news items
 */
const getActiveNewsItems = unstable_cache(
  async () => {
    console.log("📰 Fetching news items from database...");

    const query = `
      SELECT 
        NewsItemID,
        Title,
        Description,
        PDFBlobID,
        PDFFileName,
        PublishDate
      FROM ${VIEWS.NEWS_ITEMS}
      ORDER BY PublishDate DESC
    `;

    const results = await executeQuery(query);
    console.log(`✅ Retrieved ${results.length} news items`);

    return results.map((item) => ({
      id: item.NewsItemID,
      title: item.Title,
      description: item.Description,
      pdfUrl: getBlobUrl(item.PDFBlobID),
      pdfFileName: item.PDFFileName,
      publishDate: item.PublishDate,
    }));
  },
  ["news-items"],
  {
    revalidate: 3600, // Cache for 1 hour
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
