// app/api/test-links-columns/route.js
import { NextResponse } from "next/server";
import { executeQuery, TABLES } from "@/app/lib/db";

export async function GET() {
  try {
    console.log("🔍 Discovering actual column names in links table...");

    // Try to select all columns from the table
    const query = `
      SELECT TOP 1 *
      FROM ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}
    `;

    const result = await executeQuery(query, {});

    if (result.length > 0) {
      const columnNames = Object.keys(result[0]);

      return NextResponse.json({
        success: true,
        tableName: TABLES.FREELANCER_WEBSITE_DATA_LINKS,
        columnNames: columnNames,
        sampleData: result[0],
        message: "✅ Found the actual column names!",
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Table is empty, but we can still check schema",
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);

    // If that fails, try a safer query
    try {
      const schemaQuery = `
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${TABLES.FREELANCER_WEBSITE_DATA_LINKS.replace(
          "tbl",
          ""
        )}'
        OR TABLE_NAME = '${TABLES.FREELANCER_WEBSITE_DATA_LINKS}'
        ORDER BY ORDINAL_POSITION
      `;

      const schema = await executeQuery(schemaQuery, {});

      return NextResponse.json({
        success: true,
        method: "Schema query",
        columns: schema,
        message: "✅ Got columns from schema",
      });
    } catch (schemaError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          schemaError: schemaError.message,
        },
        { status: 500 }
      );
    }
  }
}
