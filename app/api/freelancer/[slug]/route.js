// app/api/freelancer/[slug]/route.js
//
// FIX (2026-04-09): blobExists() calls moved INSIDE the unstable_cache boundary.
//
// Previously, cvExists and equipmentExists were checked per-request in the GET
// handler — outside the cache. A crew directory page loading 20–50 profiles
// simultaneously fired 40–100 concurrent outbound HEAD requests to Azure Blob
// Storage on every page load, regardless of cache state. This is the confirmed
// cause of thread pool starvation and the CPU flatline on instance F0N at ~08:30
// UTC. Moving the checks inside the cache reduces them from N-per-request to
// once per revalidation window (1 hour).
//
// No other logic has changed. SQL queries, link assembly, and URL generation
// are identical to the previous version.

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { executeQuery, VIEWS, LINK_TYPES } from "../../../lib/db";
import { getProxiedBlobUrl } from "../../../lib/blobProxy";
import { blobExists } from "../../../lib/azureBlob";

/**
 * Cached function to get all freelancer data including blob existence flags.
 *
 * All three SQL queries AND all blob existence checks run inside this cache
 * boundary. They execute once per revalidation period (1 hour) regardless of
 * how many concurrent requests arrive. Concurrent cache misses on cold start
 * are serialised by Next.js's unstable_cache deduplication — only one execution
 * runs; all others await the same promise.
 *
 * Blob checks are batched: all CVs and equipment lists are checked in a single
 * Promise.all rather than sequentially. This keeps cache-miss latency acceptable
 * even with a large crew directory.
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

    // Run all three SQL queries in parallel — no change from previous version.
    const [freelancers, skills, links] = await Promise.all([
      executeQuery(freelancersQuery),
      executeQuery(skillsQuery),
      executeQuery(linksQuery),
    ]);

    // --- Blob existence checks (moved from GET handler) ---
    //
    // Build two parallel arrays: one for CV blobs, one for equipment blobs.
    // Each entry is either a blobExists() promise or Promise.resolve(false) for
    // rows with no blob ID. All checks run concurrently in a single Promise.all.
    //
    // Result is stored as a Map<FreelancerID, { cvExists, equipmentExists }>
    // so the GET handler can look up by ID in O(1) with no per-request I/O.

    const blobChecks = await Promise.all(
      freelancers.map(async (f) => {
        const [cvExists, equipmentExists] = await Promise.all([
          f.CVBlobID?.trim() ? blobExists(f.CVBlobID) : Promise.resolve(false),
          f.EquipmentBlobID?.trim()
            ? blobExists(f.EquipmentBlobID)
            : Promise.resolve(false),
        ]);
        return { id: f.FreelancerID, cvExists, equipmentExists };
      }),
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
    // In Next.js 15+, params is a Promise
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

    // Blob existence is now a Map lookup — zero I/O per request.
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

    // getProxiedBlobUrl returns a direct Azure URL — Node is not in the
    // delivery path for images or documents.
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
