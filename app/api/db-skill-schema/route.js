// app/api/db-skill-schema/route.js
import { NextResponse } from "next/server";
import { executeQuery, VIEWS } from "../../lib/db";

export async function GET(request) {
  try {
    const results = {};

    // Test each view with SELECT TOP 1 to see columns
    const views = {
      freelancers: VIEWS.FREELANCERS,
      freelancerLinks: VIEWS.FREELANCER_LINKS,
      departmentsSkills: VIEWS.DEPARTMENTS_SKILLS,
      freelancerSkills: VIEWS.FREELANCER_SKILLS,
    };

    for (const [name, viewName] of Object.entries(views)) {
      try {
        const query = `SELECT TOP 1 * FROM ${viewName}`;
        const data = await executeQuery(query);

        if (data && data.length > 0) {
          results[name] = {
            viewName: viewName,
            columns: Object.keys(data[0]),
            sampleData: data[0],
          };
        } else {
          results[name] = {
            viewName: viewName,
            error: "No data returned",
          };
        }
      } catch (error) {
        results[name] = {
          viewName: viewName,
          error: error.message,
        };
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error inspecting schema:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
