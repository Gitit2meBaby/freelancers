// app/api/freelancer/[slug]/route.js
//
// FIX (2026-04-09): blobExists() calls moved INSIDE the unstable_cache boundary.
// FIX (2026-04-10a): executeQuery replaced with executeQueryWithRetry.
// FIX (2026-04-10b): blobExists() checks REMOVED ENTIRELY from the cache function.
//
// WHY REMOVED:
// With 645 freelancers, the blob existence check required 1,290 outbound HEAD
// requests to Azure Blob Storage on every cold-cache hit (hourly per instance).
// Even at concurrency 10, this took ~96 seconds of sustained work — exactly the
// CPU spike visible in Azure metrics after every restart or ISR revalidation.
//
// THE NEW APPROACH:
// cvExists and equipmentExists are now derived purely from whether the blob ID
// column is set in the DB — if CVBlobID is non-empty, cvExists = true.
// This is a safe assumption because:
//   1. Blob IDs are only written to the DB by the upload route AFTER a
//      successful upload. An ID present in the DB means a file was uploaded.
//   2. If a blob genuinely doesn't exist (e.g. manually deleted from Azure),
//      the download link will 404 in the browser — an acceptable degradation,
//      far better than 96s CPU spikes every hour.
//   3. ProfileContent.jsx already has onError handling for broken photo URLs.
//      The same graceful degradation applies to CV/equipment link clicks.
//
// RESULT: Cold cache miss now completes in ~1-2s (3 parallel SQL queries)
// instead of 96s. No Azure Blob HEAD requests on cache miss.

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { VIEWS, LINK_TYPES } from "../../../lib/db";
import { executeQueryWithRetry } from "../../../lib/dbWithRetry";
import { getProxiedBlobUrl } from "../../../lib/blobProxy";

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

    const [freelancers, skills, links] = await Promise.all([
      executeQueryWithRetry(freelancersQuery),
      executeQueryWithRetry(skillsQuery),
      executeQueryWithRetry(linksQuery),
    ]);

    console.log(`✅ Freelancer data cached: ${freelancers.length} freelancers`);

    return { freelancers, skills, links };
  },
  ["freelancer-data-v5"],
  {
    revalidate: 3600,
    tags: ["freelancers"],
  },
);

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    const { freelancers, skills, links } = await getAllFreelancerData();

    const freelancer = freelancers.find(
      (f) => f.Slug.toLowerCase() === slug.toLowerCase(),
    );

    if (!freelancer) {
      return NextResponse.json(
        { success: false, error: "Freelancer not found" },
        { status: 404 },
      );
    }

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

    // cvExists and equipmentExists are now derived from DB columns only.
    // No Azure HEAD requests. If CVBlobID is set in the DB, a CV was uploaded.
    const cvExists = !!freelancer.CVBlobID?.trim();
    const equipmentExists = !!freelancer.EquipmentBlobID?.trim();

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
      cvExists,
      equipmentExists,
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
