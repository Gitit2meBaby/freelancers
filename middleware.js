// middleware.js  (project root — next to package.json, NOT inside app/)
//
// Rate limits the data-heavy routes that trigger ODBC queries and Azure Blob
// fetches. A crawler hammering /crew-directory/ or /screen-services/ is enough
// to saturate CPU on a single-core B1 App Service plan.
//
// Implementation notes for Azure App Service:
//   - Plain JS (no TypeScript) — avoids transpilation edge cases on Azure
//   - In-memory store only — no Redis dependency, no external service
//   - Memory is per-instance so limits are per-worker, not global.
//     That is fine here: the goal is preventing any single worker from
//     being overwhelmed, not enforcing a global rate across a cluster.
//   - The in-memory map is cleaned up on every request to prevent unbounded
//     growth on long-running instances.
//
// Limits (conservative for a B1 plan):
//   - Data routes (/crew-directory, /screen-services, /api/*):
//     60 requests per minute per IP
//   - Static assets and auth routes: not rate-limited
//
// To adjust limits, change WINDOW_MS and MAX_REQUESTS below.

import { NextResponse } from "next/server";

const WINDOW_MS = 60_000; // 1 minute sliding window
const MAX_REQUESTS = 60; // requests per window per IP on data routes

// In-memory store: Map<ip, { count: number, windowStart: number }>
// Cleaned on every request — only entries older than WINDOW_MS are pruned,
// so the map never grows larger than the number of unique IPs in one window.
const store = new Map();

/**
 * Prunes store entries that have expired. Called on every request so the
 * map size stays bounded without needing a background interval.
 */
function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS) {
      store.delete(key);
    }
  }
}

/**
 * Returns true if the request is within the rate limit, false if exceeded.
 * Increments the counter for the given key on every call.
 */
function checkRateLimit(key) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    return true;
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return false;
  }

  return true;
}

/**
 * Returns true for paths that should be rate-limited.
 * Scoped to routes that perform database queries or blob fetches.
 * Static files, auth, and health checks are excluded.
 */
function isDataRoute(pathname) {
  return (
    pathname.startsWith("/crew-directory") ||
    pathname.startsWith("/screen-services") ||
    pathname.startsWith("/api/freelancer") ||
    pathname.startsWith("/api/blob")
  );
}

/**
 * Extracts the best available IP from the request headers.
 * Azure App Service forwards the real client IP in x-forwarded-for.
 */
function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; take the first (client) IP
    return forwarded.split(",")[0].trim();
  }
  // Fallback — not reliable in production but better than nothing
  return request.headers.get("x-real-ip") || "unknown";
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only apply to data-heavy routes
  if (!isDataRoute(pathname)) {
    return NextResponse.next();
  }

  pruneExpired();

  const ip = getClientIp(request);
  const key = `${ip}:${pathname.split("/")[1]}`; // group by top-level route

  const allowed = checkRateLimit(key);

  if (!allowed) {
    console.warn(`⚠️ Rate limit exceeded: ${ip} on ${pathname}`);

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Too many requests. Please try again in a moment.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Window": "60s",
        },
      },
    );
  }

  return NextResponse.next();
}

// Tell Next.js which paths this middleware should run on.
// Excludes _next internals, static files, images, and favicon.
export const config = {
  matcher: [
    "/crew-directory/:path*",
    "/screen-services/:path*",
    "/api/freelancer/:path*",
    "/api/blob/:path*",
  ],
};
