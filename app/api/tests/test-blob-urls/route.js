// app/api/test-blob-urls/route.js
import { NextResponse } from "next/server";
import { getBlobUrl } from "../../../lib/azureBlob";

/**
 * GET /api/test-blob-urls
 * Test what getBlobUrl actually returns for news blob IDs
 */
export async function GET() {
  try {
    const testBlobIds = ["N000001", "N000002", "N000003", "N000004"];

    const results = testBlobIds.map((blobId) => {
      const baseUrl = getBlobUrl(blobId);
      const fileName = "National-Graph_29Sep25.pdf";
      const encodedFilename = encodeURIComponent(fileName);
      const separator = baseUrl.includes("?") ? "&" : "?";

      const enhancedUrl = `${baseUrl}${separator}response-content-disposition=inline;filename="${encodedFilename}"&response-content-type=application/pdf`;

      return {
        blobId,
        baseUrl,
        hasQueryString: baseUrl.includes("?"),
        separator,
        enhancedUrl,
        urlLength: enhancedUrl.length,
      };
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: results,
      notes: {
        message: "Check if baseUrl already has query string (SAS token?)",
        expectedSeparator:
          "If baseUrl has '?', separator should be '&', otherwise '?'",
      },
    });
  } catch (error) {
    console.error("❌ Test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
