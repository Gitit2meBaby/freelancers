// app/api/blob/[blobId]/route.js
// Proxies Azure Blob Storage requests through Next.js.
//
// PHOTO CHANGE: Photos (P prefix) are now served via a 302 redirect to the
// direct Azure URL rather than buffering through Node. blobProxy.js already
// returns direct Azure URLs, so this route should only be hit by cached links
// or direct navigation. Redirecting photos means Node never touches image bytes,
// eliminating the CPU bottleneck that caused the April 2026 outage.
//
// DOCUMENT CHANGE: CVs (C prefix) and Equipment Lists (E prefix) are still
// buffered through Node because they use Content-Disposition: attachment with
// a meaningful filename — that header must be set server-side.

import { NextResponse } from "next/server";
import { getBlobUrl } from "../../../lib/azureBlob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns Content-Disposition and cache behaviour based on blob ID prefix.
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
 * Photos: 302 redirect to Azure — Node never buffers image bytes.
 * Documents: Fetched and returned with Content-Disposition: attachment so the
 *            browser saves the file with a meaningful filename.
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

    const blobUrl = getBlobUrl(blobId);

    if (!blobUrl) {
      return NextResponse.json(
        { success: false, error: "Failed to generate blob URL" },
        { status: 500 },
      );
    }

    const { isPhoto } = getBlobMeta(blobId);

    // Photos: redirect directly to Azure — removes Node from the image path entirely.
    // The SAS URL already carries the correct content-type and CORS headers.
    if (isPhoto) {
      return NextResponse.redirect(blobUrl);
    }

    // Documents: buffer through Node so we can set Content-Disposition: attachment
    // with a human-readable filename (CV-C000123.pdf, Equipment-List-E000456.pdf).
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

    const { disposition, filename } = getBlobMeta(blobId);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=3600, must-revalidate",
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
