import sql from "mssql";
import { NextResponse } from "next/server";

const config = {
  server: "fps01.database.windows.net",
  port: 1433,
  database: "fpsdb01",
  user: "webdeveloper2",
  password: "lS946TibYK4A7zKQy63t",
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
  },
};

export async function GET(request) {
  try {
    const pool = await sql.connect(config);
    console.log("✅ Connected to database");

    const views = [
      "vwFreelancersListWEB2",
      "vwFreelancerLinksWEB2",
      "vwDepartmentsAndSkillsListWEB2",
      "vwFreelancerSkillsListWEB2",
    ];

    const schemasInfo = {};

    for (const viewName of views) {
      console.log(`\n📊 Inspecting view: ${viewName}`);

      // Get column information
      const schemaQuery = `
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          IS_NULLABLE,
          COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${viewName}'
        ORDER BY ORDINAL_POSITION
      `;

      const schemaResult = await pool.request().query(schemaQuery);

      // Get a sample record to see actual data
      const sampleQuery = `SELECT TOP 1 * FROM ${viewName}`;
      const sampleResult = await pool.request().query(sampleQuery);

      schemasInfo[viewName] = {
        columns: schemaResult.recordset,
        sampleRecord: sampleResult.recordset[0] || null,
        columnNames: schemaResult.recordset.map((col) => col.COLUMN_NAME),
      };

      console.log(`✅ ${viewName}: ${schemaResult.recordset.length} columns`);
    }

    await pool.close();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      schemas: schemasInfo,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
