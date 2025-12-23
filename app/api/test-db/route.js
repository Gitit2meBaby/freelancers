import sql from "mssql";
import { NextResponse } from "next/server";

// Database configuration
const config = {
  server: "fps01.database.windows.net",
  port: 1433,
  database: "fpsdb01",
  user: "webdeveloper2",
  password: "lS946TibYK4A7zKQy63t",
  options: {
    encrypt: true, // Azure requires encryption
    trustServerCertificate: false,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

export async function GET(request) {
  try {
    console.log("🔌 Attempting to connect to Azure SQL Database...");

    // Connect to database
    const pool = await sql.connect(config);
    console.log("✅ Connected to database successfully!");

    // Test all 4 views
    const results = {};

    // 1. Freelancers List
    console.log("📊 Fetching from vwFreelancersListWEB2...");
    const freelancersResult = await pool
      .request()
      .query("SELECT TOP 5 * FROM vwFreelancersListWEB2");
    results.freelancers = {
      count: freelancersResult.recordset.length,
      sample: freelancersResult.recordset,
    };
    console.log(
      `✅ Found ${freelancersResult.recordset.length} freelancers (showing top 5)`
    );

    // 2. Freelancer Links
    console.log("📊 Fetching from vwFreelancerLinksWEB2...");
    const linksResult = await pool
      .request()
      .query("SELECT TOP 10 * FROM vwFreelancerLinksWEB2");
    results.links = {
      count: linksResult.recordset.length,
      sample: linksResult.recordset,
    };
    console.log(
      `✅ Found ${linksResult.recordset.length} links (showing top 10)`
    );

    // 3. Departments and Skills
    console.log("📊 Fetching from vwDepartmentsAndSkillsListWEB2...");
    const deptSkillsResult = await pool
      .request()
      .query("SELECT * FROM vwDepartmentsAndSkillsListWEB2");
    results.departmentsAndSkills = {
      count: deptSkillsResult.recordset.length,
      sample: deptSkillsResult.recordset.slice(0, 10),
    };
    console.log(
      `✅ Found ${deptSkillsResult.recordset.length} departments/skills (showing top 10)`
    );

    // 4. Freelancer Skills
    console.log("📊 Fetching from vwFreelancerSkillsListWEB2...");
    const freelancerSkillsResult = await pool
      .request()
      .query("SELECT TOP 10 * FROM vwFreelancerSkillsListWEB2");
    results.freelancerSkills = {
      count: freelancerSkillsResult.recordset.length,
      sample: freelancerSkillsResult.recordset,
    };
    console.log(
      `✅ Found ${freelancerSkillsResult.recordset.length} freelancer skills (showing top 10)`
    );

    // Get total counts
    console.log("📊 Getting total counts...");
    const countsResult = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM vwFreelancersListWEB2) as totalFreelancers,
        (SELECT COUNT(*) FROM vwFreelancerLinksWEB2) as totalLinks,
        (SELECT COUNT(*) FROM vwDepartmentsAndSkillsListWEB2) as totalDeptSkills,
        (SELECT COUNT(*) FROM vwFreelancerSkillsListWEB2) as totalFreelancerSkills
    `);

    results.totals = countsResult.recordset[0];

    // Close the connection
    await pool.close();
    console.log("✅ Database connection closed");

    return NextResponse.json({
      success: true,
      message: "Database connection successful!",
      timestamp: new Date().toISOString(),
      totals: results.totals,
      samples: {
        freelancers: results.freelancers,
        links: results.links,
        departmentsAndSkills: results.departmentsAndSkills,
        freelancerSkills: results.freelancerSkills,
      },
    });
  } catch (error) {
    console.error("❌ Database error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          number: error.number,
          state: error.state,
          class: error.class,
          serverName: error.serverName,
          procName: error.procName,
          lineNumber: error.lineNumber,
        },
      },
      { status: 500 }
    );
  }
}
