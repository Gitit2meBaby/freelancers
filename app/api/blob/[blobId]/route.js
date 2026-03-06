// app/api/blob/[blobId]/route.js
// Proxies Azure Blob Storage requests through Next.js.
// Changes from previous version:
//   1. Photos (P prefix) now served with disposition: inline so <img> tags render them
//   2. Cache-Control changed from immutable/1yr to 60s for photos, 1hr for documents.
//      Blob IDs never change on upload so immutable caching guarantees stale images.

import { NextResponse } from "next/server";
import { getBlobUrl } from "../../../lib/azureBlob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns Content-Disposition and cache behaviour based on blob ID prefix.
 * Photos must be inline — attachment disposition breaks <img> rendering.
 */
function getBlobMeta(blobId) {
  const prefix = blobId.charAt(0).toUpperCase();
  switch (prefix) {
    case "P":
      return {
        disposition: "inline",
        filename: `photo-${blobId}.jpg`,
        isPhoto: true,
      };
    case "C":
      return {
        disposition: "attachment",
        filename: `CV-${blobId}.pdf`,
        isPhoto: false,
      };
    case "E":
      return {
        disposition: "attachment",
        filename: `Equipment-List-${blobId}.pdf`,
        isPhoto: false,
      };
    default:
      return {
        disposition: "attachment",
        filename: `download-${blobId}`,
        isPhoto: false,
      };
  }
}

/**
 * GET /api/blob/[blobId]
 * Fetches a blob from Azure Blob Storage and serves it with proper headers.
 */
export async function GET(request, { params }) {
  try {
    const { blobId } = await params;

    const VALID_BLOB_ID = /^[PCEN]\d{6}$/;
    if (!blobId || !VALID_BLOB_ID.test(blobId)) {
      return NextResponse.json(
        { success: false, error: "Invalid blob ID" },
        { status: 400 },
      );
    }

    if (!blobId) {
      return NextResponse.json(
        { success: false, error: "Blob ID is required" },
        { status: 400 },
      );
    }

    const blobUrl = getBlobUrl(blobId);

    if (!blobUrl) {
      return NextResponse.json(
        { success: false, error: "Failed to generate blob URL" },
        { status: 500 },
      );
    }

    const response = await fetch(blobUrl, { method: "GET" });

    if (!response.ok) {
      console.error(`❌ Blob fetch failed: ${response.status}`);
      return NextResponse.json(
        { success: false, error: `Blob not found: ${response.status}` },
        { status: response.status },
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType =
      response.headers.get("Content-Type") || "application/octet-stream";

    const { disposition, filename, isPhoto } = getBlobMeta(blobId);

    // Short TTL for photos because blob IDs are fixed — the same URL is reused
    // when a freelancer uploads a new photo. Immutable caching at a fixed URL
    // means visitors never see the updated image until their cache expires.
    const cacheControl = isPhoto
      ? "public, max-age=60, must-revalidate"
      : "public, max-age=3600, must-revalidate";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": cacheControl,
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
 * Check if a blob exists without downloading it.
 */
export async function HEAD(request, { params }) {
  try {
    const { blobId } = await params;

    const VALID_BLOB_ID = /^[PCEN]\d{6}$/;
    if (!blobId || !VALID_BLOB_ID.test(blobId)) {
      return NextResponse.json(
        { success: false, error: "Invalid blob ID" },
        { status: 400 },
      );
    }
    if (!blobId) {
      return new NextResponse(null, { status: 400 });
    }

    const blobUrl = getBlobUrl(blobId);

    if (!blobUrl) {
      return new NextResponse(null, { status: 500 });
    }

    const response = await fetch(blobUrl, { method: "HEAD" });

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const contentType =
      response.headers.get("Content-Type") || "application/octet-stream";
    const contentLength = response.headers.get("Content-Length") || "0";
    const { disposition, filename, isPhoto } = getBlobMeta(blobId);

    const cacheControl = isPhoto
      ? "public, max-age=60, must-revalidate"
      : "public, max-age=3600, must-revalidate";

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Content-Length": contentLength,
        "Cache-Control": cacheControl,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("❌ HEAD request error:", error);
    return new NextResponse(null, { status: 500 });
  }
}
