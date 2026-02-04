/**
 * Azure Blob Storage Utility
 * Handles file uploads, downloads, and deletions using SAS token authentication
 *
 * BLOB ID NAMING CONVENTIONS (per Paul's instructions):
 * - News PDFs: N000001, N000002, N000003, N000004 (FIXED, never change)
 * - Freelancer Photos: P + FreelancerID padded to 6 digits (e.g., P000123)
 * - Freelancer CVs: C + FreelancerID padded to 6 digits (e.g., C000123)
 *
 * CRITICAL: These IDs are FIXED and never change. Azure Blob automatically
 * overwrites when you upload with the same blob ID. No deletion needed!
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
 * Document type IDs from tblStoredDocumentTypes
 */
export const STORED_DOCUMENT_TYPES = {
  SERVICE_COMPANY_LOGOS: 1,
  FREELANCER_PHOTOS: 2,
  FREELANCER_CVS: 3,
  NEWS_ITEMS: 4,
};

/**
 * Fixed News Blob IDs - these never change, only the content gets replaced
 */
export const NEWS_BLOB_IDS = {
  DRAMA_PRODUCTION_GRAPH: "N000001",
  TVC_PRODUCTION_REPORT: "N000002",
  CREW_NEWS: "N000003",
  DRAMA_PRODUCTION_REPORT: "N000004",
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
 * Generates a blob ID for freelancer photos
 * Format: P + FreelancerID padded to 6 digits
 * Example: FreelancerID 123 → P000123
 *
 * This ID is FIXED and never changes for a freelancer.
 * Azure Blob automatically overwrites when uploading with the same ID.
 *
 * @param {number} freelancerId - The freelancer's ID
 * @returns {string} Photo blob ID
 */
export function generatePhotoBlobId(freelancerId) {
  if (!freelancerId || typeof freelancerId !== "number") {
    throw new Error("Valid freelancerId required for photo blob ID");
  }

  // Pad to 6 digits: P000123
  return `P${String(freelancerId).padStart(6, "0")}`;
}

/**
 * Generates a blob ID for freelancer CVs
 * Format: C + FreelancerID padded to 6 digits
 * Example: FreelancerID 123 → C000123
 *
 * This ID is FIXED and never changes for a freelancer.
 * Azure Blob automatically overwrites when uploading with the same ID.
 *
 * @param {number} freelancerId - The freelancer's ID
 * @returns {string} CV blob ID
 */
export function generateCvBlobId(freelancerId) {
  if (!freelancerId || typeof freelancerId !== "number") {
    throw new Error("Valid freelancerId required for CV blob ID");
  }

  // Pad to 6 digits: C000123
  return `C${String(freelancerId).padStart(6, "0")}`;
}

/**
 * Validates and returns the news blob ID
 * News items have FIXED blob IDs that never change
 *
 * @param {number} newsItemId - The news item ID (1-4)
 * @returns {string} News blob ID (N000001-N000004)
 */
export function getNewsBlobId(newsItemId) {
  const newsIds = {
    1: NEWS_BLOB_IDS.DRAMA_PRODUCTION_GRAPH,
    2: NEWS_BLOB_IDS.TVC_PRODUCTION_REPORT,
    3: NEWS_BLOB_IDS.CREW_NEWS,
    4: NEWS_BLOB_IDS.DRAMA_PRODUCTION_REPORT,
  };

  const blobId = newsIds[newsItemId];

  if (!blobId) {
    throw new Error(`Invalid news item ID: ${newsItemId}. Must be 1-4.`);
  }

  return blobId;
}

/**
 * Generates a blob ID for freelancer equipment lists
 * Format: E + FreelancerID padded to 6 digits
 * Example: FreelancerID 123 → E000123
 *
 * This ID is FIXED and never changes for a freelancer.
 * Azure Blob automatically overwrites when uploading with the same ID.
 *
 * @param {number} freelancerId - The freelancer's ID
 * @returns {string} Equipment blob ID
 */
export function generateEquipmentBlobId(freelancerId) {
  if (!freelancerId || typeof freelancerId !== "number") {
    throw new Error("Valid freelancerId required for equipment blob ID");
  }

  // Pad to 6 digits: E000123
  return `E${String(freelancerId).padStart(6, "0")}`;
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
 * NOTE: You should rarely need this function since Azure Blob automatically
 * overwrites files with the same blob ID. Only use for cleanup/migration.
 *
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
 * @param {string} type - 'image', 'cv', 'equipment', or 'news-pdf'
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
    "news-pdf": {
      allowedTypes: ["application/pdf"],
      maxSize: 10 * 1024 * 1024, // 10MB
      errorMessage: "News PDF must be a PDF file and less than 10MB",
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
