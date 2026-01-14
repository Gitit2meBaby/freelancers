// app/api/check-blob-headers/route.js
import { NextResponse } from "next/server";
import { getBlobUrl } from "../../lib/azureBlob";

/**
 * GET /api/check-blob-headers?blobId=N000001
 * Checks the actual HTTP headers returned by Azure for a blob
 */
export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const blobId = searchParams.get("blobId");

    if (!blobId) {
      return NextResponse.json(
        { success: false, error: "blobId required" },
        { status: 400 }
      );
    }

    const blobUrl = getBlobUrl(blobId);

    // Fetch the blob and capture all headers
    const response = await fetch(blobUrl, { method: "HEAD" });

    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return NextResponse.json({
      success: true,
      blobId,
      blobUrl,
      status: response.status,
      statusText: response.statusText,
      headers,
      critical: {
        "content-type": headers["content-type"],
        "content-disposition": headers["content-disposition"],
        "x-ms-blob-content-type": headers["x-ms-blob-content-type"],
      },
    });
  } catch (error) {
    console.error("❌ Error checking headers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
