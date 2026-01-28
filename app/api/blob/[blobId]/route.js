// app/api/blob/[blobId]/route.js
import { NextResponse } from "next/server";
import { getBlobUrl } from "../../../lib/azureBlob";

/**
 * Determine filename based on blob ID prefix
 * C = CV (pdf), E = Equipment (pdf), P = Photo (display only, no download)
 */
function getFilenameFromBlobId(blobId) {
  const prefix = blobId.charAt(0).toUpperCase();

  switch (prefix) {
    case "C":
      return `CV-${blobId}.pdf`;
    case "E":
      return `equipment-list-${blobId}.pdf`;
    case "P":
      // Photos are for display only, but return original blob ID
      return blobId;
    default:
      return `download-${blobId}.pdf`;
  }
}

/**
 * Determine if this blob should be downloadable (vs display inline)
 */
function isDownloadable(blobId) {
  const prefix = blobId.charAt(0).toUpperCase();
  // Only CVs and Equipment lists are downloadable
  return prefix === "C" || prefix === "E";
}

/**
 * Proxy Azure Blob requests to avoid CORS issues
 *
 * Supports both GET (download/display) and HEAD (check existence) methods
 * - Photos (P): Display inline in browser
 * - CVs (C): Download as PDF
 * - Equipment (E): Download as PDF
 */
export async function GET(request, { params }) {
  try {
    const { blobId } = await params;

    if (!blobId) {
      return NextResponse.json(
        { error: "Blob ID is required" },
        { status: 400 },
      );
    }

    // Get the Azure Blob URL with SAS token
    const blobUrl = getBlobUrl(blobId);

    if (!blobUrl) {
      return NextResponse.json({ error: "Invalid blob ID" }, { status: 404 });
    }

    // Fetch the blob from Azure
    const response = await fetch(blobUrl);

    if (!response.ok) {
      console.error(`❌ Failed to fetch blob ${blobId}: ${response.status}`);
      return NextResponse.json(
        { error: "Failed to fetch blob from storage" },
        { status: response.status },
      );
    }

    console.log(`✅ Successfully fetched blob ${blobId}`);

    // Get the blob data
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get content type from Azure response
    const contentType =
      response.headers.get("content-type") || "application/pdf";

    // Determine headers based on blob type
    const downloadable = isDownloadable(blobId);
    const filename = getFilenameFromBlobId(blobId);

    const headers = {
      "Content-Type": contentType,
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    };

    // Only add Content-Disposition for downloadable files (CV, Equipment)
    if (downloadable) {
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
      console.log(`📄 Serving blob ${blobId} as download: "${filename}"`);
    } else {
      // Photos display inline in browser
      headers["Content-Disposition"] = "inline";
      console.log(`🖼️  Serving blob ${blobId} for display (${contentType})`);
    }

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("❌ Error proxying blob:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * HEAD method for checking blob existence without downloading
 * More efficient than GET for validation
 */
export async function HEAD(request, { params }) {
  try {
    const { blobId } = await params;

    if (!blobId) {
      return new NextResponse(null, { status: 400 });
    }

    // Get the Azure Blob URL with SAS token
    const blobUrl = getBlobUrl(blobId);

    if (!blobUrl) {
      return new NextResponse(null, { status: 404 });
    }

    // Check if blob exists using HEAD request (doesn't download content)
    const response = await fetch(blobUrl, { method: "HEAD" });

    if (!response.ok) {
      console.error(`❌ Blob ${blobId} not found: ${response.status}`);
      return new NextResponse(null, { status: response.status });
    }

    console.log(`✅ Blob ${blobId} exists`);

    const contentType =
      response.headers.get("content-type") || "application/pdf";
    const downloadable = isDownloadable(blobId);
    const filename = getFilenameFromBlobId(blobId);

    const headers = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    };

    if (downloadable) {
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    } else {
      headers["Content-Disposition"] = "inline";
    }

    return new NextResponse(null, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("❌ Error checking blob:", error);
    return new NextResponse(null, { status: 500 });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
