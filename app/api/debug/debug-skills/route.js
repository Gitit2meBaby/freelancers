// app/api/debug-skills/route.js
import { NextResponse } from "next/server";
import { executeQuery, VIEWS } from "../../lib/db";

export async function GET(request) {
  try {
    // Get all skills with their actual slugs
    const query = `
      SELECT 
        DepartmentID,
        Department,
        DepartmentSlug,
        SkillID,
        Skill,
        SkillSlug
      FROM ${VIEWS.DEPARTMENTS_SKILLS}
      ORDER BY Department, Skill
    `;

    const results = await executeQuery(query);

    // Group by department for easier reading
    const departments = {};

    results.forEach((row) => {
      if (!departments[row.Department]) {
        departments[row.Department] = {
          departmentSlug: row.DepartmentSlug,
          skills: [],
        };
      }

      departments[row.Department].skills.push({
        skillName: row.Skill,
        skillSlug: row.SkillSlug,
      });
    });

    return NextResponse.json({
      success: true,
      totalSkills: results.length,
      departments,
    });
  } catch (error) {
    console.error("Error fetching skills:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
