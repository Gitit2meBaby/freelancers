// proxy.js  (project root — next to package.json, NOT inside app/)
//
// FIX (2026-04-10): Renamed from middleware.js to proxy.js per Next.js 16
// deprecation. Function name updated from `middleware` to `proxy`. All logic
// is identical — only the file name and export name have changed.
//
// FIX (2026-04-12): Added rate limiting for auth and contact routes.
// Previously only data routes (crew-directory, freelancer API, blob) were
// covered. Bots hammering /api/auth/callback/credentials hit the SQL DB on
// every attempt with no proxy layer in the way. /api/contact and
// /api/new-job were also completely unthrottled.
//
// Rate limits (conservative for a B1 single-core plan):
//   - Data routes (/crew-directory, /screen-services, /api/freelancer, /api/blob):
//     60 requests per minute per IP  — unchanged
//   - Form submission routes (/api/contact, /api/new-job):
//     10 requests per minute per IP  — a human submitting a form 10x/min is a bot
//   - Login (/api/auth/callback/credentials):
//     10 requests per minute per IP  — stops credential stuffing before DB is hit
//   - Forgot-password (/api/auth/forgot-password):
//     5 requests per minute per IP   — tighter; no legitimate user needs more

import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WINDOW_MS = 60_000; // 1 minute sliding window (all route groups)

const LIMITS = {
  data: 60, // /crew-directory, /screen-services, /api/freelancer, /api/blob
  form: 10, // /api/contact, /api/new-job
  login: 10, // /api/auth/callback/credentials
  forgotPassword: 5, // /api/auth/forgot-password
};

// ---------------------------------------------------------------------------
// In-memory store
// Map<key, { count: number, windowStart: number }>
// Key format: "<ip>:<route-group>" — separate counters per group per IP.
// Cleaned on every request; map never grows larger than unique IPs × groups
// active within one window.
// ---------------------------------------------------------------------------

const store = new Map();

/**
 * Prunes expired entries. Called on every request so the map stays bounded.
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
 * Returns true if the request is within limit, false if exceeded.
 * Increments the counter on every call.
 */
function checkRateLimit(key, limit) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now });
    return true;
  }

  entry.count += 1;
  return entry.count <= limit;
}

/**
 * Extracts the real client IP.
 * Azure App Service forwards it in x-forwarded-for.
 */
function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * Returns the route group name and its limit for rate-limiting purposes,
 * or null if the path should not be rate-limited.
 */
function getRouteGroup(pathname, method) {
  // Login — POST only (GET is the NextAuth session check, don't limit that)
  if (pathname === "/api/auth/callback/credentials" && method === "POST") {
    return { group: "login", limit: LIMITS.login };
  }

  // Forgot-password
  if (pathname === "/api/auth/forgot-password" && method === "POST") {
    return { group: "forgotPassword", limit: LIMITS.forgotPassword };
  }

  // Contact and new-job form submissions
  if (
    (pathname === "/api/contact" || pathname === "/api/new-job") &&
    method === "POST"
  ) {
    return { group: "form", limit: LIMITS.form };
  }

  // Data routes — the original coverage, unchanged
  if (
    pathname.startsWith("/crew-directory") ||
    pathname.startsWith("/screen-services") ||
    pathname.startsWith("/api/freelancer") ||
    pathname.startsWith("/api/blob")
  ) {
    return { group: "data", limit: LIMITS.data };
  }

  return null; // not rate-limited
}

// ---------------------------------------------------------------------------
// Proxy function
// ---------------------------------------------------------------------------

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  const routeInfo = getRouteGroup(pathname, method);

  if (!routeInfo) {
    return NextResponse.next();
  }

  pruneExpired();

  const ip = getClientIp(request);
  const key = `${ip}:${routeInfo.group}`;
  const allowed = checkRateLimit(key, routeInfo.limit);

  if (!allowed) {
    console.warn(
      `⚠️ Rate limit exceeded: ${ip} on ${pathname} (group: ${routeInfo.group})`,
    );

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
          "X-RateLimit-Limit": String(routeInfo.limit),
          "X-RateLimit-Window": "60s",
        },
      },
    );
  }

  return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Matcher — tell Next.js which paths to run this proxy on.
// Excludes _next internals, static files, images, and favicon automatically
// via the negative lookahead in the default Next.js behaviour, but we also
// list paths explicitly so the intent is clear.
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    // Original data routes
    "/crew-directory/:path*",
    "/screen-services/:path*",
    "/api/freelancer/:path*",
    "/api/blob/:path*",
    // Form submission routes — added 2026-04-12
    "/api/contact",
    "/api/new-job",
    // Auth routes — added 2026-04-12
    "/api/auth/callback/credentials",
    "/api/auth/forgot-password",
  ],
};
