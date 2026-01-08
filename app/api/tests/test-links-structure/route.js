// app/api/test-links-structure/route.js
import { NextResponse } from "next/server";
import { executeQuery, VIEWS, TABLES } from "@/app/lib/db";

export async function GET() {
  const results = {};

  try {
    // TEST 1: Query the VIEW to see what columns it has
    console.log("📊 Test 1: Querying VIEW...");
    try {
      const viewQuery = `SELECT TOP 1 * FROM ${VIEWS.FREELANCER_LINKS}`;
      const viewResult = await executeQuery(viewQuery, {});

      results.view = {
        success: true,
        name: VIEWS.FREELANCER_LINKS,
        columns: viewResult.length > 0 ? Object.keys(viewResult[0]) : [],
        sampleData: viewResult[0] || null,
      };
    } catch (error) {
      results.view = { success: false, error: error.message };
    }

    // TEST 2: Try to query the TABLE
    console.log("📊 Test 2: Querying TABLE...");
    try {
      const tableQuery = `SELECT TOP 1 * FROM ${TABLES.FREELANCER_WEBSITE_DATA_LINKS}`;
      const tableResult = await executeQuery(tableQuery, {});

      results.table = {
        success: true,
        name: TABLES.FREELANCER_WEBSITE_DATA_LINKS,
        columns: tableResult.length > 0 ? Object.keys(tableResult[0]) : [],
        sampleData: tableResult[0] || null,
      };
    } catch (error) {
      results.table = { success: false, error: error.message };
    }

    // TEST 3: List all tables with "Link" in the name
    console.log("📊 Test 3: Finding all Link tables...");
    try {
      const allTablesQuery = `
        SELECT TABLE_NAME, TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME LIKE '%Link%'
        OR TABLE_NAME LIKE '%link%'
        ORDER BY TABLE_NAME
      `;
      const allTables = await executeQuery(allTablesQuery, {});
      results.allLinkTables = {
        success: true,
        tables: allTables,
      };
    } catch (error) {
      results.allLinkTables = { success: false, error: error.message };
    }

    // TEST 4: Try common table name variations
    console.log("📊 Test 4: Trying common variations...");
    const variations = [
      "tblFreelancerWebsiteDataLinks",
      "tblFreelancerLinks",
      "tblLinks",
      "FreelancerWebsiteDataLinks",
      "FreelancerLinks",
    ];

    results.variations = [];
    for (const tableName of variations) {
      try {
        const testQuery = `SELECT TOP 1 * FROM ${tableName}`;
        const testResult = await executeQuery(testQuery, {});
        results.variations.push({
          tableName,
          success: true,
          columns: testResult.length > 0 ? Object.keys(testResult[0]) : [],
        });
      } catch (error) {
        results.variations.push({
          tableName,
          success: false,
          error: error.message.substring(0, 100),
        });
      }
    }

    // TEST 5: Get schema info for any table matching our pattern
    console.log("📊 Test 5: Schema lookup...");
    try {
      const schemaQuery = `
        SELECT 
          TABLE_NAME,
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME LIKE '%Freelancer%Link%'
        OR TABLE_NAME LIKE '%Website%Link%'
        ORDER BY TABLE_NAME, ORDINAL_POSITION
      `;
      const schema = await executeQuery(schemaQuery, {});

      // Group by table name
      const groupedSchema = {};
      schema.forEach((col) => {
        if (!groupedSchema[col.TABLE_NAME]) {
          groupedSchema[col.TABLE_NAME] = [];
        }
        groupedSchema[col.TABLE_NAME].push({
          column: col.COLUMN_NAME,
          type: col.DATA_TYPE,
          nullable: col.IS_NULLABLE,
        });
      });

      results.schema = {
        success: true,
        tables: groupedSchema,
      };
    } catch (error) {
      results.schema = { success: false, error: error.message };
    }

    return NextResponse.json(
      {
        success: true,
        message: "🔍 Comprehensive table structure analysis",
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        results,
      },
      { status: 500 }
    );
  }
}
