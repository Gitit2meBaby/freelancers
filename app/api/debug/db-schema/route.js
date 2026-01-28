// app/api/debug/db-schema/route.js
import { NextResponse } from "next/server";
import { executeQuery } from "../../../lib/db";

export async function GET() {
  try {
    console.log("🔍 Inspecting database schema...");

    // Get all columns from the Freelancers view/table
    const columnsQuery = `
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME LIKE '%Freelancer%'
        OR TABLE_NAME LIKE '%freelancer%'
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `;

    const columns = await executeQuery(columnsQuery);

    // Group by table name
    const tableGroups = {};
    columns.forEach((col) => {
      if (!tableGroups[col.TABLE_NAME]) {
        tableGroups[col.TABLE_NAME] = [];
      }
      tableGroups[col.TABLE_NAME].push({
        column: col.COLUMN_NAME,
        type: col.DATA_TYPE,
        maxLength: col.CHARACTER_MAXIMUM_LENGTH,
        nullable: col.IS_NULLABLE,
      });
    });

    // Also search specifically for Equipment columns
    const equipmentQuery = `
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME LIKE '%Equipment%'
        OR COLUMN_NAME LIKE '%equipment%'
      ORDER BY TABLE_NAME, COLUMN_NAME
    `;

    const equipmentColumns = await executeQuery(equipmentQuery);

    // Search for any Blob-related columns
    const blobQuery = `
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME LIKE '%Blob%'
        OR COLUMN_NAME LIKE '%blob%'
      ORDER BY TABLE_NAME, COLUMN_NAME
    `;

    const blobColumns = await executeQuery(blobQuery);

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalTables: Object.keys(tableGroups).length,
          totalColumns: columns.length,
          equipmentColumnsFound: equipmentColumns.length,
          blobColumnsFound: blobColumns.length,
        },
        allFreelancerTables: tableGroups,
        equipmentColumns: equipmentColumns,
        allBlobColumns: blobColumns,
        hint: "Look for the exact column name in 'allBlobColumns' or 'equipmentColumns'",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("❌ Schema inspection failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
