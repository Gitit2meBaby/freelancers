// lib/blobProxy.js

import { getBlobUrl } from "./azureBlob";

/**
 * Returns a direct Azure Blob Storage URL for the given blob ID.
 * Previously this returned a proxied /api/blob/${blobId} path which routed
 * all image bytes through the Node process, causing CPU saturation on the
 * single-core App Service plan.
 *
 * CORS is fully configured on the Azure storage account for both
 * localhost:3000 and freelancers.com.au — direct URLs work fine from
 * the browser and do not require a server-side proxy.
 */
export function getProxiedBlobUrl(blobId) {
  if (!blobId?.trim()) return null;
  return getBlobUrl(blobId);
}

/**
 * Check if running on client side
 */
export function isClient() {
  return typeof window !== "undefined";
}
