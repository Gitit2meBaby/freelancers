// app/api/tests/test-blob-write/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { blobConfig } from "../../../lib/azureBlob";

/**
 * POST /api/test-blob-write
 * Tests if we can actually write to Azure Blob Storage
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const testBlobId = `test-write-${Date.now()}.txt`;
    const testContent = "Test content from news upload test";

    console.log("🧪 Testing blob write permissions...");
    console.log("Test blob ID:", testBlobId);

    // Try to write a test blob
    const uploadUrl = `${blobConfig.baseUrl}/${testBlobId}?${blobConfig.sasToken}`;

    console.log(
      "Upload URL (without token):",
      `${blobConfig.baseUrl}/${testBlobId}`
    );

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": "text/plain",
        "Content-Length": testContent.length.toString(),
      },
      body: testContent,
    });

    const responseText = await uploadResponse.text();

    if (!uploadResponse.ok) {
      console.error("❌ Upload failed:", uploadResponse.status, responseText);

      return NextResponse.json({
        success: false,
        error: "Upload failed",
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        response: responseText,
        diagnosis:
          uploadResponse.status === 403
            ? "SAS token lacks WRITE permission"
            : "Other upload error",
      });
    }

    console.log("✅ Upload succeeded!");

    // Try to read it back
    const readUrl = `${blobConfig.baseUrl}/${testBlobId}?${blobConfig.sasToken}`;
    const readResponse = await fetch(readUrl);
    const readContent = await readResponse.text();

    const verified = readContent === testContent;

    // Try to delete it
    const deleteUrl = `${blobConfig.baseUrl}/${testBlobId}?${blobConfig.sasToken}`;
    const deleteResponse = await fetch(deleteUrl, { method: "DELETE" });

    return NextResponse.json({
      success: true,
      test: {
        blobId: testBlobId,
        uploaded: uploadResponse.ok,
        uploadStatus: uploadResponse.status,
        readBack: readResponse.ok,
        contentMatches: verified,
        deleted: deleteResponse.ok,
      },
      message: "Azure blob write permissions are working correctly!",
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
