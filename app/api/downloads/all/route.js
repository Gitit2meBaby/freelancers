// app/api/downloads/all/route.js
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { executeQuery, VIEWS } from "../../../lib/db";
import { generateCrewPDFNode } from "../../../lib/pdfGeneratorNode";
import { generateCrewExcelNode } from "../../../lib/excelGeneratorNode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getAllCrewData = unstable_cache(
  async () => {
    // Query using ONLY views - no direct table access
    const query = `
      SELECT 
        ds.Department,
        ds.DepartmentSort,
        ds.Skill,
        ds.SkillSort,
        f.DisplayName as FreelancerName
      FROM ${VIEWS.DEPARTMENTS_SKILLS} ds
      INNER JOIN ${VIEWS.FREELANCER_SKILLS} fs ON ds.SkillID = fs.SkillID
      INNER JOIN ${VIEWS.FREELANCERS} f ON fs.FreelancerID = f.FreelancerID
      ORDER BY ds.DepartmentSort, ds.SkillSort, f.DisplayName
    `;

    const rows = await executeQuery(query);

    // Organize data: { "Department Name": { "Skill Name": [crew] } }
    const crewData = {};

    rows.forEach((row) => {
      const deptName = row.Department;
      const skillName = row.Skill;
      const crewMember = {
        name: row.FreelancerName,
      };

      if (!crewData[deptName]) {
        crewData[deptName] = {};
      }

      if (!crewData[deptName][skillName]) {
        crewData[deptName][skillName] = [];
      }

      crewData[deptName][skillName].push(crewMember);
    });

    return crewData;
  },
  ["crew-download-all"],
  {
    revalidate: 3600,
    tags: ["crew-directory"],
  }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    if (!format || !["pdf", "xlsx"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Use 'pdf' or 'xlsx'" },
        { status: 400 }
      );
    }

    const crewData = await getAllCrewData();

    if (!crewData || Object.keys(crewData).length === 0) {
      return NextResponse.json(
        { error: "No crew data found" },
        { status: 404 }
      );
    }

    let buffer;
    let contentType;
    let filename;

    if (format === "pdf") {
      buffer = await generateCrewPDFNode("All Crew", crewData);
      contentType = "application/pdf";
      filename = "Crew List.pdf"; // ✅ Simple filename
    } else {
      buffer = await generateCrewExcelNode("All Crew", crewData);
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = "Crew List.xlsx"; // ✅ Simple filename
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
