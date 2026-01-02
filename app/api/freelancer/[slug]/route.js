// app/api/freelancer/[slug]/route.js
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { executeQuery, VIEWS, STATUS_CODES, LINK_TYPES } from "../../../lib/db";
import { getPublicBlobUrl } from "../../../lib/azureBlob";

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
 * Cached function to get all freelancer data
 */
const getAllFreelancerData = unstable_cache(
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
  ["freelancer-data-raw"],
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ["freelancers"],
  }
);

export async function GET(request, { params }) {
  try {
    // IMPORTANT: In Next.js 15+, params is a Promise
    const { slug } = await params;

    console.log(`📊 Fetching freelancer with slug: ${slug}`);

    // Get cached data
    const { freelancers, skills, links } = await getAllFreelancerData();

    // Find the freelancer with matching slug
    const freelancer = freelancers.find(
      (f) => f.Slug.toLowerCase() === slug.toLowerCase()
    );

    if (!freelancer) {
      console.log(`❌ No freelancer found with slug: ${slug}`);
      return NextResponse.json(
        { success: false, error: "Freelancer not found" },
        { status: 404 }
      );
    }

    console.log(`✅ Found freelancer: ${freelancer.DisplayName}`);

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
        const linkType = link.LinkName.toLowerCase();
        acc[linkType] = link.LinkURL;
        return acc;
      }, {});

    // Build complete freelancer object
    const freelancerData = {
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
        freelancer.CVStatusID === STATUS_CODES.VERIFIED && freelancer.CVBlobID
          ? getPublicBlobUrl(freelancer.CVBlobID)
          : null,
      photoBlobId: freelancer.PhotoBlobID,
      cvBlobId: freelancer.CVBlobID,
      photoStatus: freelancer.PhotoStatusID,
      cvStatus: freelancer.CVStatusID,
      skills: freelancerSkills,
      links: {
        website: freelancerLinks[LINK_TYPES.WEBSITE] || null,
        instagram: freelancerLinks[LINK_TYPES.INSTAGRAM] || null,
        imdb: freelancerLinks[LINK_TYPES.IMDB] || null,
        linkedin: freelancerLinks[LINK_TYPES.LINKEDIN] || null,
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
