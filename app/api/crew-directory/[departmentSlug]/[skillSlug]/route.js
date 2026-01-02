// app/api/crew-directory/[departmentSlug]/[skillSlug]/route.js
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import {
  executeQuery,
  VIEWS,
  STATUS_CODES,
  LINK_TYPES,
} from "../../../../lib/db";
import { getPublicBlobUrl } from "../../../../lib/azureBlob";

/**
 * Generates a URL-friendly slug from a name
 */
function generateSlug(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Cached function to get all freelancers with their skills
 */
const getAllFreelancersWithSkills = unstable_cache(
  async () => {
    // Query to get all freelancers (view already filters by ShowOnWebsite = True)
    const freelancersQuery = `
      SELECT 
        f.FreelancerID,
        f.Slug,
        f.DisplayName,
        f.PhotoBlobID,
        f.PhotoStatusID,
        f.CVBlobID,
        f.CVStatusID,
        w.FreelancerBio
      FROM ${VIEWS.FREELANCERS} f
      LEFT JOIN tblFreelancerWebsiteData w ON f.FreelancerID = w.FreelancerID
    `;

    // Query to get all freelancer skills (has only IDs and slugs)
    const skillsQuery = `
      SELECT 
        FreelancerID,
        DepartmentID,
        DepartmentSlug,
        SkillID,
        SkillSlug
      FROM ${VIEWS.FREELANCER_SKILLS}
    `;

    // Query to get all freelancer links
    const linksQuery = `
      SELECT 
        FreelancerID,
        LinkName,
        LinkURL
      FROM tblFreelancerWebsiteDataLinks
      WHERE LinkURL IS NOT NULL AND LinkURL != ''
    `;

    const [freelancers, skills, links] = await Promise.all([
      executeQuery(freelancersQuery),
      executeQuery(skillsQuery),
      executeQuery(linksQuery),
    ]);

    return { freelancers, skills, links };
  },
  ["crew-directory-freelancers-raw"],
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ["crew-directory", "freelancers"],
  }
);

export async function GET(request, { params }) {
  try {
    // IMPORTANT: In Next.js 15+, params is a Promise
    const { departmentSlug, skillSlug } = await params;

    console.log(`📊 Fetching freelancers for ${departmentSlug}/${skillSlug}`);

    // Get cached data
    const { freelancers, skills, links } = await getAllFreelancersWithSkills();

    console.log(`📊 Total freelancers: ${freelancers.length}`);
    console.log(`📊 Total skill assignments: ${skills.length}`);
    console.log(`📊 Total links: ${links.length}`);

    // Find the skill that matches the slug
    const matchingSkills = skills.filter((skill) => {
      return (
        skill.DepartmentSlug === departmentSlug && skill.SkillSlug === skillSlug
      );
    });

    if (matchingSkills.length === 0) {
      console.log(
        `❌ No skill found with slugs: ${departmentSlug}/${skillSlug}`
      );
      return NextResponse.json(
        { success: false, error: "Skill not found" },
        { status: 404 }
      );
    }

    // We need to get the skill name and department name from the departments view
    // since the skills view only has IDs and slugs
    const deptSkillsQuery = `
      SELECT Department, Skill, DepartmentID, SkillID
      FROM ${VIEWS.DEPARTMENTS_SKILLS}
      WHERE DepartmentSlug = @deptSlug AND SkillSlug = @skillSlug
    `;

    const deptSkillInfo = await executeQuery(deptSkillsQuery, {
      deptSlug: departmentSlug,
      skillSlug: skillSlug,
    });

    if (deptSkillInfo.length === 0) {
      return NextResponse.json(
        { success: false, error: "Skill not found" },
        { status: 404 }
      );
    }

    // Get skill info
    const skillInfo = {
      id: deptSkillInfo[0].SkillID,
      name: deptSkillInfo[0].Skill,
      slug: skillSlug,
      department: {
        id: deptSkillInfo[0].DepartmentID,
        name: deptSkillInfo[0].Department,
        slug: departmentSlug,
      },
    };

    // Get all freelancer IDs that have this skill
    const freelancerIdsWithSkill = new Set(
      matchingSkills.map((s) => s.FreelancerID)
    );

    // Build links map for quick lookup
    const linksMap = new Map();
    links.forEach((link) => {
      if (!linksMap.has(link.FreelancerID)) {
        linksMap.set(link.FreelancerID, {});
      }
      const linkType = link.LinkName.toLowerCase();
      linksMap.get(link.FreelancerID)[linkType] = link.LinkURL;
    });

    // Filter freelancers to only those with this skill
    const freelancersWithSkill = freelancers
      .filter((f) => freelancerIdsWithSkill.has(f.FreelancerID))
      .map((freelancer) => {
        const freelancerLinks = linksMap.get(freelancer.FreelancerID) || {};

        return {
          id: freelancer.FreelancerID,
          name: freelancer.DisplayName,
          slug: freelancer.Slug,
          bio: freelancer.FreelancerBio || null,
          photoUrl:
            freelancer.PhotoStatusID === STATUS_CODES.VERIFIED &&
            freelancer.PhotoBlobID
              ? getPublicBlobUrl(freelancer.PhotoBlobID)
              : null,
          cvUrl:
            freelancer.CVStatusID === STATUS_CODES.VERIFIED &&
            freelancer.CVBlobID
              ? getPublicBlobUrl(freelancer.CVBlobID)
              : null,
          links: {
            website: freelancerLinks[LINK_TYPES.WEBSITE] || null,
            instagram: freelancerLinks[LINK_TYPES.INSTAGRAM] || null,
            imdb: freelancerLinks[LINK_TYPES.IMDB] || null,
            linkedin: freelancerLinks[LINK_TYPES.LINKEDIN] || null,
          },
        };
      })
      // Sort by name
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(
      `✅ Found ${freelancersWithSkill.length} freelancers for ${skillInfo.name}`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cached: true,
      data: {
        skill: skillInfo,
        freelancers: freelancersWithSkill,
        freelancerCount: freelancersWithSkill.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching skill freelancers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
