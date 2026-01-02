// app/api/crew-directory/[departmentSlug]/route.js
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { executeQuery, VIEWS } from "../../../lib/db";

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
 * Cached function to get all departments and skills data
 */
const getAllDepartmentsSkills = unstable_cache(
  async () => {
    const query = `
      SELECT 
        DepartmentID,
        Department,
        DepartmentSlug,
        SkillID,
        Skill,
        SkillSlug
      FROM ${VIEWS.DEPARTMENTS_SKILLS}
      ORDER BY DepartmentSort, SkillSort
    `;

    return await executeQuery(query);
  },
  ["crew-directory-raw-data"],
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ["crew-directory"],
  }
);

export async function GET(request, { params }) {
  try {
    // IMPORTANT: In Next.js 15+, params is a Promise
    const { departmentSlug } = await params;

    console.log(`📊 Fetching skills for department slug: ${departmentSlug}`);

    // Get cached data
    const allResults = await getAllDepartmentsSkills();

    console.log(`📊 Total rows from cache: ${allResults.length}`);

    // Find all rows that match the department slug
    const matchingRows = allResults.filter((row) => {
      return row.DepartmentSlug === departmentSlug; // Use DB slug
    });

    console.log(
      `📊 Matching rows for slug "${departmentSlug}": ${matchingRows.length}`
    );

    if (matchingRows.length === 0) {
      console.log(`❌ No department found with slug: ${departmentSlug}`);
      return NextResponse.json(
        { success: false, error: "Department not found" },
        { status: 404 }
      );
    }

    // Extract department info from first matching row
    const matchedDepartment = {
      id: matchingRows[0].DepartmentID,
      name: matchingRows[0].Department,
      slug: matchingRows[0].DepartmentSlug, // Use DB slug
    };

    // Build unique skills list for this department
    const skills = matchingRows
      .filter((row) => row.SkillID) // Only include rows with skills
      .map((row) => ({
        id: row.SkillID,
        name: row.Skill,
        slug: row.SkillSlug, // Use DB slug
      }));

    console.log(
      `✅ Found ${skills.length} skills for department: ${matchedDepartment.name}`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cached: true,
      data: {
        department: matchedDepartment,
        skills,
        skillCount: skills.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching department skills:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
