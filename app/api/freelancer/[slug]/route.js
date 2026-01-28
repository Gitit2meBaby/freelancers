// app/api/freelancer/[slug]/route.js - UPDATED WITH PROXIED URLS
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { executeQuery, VIEWS, LINK_TYPES } from "../../../lib/db";
import { getProxiedBlobUrl } from "../../../lib/blobProxy";

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
        CVBlobID,
        EquipmentBlobID
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
  ["freelancer-data-proxied-v3"],
  {
    revalidate: 3600,
    tags: ["freelancers"],
  },
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
      (f) => f.Slug.toLowerCase() === slug.toLowerCase(),
    );

    if (!freelancer) {
      return NextResponse.json(
        { success: false, error: "Freelancer not found" },
        { status: 404 },
      );
    }

    console.log(`📸 Photo Blob ID: ${freelancer.PhotoBlobID || "none"}`);
    console.log(`📄 CV Blob ID: ${freelancer.CVBlobID || "none"}`);
    console.log(
      `🔗 Equipment List Blob ID: ${freelancer.EquipmentBlobID || "none"}`,
    );

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

    // Use proxied URLs to avoid CORS issues
    const photoUrl = freelancer.PhotoBlobID?.trim()
      ? getProxiedBlobUrl(freelancer.PhotoBlobID)
      : null;

    const cvUrl = freelancer.CVBlobID?.trim()
      ? getProxiedBlobUrl(freelancer.CVBlobID)
      : null;

    const equipmentUrl = freelancer.EquipmentBlobID?.trim()
      ? getProxiedBlobUrl(freelancer.EquipmentBlobID)
      : null;

    console.log(`🖼️  Proxied Photo URL: ${photoUrl}`);
    console.log(`📄 Proxied CV URL: ${cvUrl}`);
    console.log(`📋 Proxied Equipment URL: ${equipmentUrl}`);

    // Build complete freelancer object
    const freelancerData = {
      id: freelancer.FreelancerID,
      name: freelancer.DisplayName,
      slug: freelancer.Slug,
      bio: freelancer.FreelancerBio || null,
      photoUrl: photoUrl,
      cvUrl: cvUrl,
      equipmentListUrl: equipmentUrl,
      photoBlobId: freelancer.PhotoBlobID,
      cvBlobId: freelancer.CVBlobID,
      equipmentBlobId: freelancer.EquipmentBlobID,
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
