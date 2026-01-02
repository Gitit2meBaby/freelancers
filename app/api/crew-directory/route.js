// app/api/crew-directory/route.js
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { executeQuery, VIEWS } from "../../lib/db";

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
 * Cached database query function
 * This will cache results for 1 hour (3600 seconds)
 */
const getCachedCrewDirectory = unstable_cache(
  async () => {
    console.log("📊 Fetching crew directory from database...");

    // Query the departments and skills view
    const query = `
      SELECT 
        DepartmentID,
        Department,
        SkillID,
        Skill
      FROM ${VIEWS.DEPARTMENTS_SKILLS}
      ORDER BY Department, Skill
    `;

    const results = await executeQuery(query);
    console.log(`📊 Retrieved ${results.length} rows from database`);

    // Build departments map with nested skills
    const departmentsMap = new Map();

    results.forEach((row) => {
      // Add department if it doesn't exist
      if (!departmentsMap.has(row.DepartmentID)) {
        departmentsMap.set(row.DepartmentID, {
          id: row.DepartmentID,
          name: row.Department,
          slug: generateSlug(row.Department),
          skills: [],
        });
      }

      // Add skill to department
      const department = departmentsMap.get(row.DepartmentID);

      // Only add skill if it has an ID (some departments might not have skills)
      if (row.SkillID) {
        department.skills.push({
          id: row.SkillID,
          name: row.Skill,
          slug: generateSlug(row.Skill),
        });
      }
    });

    const departments = Array.from(departmentsMap.values());

    console.log(`✅ Processed ${departments.length} departments`);

    return {
      departments,
      totalDepartments: departments.length,
      totalSkills: results.filter((r) => r.SkillID).length,
    };
  },
  ["crew-directory-all"], // Cache key
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ["crew-directory"], // Tag for on-demand revalidation
  }
);

export async function GET(request) {
  try {
    const data = await getCachedCrewDirectory();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cached: true,
      ...data,
    });
  } catch (error) {
    console.error("❌ Error fetching crew directory:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
