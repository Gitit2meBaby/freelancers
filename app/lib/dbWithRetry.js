// lib/dbWithRetry.js
//
// Exponential backoff wrapper around executeQuery from db.js.
//
// WHY THIS EXISTS:
// Without backoff, any transient DB blip causes every in-flight request to
// retry immediately and simultaneously. On a single-core B1 plan, 50 concurrent
// requests retrying at the same instant is enough to saturate the CPU.
//
// This file wraps executeQuery with 2 retries:
//   Attempt 1: immediate
//   Attempt 2: ~200ms + jitter (0-100ms)
//   Attempt 3: ~400ms + jitter (0-100ms)
//
// The jitter prevents a "thundering herd" — if 50 requests all fail at the same
// instant, their retries are spread across a ~500ms window rather than firing
// simultaneously.
//
// USAGE:
//   import { executeQueryWithRetry } from '../lib/dbWithRetry';
//   const rows = await executeQueryWithRetry(query, params);
//
// For write operations (executeUpdate) the caller should decide retry policy
// based on idempotency — this wrapper is intentionally read-only.
//
// DO NOT MODIFY db.js — it is marked DO NOT REPLACE in the project reference.
// All changes to query retry behaviour belong here.

import { executeQuery } from "./db";

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 200;

/**
 * Executes a SQL query with exponential backoff on failure.
 *
 * @param {string} query  - The SQL query string
 * @param {object} params - Named parameters object (same signature as executeQuery)
 * @returns {Promise<Array>} - The query recordset
 * @throws {Error} - Rethrows after MAX_RETRIES exhausted
 */
export async function executeQueryWithRetry(query, params = {}) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await executeQuery(query, params);
    } catch (error) {
      lastError = error;

      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 200ms, 400ms + random jitter 0–100ms per attempt.
        // Jitter is critical — without it, all simultaneous failures retry at
        // exactly the same time and the stampede problem is not solved.
        const baseDelay = BASE_DELAY_MS * Math.pow(2, attempt);
        const jitter = Math.random() * 100;
        const delay = baseDelay + jitter;

        console.warn(
          `⚠️ DB query failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), ` +
            `retrying in ${Math.round(delay)}ms — ${error.message}`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(
    `❌ DB query failed after ${MAX_RETRIES + 1} attempts — giving up`,
    { query: query.substring(0, 120) },
  );
  throw lastError;
}
