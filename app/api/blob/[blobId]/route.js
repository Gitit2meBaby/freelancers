// app/api/blob/[blobId]/route.js - FIXED VERSION
// This route proxies Azure Blob Storage requests through Next.js
// Fixes the missing .pdf extension issue by adding Content-Disposition header

import { NextResponse } from "next/server";
import { getBlobUrl } from "../../../lib/azureBlob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Determines the appropriate filename based on blob ID prefix
 * @param {string} blobId - The blob ID (e.g., "C000003", "E000007", "P000123")
 * @returns {string} Appropriate filename with extension
 */
function getFilenameFromBlobId(blobId) {
  const prefix = blobId.charAt(0).toUpperCase();

  switch (prefix) {
    case "C":
      return `CV-${blobId}.pdf`; // CV PDFs
    case "E":
      return `Equipment-List-${blobId}.pdf`; // Equipment List PDFs
    default:
      return `download-${blobId}`; // Fallback
  }
}

/**
 * GET /api/blob/[blobId]
 * Fetches a blob from Azure Blob Storage and serves it with proper headers
 */
export async function GET(request, { params }) {
  try {
    const { blobId } = await params;

    if (!blobId) {
      return NextResponse.json(
        { success: false, error: "Blob ID is required" },
        { status: 400 },
      );
    }

    // Get the blob URL with SAS token
    const blobUrl = getBlobUrl(blobId);

    if (!blobUrl) {
      return NextResponse.json(
        { success: false, error: "Failed to generate blob URL" },
        { status: 500 },
      );
    }

    // Fetch the blob from Azure
    const response = await fetch(blobUrl, {
      method: "GET",
    });

    if (!response.ok) {
      console.error(`❌ Blob fetch failed: ${response.status}`);
      return NextResponse.json(
        { success: false, error: `Blob not found: ${response.status}` },
        { status: response.status },
      );
    }

    // Get the blob data and content type
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType =
      response.headers.get("Content-Type") || "application/octet-stream";

    // Generate appropriate filename based on blob ID
    const filename = getFilenameFromBlobId(blobId);

    // CRITICAL FIX: Add Content-Disposition header
    // This tells the browser what filename and extension to use when downloading
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`, // ✅ This fixes the extension issue!
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("❌ Blob proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch blob" },
      { status: 500 },
    );
  }
}

/**
 * HEAD /api/blob/[blobId]
 * Check if a blob exists without downloading it
 */
export async function HEAD(request, { params }) {
  try {
    const { blobId } = await params;

    if (!blobId) {
      return new NextResponse(null, { status: 400 });
    }

    const blobUrl = getBlobUrl(blobId);

    if (!blobUrl) {
      return new NextResponse(null, { status: 500 });
    }

    const response = await fetch(blobUrl, {
      method: "HEAD",
    });

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const contentType =
      response.headers.get("Content-Type") || "application/octet-stream";
    const contentLength = response.headers.get("Content-Length") || "0";
    const filename = getFilenameFromBlobId(blobId);

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": contentLength,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("❌ HEAD request error:", error);
    return new NextResponse(null, { status: 500 });
  }
}
