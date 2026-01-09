// app/api/downloads/skill/[departmentSlug]/[skillSlug]/route.js
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { executeQuery, VIEWS } from "../../../../../lib/db";
import { generateCrewPDFNode } from "../../../../../lib/pdfGeneratorNode";
import { generateCrewExcelNode } from "../../../../../lib/excelGeneratorNode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getSkillCrewData = unstable_cache(
  async (departmentSlug, skillSlug) => {
    // Query using ONLY views - no direct table access
    const query = `
      SELECT 
        ds.Department,
        ds.Skill,
        f.DisplayName as FreelancerName
      FROM ${VIEWS.DEPARTMENTS_SKILLS} ds
      INNER JOIN ${VIEWS.FREELANCER_SKILLS} fs ON ds.SkillID = fs.SkillID
      INNER JOIN ${VIEWS.FREELANCERS} f ON fs.FreelancerID = f.FreelancerID
      WHERE ds.DepartmentSlug = @deptSlug 
        AND ds.SkillSlug = @skillSlug
      ORDER BY f.DisplayName
    `;

    const rows = await executeQuery(query, {
      deptSlug: departmentSlug,
      skillSlug: skillSlug,
    });

    if (rows.length === 0) {
      return null;
    }

    const departmentName = rows[0].Department;
    const skillName = rows[0].Skill;

    // Organize data: { "Skill Name": [crew] }
    const crewData = {
      [skillName]: rows.map((row) => ({
        name: row.FreelancerName,
      })),
    };

    return { departmentName, skillName, crewData };
  },
  ["crew-download-skill"],
  {
    revalidate: 3600,
    tags: ["crew-directory"],
  }
);

export async function GET(request, { params }) {
  try {
    const { departmentSlug, skillSlug } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    if (!format || !["pdf", "xlsx"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Use 'pdf' or 'xlsx'" },
        { status: 400 }
      );
    }

    const result = await getSkillCrewData(departmentSlug, skillSlug);

    if (!result) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const { departmentName, skillName, crewData } = result;

    let buffer;
    let contentType;
    let filename;

    if (format === "pdf") {
      buffer = await generateCrewPDFNode(skillName, crewData);
      contentType = "application/pdf";
      filename = `${skillName}.pdf`; // ✅ Uses skill name
    } else {
      buffer = await generateCrewExcelNode(skillName, crewData);
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = `${skillName}.xlsx`; // ✅ Uses skill name
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating download:", error);
    return NextResponse.json(
      { error: "Failed to generate download" },
      { status: 500 }
    );
  }
}
