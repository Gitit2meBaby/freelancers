// app/api/freelancer/[slug]/route.js
//
// FIX (2026-04-09): blobExists() calls moved INSIDE the unstable_cache boundary.
// FIX (2026-04-10a): executeQuery replaced with executeQueryWithRetry — retries
//   back off exponentially rather than firing simultaneously.
// FIX (2026-04-10b): Blob existence checks are now concurrency-limited.
//   Previously Promise.all fired ALL freelancer blob checks simultaneously —
//   with ~300+ freelancers that's 600+ concurrent outbound HEAD requests to
//   Azure on every cold-cache restart. On a single-core B1 this saturates the
//   libuv thread pool (default size: 4) and spikes CPU as threads queue.
//   Replaced with a semaphore that caps concurrent blob checks at 10.

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { VIEWS, LINK_TYPES } from "../../../lib/db";
import { executeQueryWithRetry } from "../../../lib/dbWithRetry";
import { getProxiedBlobUrl } from "../../../lib/blobProxy";
import { blobExists } from "../../../lib/azureBlob";

/**
 * Runs an array of async task factories with a maximum concurrency limit.
 * Equivalent to p-limit without the npm dependency.
 *
 * @param {Array<() => Promise<any>>} tasks  - Zero-arg functions that return promises
 * @param {number} concurrency               - Max simultaneous in-flight promises
 * @returns {Promise<Array<any>>}            - Results in input order
 */
async function runWithConcurrencyLimit(tasks, concurrency) {
  const results = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  // Spin up `concurrency` workers — each drains from the shared index counter
  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    worker,
  );
  await Promise.all(workers);
  return results;
}

/**
 * Cached function to get all freelancer data including blob existence flags.
 *
 * All three SQL queries AND all blob existence checks run inside this cache
 * boundary. They execute once per revalidation period (1 hour) regardless of
 * how many concurrent requests arrive. Concurrent cache misses on cold start
 * are serialised by Next.js's unstable_cache deduplication — only one execution
 * runs; all others await the same promise.
 *
 * Blob checks are concurrency-limited to 10 simultaneous HEAD requests so the
 * libuv thread pool isn't flooded on cold start.
 */
