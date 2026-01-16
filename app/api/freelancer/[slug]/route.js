// app/api/freelancer/[slug]/route.js - CORRECTED (No Verification Filtering)
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { executeQuery, VIEWS, LINK_TYPES } from "../../../lib/db";
import { getBlobUrl } from "../../../lib/azureBlob";

/**
 * Cached function to get all freelancer data
 */
const getAllFreelancerData = unstable_cache(
  async () => {
    // Query to get all freelancers (view already filters by ShowOnWebsite = True)
    const freelancersQuery = `
      SELECT 
        FreelancerID,
        Slug,
        DisplayName,
        FreelancerBio,
        PhotoBlobID,
        CVBlobID
      FROM ${VIEWS.FREELANCERS}
    `;

    // Query to get all freelancer skills
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
  ["freelancer-data-raw"],
  {
    revalidate: 3600,
    tags: ["freelancers"],
  }
);

export async function GET(request, { params }) {
  try {
    // IMPORTANT: In Next.js 15+, params is a Promise
    const { slug } = await params;

    console.log(`🔵 Fetching profile: ${slug}`);

    // Get cached data
    const { freelancers, skills, links } = await getAllFreelancerData();

    // Find the freelancer with matching slug
    const freelancer = freelancers.find(
      (f) => f.Slug.toLowerCase() === slug.toLowerCase()
    );

    if (!freelancer) {
      return NextResponse.json(
        { success: false, error: "Freelancer not found" },
        { status: 404 }
      );
    }

    console.log(`📸 Photo Blob ID: ${freelancer.PhotoBlobID || "none"}`);
    console.log(`📄 CV Blob ID: ${freelancer.CVBlobID || "none"}`);

    // Get freelancer's skills
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

    // Get freelancer's links
    const freelancerLinks = links
      .filter((l) => l.FreelancerID === freelancer.FreelancerID)
      .reduce((acc, link) => {
        const linkType = link.LinkName;
        acc[linkType] = link.LinkURL;
        return acc;
      }, {});

    // CRITICAL FIX: Show photos and CVs if they exist, regardless of verification status
    // Verification is set once during initial setup and never changes
    const photoUrl = freelancer.PhotoBlobID
      ? getBlobUrl(freelancer.PhotoBlobID)
      : null;
    const cvUrl = freelancer.CVBlobID ? getBlobUrl(freelancer.CVBlobID) : null;

    if (photoUrl) {
      console.log(`✅ Showing photo`);
    }
    if (cvUrl) {
      console.log(`✅ Showing CV`);
    }

    // Build complete freelancer object
    const freelancerData = {
      id: freelancer.FreelancerID,
      name: freelancer.DisplayName,
      slug: freelancer.Slug,
      bio: freelancer.FreelancerBio || null,
      photoUrl: photoUrl,
      cvUrl: cvUrl,
      photoBlobId: freelancer.PhotoBlobID,
      cvBlobId: freelancer.CVBlobID,
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
      { status: 500 }
    );
  }
}
