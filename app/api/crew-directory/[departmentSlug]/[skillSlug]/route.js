// app/api/crew-directory/[departmentSlug]/[skillSlug]/route.js - CLEANED VERSION
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import {
  executeQuery,
  VIEWS,
  STATUS_CODES,
  LINK_TYPES,
} from "../../../../lib/db";
import { getBlobUrl } from "../../../../lib/azureBlob";

/**
 * Cached function to get all freelancers with their skills
 */
const getAllFreelancersWithSkills = unstable_cache(
  async () => {
    // Query to get all freelancers (view already filters by ShowOnWebsite = True)
    const freelancersQuery = `
      SELECT 
        FreelancerID,
        Slug,
        DisplayName,
        FreelancerBio,
        PhotoBlobID,
        PhotoStatusID,
        CVBlobID,
        CVStatusID
      FROM ${VIEWS.FREELANCERS}
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
      FROM ${VIEWS.FREELANCER_LINKS}
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
    revalidate: 3600,
    tags: ["crew-directory", "freelancers"],
  }
);

export async function GET(request, { params }) {
  try {
    // IMPORTANT: In Next.js 15+, params is a Promise
    const { departmentSlug, skillSlug } = await params;

    // Decode URL-encoded slugs (handles special characters like /, &, etc)
    const decodedDeptSlug = decodeURIComponent(departmentSlug);
    const decodedSkillSlug = decodeURIComponent(skillSlug);

    // Get cached data
    const { freelancers, skills, links } = await getAllFreelancersWithSkills();

    // Find the skill that matches the slug
    const matchingSkills = skills.filter((skill) => {
      return (
        skill.DepartmentSlug === decodedDeptSlug &&
        skill.SkillSlug === decodedSkillSlug
      );
    });

    if (matchingSkills.length === 0) {
      return NextResponse.json(
        { success: false, error: "Skill not found" },
        { status: 404 }
      );
    }

    // Get skill info from departments view
    const deptSkillsQuery = `
      SELECT Department, Skill, DepartmentID, SkillID
      FROM ${VIEWS.DEPARTMENTS_SKILLS}
      WHERE DepartmentSlug = @deptSlug AND SkillSlug = @skillSlug
    `;

    const deptSkillInfo = await executeQuery(deptSkillsQuery, {
      deptSlug: decodedDeptSlug,
      skillSlug: decodedSkillSlug,
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
      slug: decodedSkillSlug,
      department: {
        id: deptSkillInfo[0].DepartmentID,
        name: deptSkillInfo[0].Department,
        slug: decodedDeptSlug,
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
      const linkType = link.LinkName;
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
              ? getBlobUrl(freelancer.PhotoBlobID)
              : null,
          cvUrl:
            freelancer.CVStatusID === STATUS_CODES.VERIFIED &&
            freelancer.CVBlobID
              ? getBlobUrl(freelancer.CVBlobID)
              : null,
          links: {
            Website: freelancerLinks[LINK_TYPES.WEBSITE] || null,
            Instagram: freelancerLinks[LINK_TYPES.INSTAGRAM] || null,
            Imdb: freelancerLinks[LINK_TYPES.IMDB] || null,
            LinkedIn: freelancerLinks[LINK_TYPES.LINKEDIN] || null,
          },
        };
      })
      // Sort by name
      .sort((a, b) => a.name.localeCompare(b.name));

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
    console.error("Error fetching skill freelancers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