const getAllFreelancerData = unstable_cache(
  async () => {
    const freelancersQuery = `
      SELECT 
        FreelancerID,
        Slug,
        DisplayName,
        FreelancerBio,
        PhotoBlobID,
        CVBlobID,
        EquipmentBlobID
      FROM ${VIEWS.FREELANCERS}
    `;

    const skillsQuery = `
      SELECT 
        fs.FreelancerID,
        fs.DepartmentID,
        fs.DepartmentSlug,
        fs.SkillID,
        fs.SkillSlug,
        ds.Department,
        ds.Skill
      FROM ${VIEWS.FREELANCER_SKILLS} fs
      LEFT JOIN ${VIEWS.DEPARTMENTS_SKILLS} ds 
        ON fs.DepartmentSlug = ds.DepartmentSlug 
        AND fs.SkillSlug = ds.SkillSlug
    `;

    const linksQuery = `
      SELECT 
        FreelancerID,
        LinkName,
        LinkURL
      FROM ${VIEWS.FREELANCER_LINKS}
      WHERE LinkURL IS NOT NULL AND LinkURL != ''
    `;

    // All three SQL queries run in parallel with backoff on each.
    const [freelancers, skills, links] = await Promise.all([
      executeQueryWithRetry(freelancersQuery),
      executeQueryWithRetry(skillsQuery),
      executeQueryWithRetry(linksQuery),
    ]);

    // --- Blob existence checks (concurrency-limited) ---
    //
    // Each freelancer needs up to 2 HEAD requests (CV + equipment).
    // We cap total simultaneous in-flight freelancer checks at 10 to avoid
    // flooding the libuv thread pool on cold start. At 10 concurrent and
    // ~300 freelancers, the full set completes in ~30 round-trips rather than
    // one 600-request burst. Cache TTL is 1 hour so this cost is paid at most
    // once per hour per instance.
    //
    // The inner Promise.all per freelancer (CV + equipment) is fine — it's
    // only 2 requests, and they're truly independent.

    const BLOB_CHECK_CONCURRENCY = 10;

    const blobTasks = freelancers.map((f) => async () => {
      const [cvExists, equipmentExists] = await Promise.all([
        f.CVBlobID?.trim() ? blobExists(f.CVBlobID) : Promise.resolve(false),
        f.EquipmentBlobID?.trim()
          ? blobExists(f.EquipmentBlobID)
          : Promise.resolve(false),
      ]);
      return { id: f.FreelancerID, cvExists, equipmentExists };
    });

    const blobChecks = await runWithConcurrencyLimit(
      blobTasks,
      BLOB_CHECK_CONCURRENCY,
    );

    console.log(
      `✅ Blob checks complete: ${blobChecks.length} freelancers ` +
        `(concurrency cap: ${BLOB_CHECK_CONCURRENCY})`,
    );

    // Index by FreelancerID for O(1) lookup in GET handler.
    const blobExistenceMap = new Map(
      blobChecks.map((entry) => [entry.id, entry]),
    );

    return { freelancers, skills, links, blobExistenceMap };
  },
  ["freelancer-data-v4"],
  {
    revalidate: 3600,
    tags: ["freelancers"],
  },
);

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    const { freelancers, skills, links, blobExistenceMap } =
      await getAllFreelancerData();

    const freelancer = freelancers.find(
      (f) => f.Slug.toLowerCase() === slug.toLowerCase(),
    );

    if (!freelancer) {
      return NextResponse.json(
        { success: false, error: "Freelancer not found" },
        { status: 404 },
      );
    }

    // Blob existence is a Map lookup — zero I/O per request.
    const blobEntry = blobExistenceMap.get(freelancer.FreelancerID) ?? {
      cvExists: false,
      equipmentExists: false,
    };

    const freelancerSkills = skills
      .filter((s) => s.FreelancerID === freelancer.FreelancerID)
      .map((s) => ({
        skillId: s.SkillID,
        skillName: s.Skill,
        skillSlug: s.SkillSlug,
        departmentId: s.DepartmentID,
        departmentName: s.Department,
        departmentSlug: s.DepartmentSlug,
      }));

    const freelancerLinks = links
      .filter((l) => l.FreelancerID === freelancer.FreelancerID)
      .reduce((acc, link) => {
        const linkType = link.LinkName;
        acc[linkType] = link.LinkURL;
        return acc;
      }, {});

    const photoUrl = freelancer.PhotoBlobID?.trim()
      ? getProxiedBlobUrl(freelancer.PhotoBlobID)
      : null;

    const cvUrl = freelancer.CVBlobID?.trim()
      ? getProxiedBlobUrl(freelancer.CVBlobID)
      : null;

    const equipmentUrl = freelancer.EquipmentBlobID?.trim()
      ? getProxiedBlobUrl(freelancer.EquipmentBlobID)
      : null;

    const freelancerData = {
      id: freelancer.FreelancerID,
      name: freelancer.DisplayName,
      slug: freelancer.Slug,
      bio: freelancer.FreelancerBio || null,
      photoUrl,
      cvUrl,
      equipmentListUrl: equipmentUrl,
      photoBlobId: freelancer.PhotoBlobID,
      cvBlobId: freelancer.CVBlobID,
      equipmentBlobId: freelancer.EquipmentBlobID,
      // Booleans served from cache — no per-request blob I/O
      cvExists: blobEntry.cvExists,
      equipmentExists: blobEntry.equipmentExists,
      skills: freelancerSkills,
      links: {
        Website: freelancerLinks[LINK_TYPES.WEBSITE] || null,
        Instagram: freelancerLinks[LINK_TYPES.INSTAGRAM] || null,
        Imdb: freelancerLinks[LINK_TYPES.IMDB] || null,
        LinkedIn: freelancerLinks[LINK_TYPES.LINKEDIN] || null,
      },
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cached: true,
      data: freelancerData,
    });
  } catch (error) {
    console.error("❌ Error fetching freelancer:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
