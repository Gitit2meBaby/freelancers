// app/api/admin/upload-news/route.js
import { NextResponse } from "next/server";
import { uploadBlob } from "../../../lib/azureBlob";

const NEWS_BLOB_IDS = ["N000001", "N000002", "N000003", "N000004"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const blobId = formData.get("blobId");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    if (!blobId || !NEWS_BLOB_IDS.includes(blobId)) {
      return NextResponse.json(
        { success: false, error: "Invalid blob ID. Must be N000001–N000004." },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "File must be a PDF." },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File exceeds 10MB limit." },
        { status: 400 },
      );
    }

    const result = await uploadBlob(file, blobId, "application/pdf");

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    console.log(`✅ Admin uploaded news PDF: ${blobId}`);

    return NextResponse.json({ success: true, blobId, url: result.url });
  } catch (error) {
    console.error("❌ Admin news upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Upload failed" },
      { status: 500 },
    );
  }
}
