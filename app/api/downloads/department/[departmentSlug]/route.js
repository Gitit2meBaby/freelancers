// app/api/downloads/department/[departmentSlug]/route.js
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { executeQuery, VIEWS } from "../../../../lib/db";
import { generateCrewPDFNode } from "../../../../lib/pdfGeneratorNode";
import { generateCrewExcelNode } from "../../../../lib/excelGeneratorNode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getDepartmentCrewData = unstable_cache(
  async (departmentSlug) => {
    // Query using ONLY views - no direct table access
    const query = `
      SELECT 
        ds.Department,
        ds.Skill,
        ds.SkillSort,
        f.DisplayName as FreelancerName
      FROM ${VIEWS.DEPARTMENTS_SKILLS} ds
      INNER JOIN ${VIEWS.FREELANCER_SKILLS} fs ON ds.SkillID = fs.SkillID
      INNER JOIN ${VIEWS.FREELANCERS} f ON fs.FreelancerID = f.FreelancerID
      WHERE ds.DepartmentSlug = @deptSlug
      ORDER BY ds.SkillSort, f.DisplayName
    `;

    const rows = await executeQuery(query, { deptSlug: departmentSlug });

    if (rows.length === 0) {
      return null;
    }

    const departmentName = rows[0].Department;

    // Organize data: { "Skill Name": [crew] }
    const crewData = {};

    rows.forEach((row) => {
      const skillName = row.Skill;
      const crewMember = {
        name: row.FreelancerName,
      };

      if (!crewData[skillName]) {
        crewData[skillName] = [];
      }

      crewData[skillName].push(crewMember);
    });

    return { departmentName, crewData };
  },
  ["crew-download-department"],
  {
    revalidate: 3600,
    tags: ["crew-directory"],
  }
);

export async function GET(request, { params }) {
  try {
    const { departmentSlug } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    if (!format || !["pdf", "xlsx"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Use 'pdf' or 'xlsx'" },
        { status: 400 }
      );
    }

    const result = await getDepartmentCrewData(departmentSlug);

    if (!result) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    const { departmentName, crewData } = result;

    let buffer;
    let contentType;
    let filename;

    if (format === "pdf") {
      buffer = await generateCrewPDFNode(departmentName, crewData);
      contentType = "application/pdf";
      filename = `${departmentName}.pdf`; // ✅ Uses department name
    } else {
      buffer = await generateCrewExcelNode(departmentName, crewData);
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = `${departmentName}.xlsx`; // ✅ Uses department name
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
