/**
 * Azure Blob Storage Utility
 * Handles file uploads, downloads, and deletions using SAS token authentication
 */

/**
 * Azure Blob Storage Configuration
 * Using SAS (Shared Access Signature) for secure access
 */
export const blobConfig = {
  accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
  containerName: process.env.AZURE_BLOB_CONTAINER_NAME,
  sasToken: process.env.AZURE_BLOB_SAS_TOKEN,
  baseUrl: process.env.AZURE_BLOB_BASE_URL,
  sasUrl: process.env.AZURE_BLOB_SAS_URL,
};

/**
 * Constructs a blob URL with SAS token
 * @param {string} blobId - The blob identifier
 * @returns {string} Full URL to access the blob
 */
export function getBlobUrl(blobId) {
  if (!blobId) return null;

  // Construct URL: https://account.blob.core.windows.net/container/blobId?sasToken
  return `${blobConfig.baseUrl}/${blobId}?${blobConfig.sasToken}`;
}

/**
 * Constructs a public blob URL without SAS token (for verified/public files)
 * Note: This will only work if the container has public read access
 * @param {string} blobId - The blob identifier
 * @returns {string} Public URL to access the blob
 */
export function getPublicBlobUrl(blobId) {
  if (!blobId) return null;

  return `${blobConfig.baseUrl}/${blobId}`;
}

/**
 * Uploads a file to Azure Blob Storage
 * @param {File|Buffer} file - The file to upload
 * @param {string} blobId - The blob identifier (name in storage)
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<{success: boolean, blobId: string, url: string}>}
 */
export async function uploadBlob(file, blobId, contentType) {
  try {
    // Convert File to ArrayBuffer if needed
    let fileData;
    if (file instanceof File) {
      fileData = await file.arrayBuffer();
    } else if (Buffer.isBuffer(file)) {
      fileData = file;
    } else {
      throw new Error("Invalid file type");
    }

    // Construct the upload URL
    const uploadUrl = `${blobConfig.baseUrl}/${blobId}?${blobConfig.sasToken}`;

    // Upload using REST API
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": contentType,
        "Content-Length": fileData.byteLength || fileData.length,
      },
      body: fileData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Blob upload failed: ${response.status} - ${errorText}`);
    }

    return {
      success: true,
      blobId,
      url: getBlobUrl(blobId),
    };
  } catch (error) {
    console.error("Error uploading blob:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Downloads a file from Azure Blob Storage
 * @param {string} blobId - The blob identifier
 * @returns {Promise<{success: boolean, data: ArrayBuffer, contentType: string}>}
 */
export async function downloadBlob(blobId) {
  try {
    const blobUrl = getBlobUrl(blobId);

    const response = await fetch(blobUrl, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Blob download failed: ${response.status}`);
    }

    const data = await response.arrayBuffer();
    const contentType = response.headers.get("Content-Type");

    return {
      success: true,
      data,
      contentType,
    };
  } catch (error) {
    console.error("Error downloading blob:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Deletes a file from Azure Blob Storage
 * @param {string} blobId - The blob identifier
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteBlob(blobId) {
  try {
    const deleteUrl = `${blobConfig.baseUrl}/${blobId}?${blobConfig.sasToken}`;

    const response = await fetch(deleteUrl, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 404) {
      // 404 is acceptable - blob doesn't exist
      throw new Error(`Blob deletion failed: ${response.status}`);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting blob:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Checks if a blob exists in Azure Blob Storage
 * @param {string} blobId - The blob identifier
 * @returns {Promise<boolean>}
 */
export async function blobExists(blobId) {
  try {
    const blobUrl = getBlobUrl(blobId);

    const response = await fetch(blobUrl, {
      method: "HEAD",
    });

    return response.ok;
  } catch (error) {
    console.error("Error checking blob existence:", error);
    return false;
  }
}

/**
 * Validates file type and size
 * @param {File} file - The file to validate
 * @param {string} type - 'image', 'cv', or 'equipment'
 * @returns {{valid: boolean, error?: string}}
 */
export function validateFile(file, type) {
  const limits = {
    image: {
      maxSize: parseInt(process.env.MAX_FILE_SIZE_IMAGE || "2097152"), // 2MB
      allowedTypes: process.env.ALLOWED_IMAGE_TYPES?.split(",") || [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
      ],
    },
    cv: {
      maxSize: parseInt(process.env.MAX_FILE_SIZE_CV || "2621440"), // 2.5MB
      allowedTypes: process.env.ALLOWED_DOCUMENT_TYPES?.split(",") || [
        "application/pdf",
      ],
    },
    equipment: {
      maxSize: parseInt(process.env.MAX_FILE_SIZE_EQUIPMENT || "2097152"), // 2MB
      allowedTypes: process.env.ALLOWED_DOCUMENT_TYPES?.split(",") || [
        "application/pdf",
      ],
    },
  };

  const limit = limits[type];

  if (!limit) {
    return { valid: false, error: "Invalid file type category" };
  }

  // Check file size
  if (file.size > limit.maxSize) {
    const maxSizeMB = (limit.maxSize / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  // Check file type
  if (!limit.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${
        file.type
      } not allowed. Allowed types: ${limit.allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Generates a clean blob ID from filename
 * @param {string} filename - Original filename
 * @param {string} prefix - Optional prefix (e.g., 'photo', 'cv')
 * @returns {string} Clean blob ID
 */
export function generateBlobId(filename, prefix = "") {
  const timestamp = Date.now();
  const cleanName = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "");

  return prefix
    ? `${prefix}-${timestamp}-${cleanName}`
    : `${timestamp}-${cleanName}`;
}
