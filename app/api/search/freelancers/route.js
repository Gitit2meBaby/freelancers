// app/api/search/freelancers/route.js
import { NextResponse } from "next/server";
import { executeQuery, VIEWS } from "../../../lib/db";

/**
 * GET /api/search/freelancers
 *
 * Search freelancers by name
 * Optional filters: department, skill
 *
 * Query params:
 * - q: search term (required, min 2 characters)
 * - department: department slug (optional)
 * - skill: skill slug (optional)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("q");
    const departmentSlug = searchParams.get("department");
    const skillSlug = searchParams.get("skill");

    // Validate search term
    if (!searchTerm || searchTerm.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Search term must be at least 2 characters",
          results: [],
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Searching freelancers: "${searchTerm}"`);

    // Build query based on filters
    let query;
    let params = {};

    if (skillSlug && departmentSlug) {
      // Search within specific skill
      query = `
        SELECT DISTINCT
          f.FreelancerID as id,
          f.DisplayName as name,
          f.Slug as slug
        FROM ${VIEWS.FREELANCERS} f
        INNER JOIN ${VIEWS.FREELANCER_SKILLS} fs ON f.FreelancerID = fs.FreelancerID
        INNER JOIN ${VIEWS.DEPARTMENTS_SKILLS} ds ON fs.SkillID = ds.SkillID
        WHERE f.DisplayName LIKE @searchTerm
          AND ds.DepartmentSlug = @departmentSlug
          AND ds.SkillSlug = @skillSlug
        ORDER BY f.DisplayName
      `;
      params = {
        searchTerm: `%${searchTerm}%`,
        departmentSlug,
        skillSlug,
      };
    } else if (departmentSlug) {
      // Search within specific department
      query = `
        SELECT DISTINCT
          f.FreelancerID as id,
          f.DisplayName as name,
          f.Slug as slug
        FROM ${VIEWS.FREELANCERS} f
        INNER JOIN ${VIEWS.FREELANCER_SKILLS} fs ON f.FreelancerID = fs.FreelancerID
        INNER JOIN ${VIEWS.DEPARTMENTS_SKILLS} ds ON fs.SkillID = ds.SkillID
        WHERE f.DisplayName LIKE @searchTerm
          AND ds.DepartmentSlug = @departmentSlug
        ORDER BY f.DisplayName
      `;
      params = {
        searchTerm: `%${searchTerm}%`,
        departmentSlug,
      };
    } else {
      // Search all freelancers
      query = `
        SELECT 
          FreelancerID as id,
          DisplayName as name,
          Slug as slug
        FROM ${VIEWS.FREELANCERS}
        WHERE DisplayName LIKE @searchTerm
        ORDER BY DisplayName
      `;
      params = {
        searchTerm: `%${searchTerm}%`,
      };
    }

    const results = await executeQuery(query, params);

    // Get skills for each freelancer (for display in dropdown)
    const enrichedResults = await Promise.all(
      results.map(async (freelancer) => {
        const skillsQuery = `
          SELECT TOP 1
            ds.Department as departmentName,
            ds.Skill as skillName
          FROM ${VIEWS.FREELANCER_SKILLS} fs
          INNER JOIN ${VIEWS.DEPARTMENTS_SKILLS} ds ON fs.SkillID = ds.SkillID
          WHERE fs.FreelancerID = @freelancerId
          ORDER BY ds.DepartmentSort, ds.SkillSort
        `;

        const skills = await executeQuery(skillsQuery, {
          freelancerId: freelancer.id,
        });

        return {
          ...freelancer,
          skills: skills.length > 0 ? skills : [],
        };
      })
    );

    console.log(`✅ Found ${enrichedResults.length} results`);

    return NextResponse.json({
      success: true,
      query: searchTerm,
      count: enrichedResults.length,
      results: enrichedResults,
    });
  } catch (error) {
    console.error("❌ Search error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        results: [],
      },
      { status: 500 }
    );
  }
}
