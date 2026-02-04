// app/api/upload-blob/route.js - WITH EQUIPMENT SUPPORT
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import {
  uploadBlob,
  validateFile,
  generatePhotoBlobId,
  generateCvBlobId,
  generateEquipmentBlobId,
} from "../../lib/azureBlob";

/**
 * POST /api/upload-blob
 * Handles file uploads to Azure Blob Storage
 *
 * CRITICAL: Blob IDs are FIXED based on FreelancerID:
 * - Photos: P000123 (P + FreelancerID padded to 6 digits)
 * - CVs: C000123 (C + FreelancerID padded to 6 digits)
 * - Equipment: E000123 (E + FreelancerID padded to 6 digits)
 *
 * Azure Blob automatically OVERWRITES when uploading with same blob ID
 * NO DELETION needed - just upload with the correct blob ID!
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const freelancerId = parseInt(session.user.id);
    const formData = await request.formData();

    const file = formData.get("file");
    const type = formData.get("type");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    // UPDATED: Now accepts 'photo', 'cv', OR 'equipment'
    if (!type || !["photo", "cv", "equipment"].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid type. Must be 'photo', 'cv', or 'equipment'",
        },
        { status: 400 },
      );
    }

    // Validate file based on type
    const validationType = type === "photo" ? "image" : "cv"; // Both cv and equipment use PDF validation
    const validation = validateFile(file, validationType);

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    // Generate FIXED blob ID based on FreelancerID and type
    let blobId;

    if (type === "photo") {
      blobId = generatePhotoBlobId(freelancerId); // P000123
    } else if (type === "cv") {
      blobId = generateCvBlobId(freelancerId); // C000123
    } else if (type === "equipment") {
      blobId = generateEquipmentBlobId(freelancerId); // E000123
    }

    console.log(
      `🔵 Uploading ${type} for freelancer ${freelancerId} as blob ID: ${blobId}`,
    );

    // Upload to Azure Blob
    // Azure will automatically OVERWRITE if this blob ID already exists
    const result = await uploadBlob(file, blobId, file.type);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    console.log(`✅ Successfully uploaded ${type} - Blob ID: ${blobId}`);

    return NextResponse.json({
      success: true,
      blobId: blobId,
      url: result.url,
      message: `${type === "photo" ? "Photo" : type === "cv" ? "CV" : "Equipment list"} uploaded successfully`,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Upload failed",
      },
      { status: 500 },
    );
  }
}
