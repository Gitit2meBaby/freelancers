// app/api/upload-blob/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { uploadBlob, validateFile, generateBlobId } from "../../lib/azureBlob";

/**
 * POST /api/upload-blob
 * Uploads a file to Azure Blob Storage
 * Requires authentication
 */
export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file");
    const blobId = formData.get("blobId");
    const fileType = formData.get("type"); // 'image', 'cv', or 'equipment'

    if (!file || !blobId) {
      return NextResponse.json(
        { success: false, error: "File and blobId are required" },
        { status: 400 }
      );
    }

    // Validate file type and size
    const validation = validateFile(file, fileType || "image");
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Upload to Azure Blob Storage
    const result = await uploadBlob(file, blobId, file.type);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Upload failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      blobId: result.blobId,
      url: result.url,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
