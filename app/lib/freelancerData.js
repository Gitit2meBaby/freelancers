// lib/freelancerData.js
//
// Shared freelancer data fetcher used by both:
//   - app/api/freelancer/[slug]/route.js  (API endpoint)
//   - app/my-account/[slug]/page.js       (profile page SSR)
//
// FIX (2026-04-10): Extracted from route.js so that page.js can call
// getAllFreelancerData() directly instead of making an outbound HTTP fetch
// to its own API endpoint. That self-referential fetch went through Azure's
// load balancer and back in, adding 7-9 seconds of latency on every cache
// miss and firing 4x simultaneously (generateMetadata + page render both
// called getCachedFreelancerProfile before the cache was populated).

import { unstable_cache } from "next/cache";
import { VIEWS, LINK_TYPES } from "./db";
import { executeQueryWithRetry } from "./dbWithRetry";
import { getProxiedBlobUrl } from "./blobProxy";

async function fetchAllFreelancerData() {
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
}

export const getAllFreelancerData = unstable_cache(
  fetchAllFreelancerData,
  ["freelancer-data-v5"],
  {
    revalidate: 3600,
    tags: ["freelancers"],
  },
);

/**
 * Returns a single freelancer's fully-resolved profile object,
 * using the shared cache. No HTTP round-trip.
 */
export async function getFreelancerProfile(slug) {
  const { freelancers, skills, links } = await getAllFreelancerData();

  const freelancer = freelancers.find(
    (f) => f.Slug.toLowerCase() === slug.toLowerCase(),
  );

  if (!freelancer) return null;

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
      acc[link.LinkName] = link.LinkURL;
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

  return {
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
    cvExists: !!freelancer.CVBlobID?.trim(),
    equipmentExists: !!freelancer.EquipmentBlobID?.trim(),
    skills: freelancerSkills,
    links: {
      Website: freelancerLinks[LINK_TYPES.WEBSITE] || null,
      Instagram: freelancerLinks[LINK_TYPES.INSTAGRAM] || null,
      Imdb: freelancerLinks[LINK_TYPES.IMDB] || null,
      LinkedIn: freelancerLinks[LINK_TYPES.LINKEDIN] || null,
    },
  };
}
