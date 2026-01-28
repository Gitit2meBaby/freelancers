// lib/blobProxy.js

/**
 * Get a proxied blob URL that routes through our API
 * This avoids CORS issues by fetching blobs server-side
 *
 * @param {string} blobId - The blob ID (e.g., "P000003", "C000003", "E000003")
 * @returns {string|null} - Proxied URL or null if no blobId
 */
export function getProxiedBlobUrl(blobId) {
  if (!blobId?.trim()) {
    return null;
  }

  // Route through our Next.js API instead of directly to Azure
  return `/api/blob/${blobId}`;
}

/**
 * Check if running on client side
 */
export function isClient() {
  return typeof window !== "undefined";
}
