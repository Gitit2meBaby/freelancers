// /api/test-query/route.js

import sql from "mssql";
import { NextResponse } from "next/server";
import { dbConfig, VIEWS } from "@/lib/db";

/**
 * Test API endpoint for running custom queries
 * Supports query parameters for testing specific scenarios
 *
 * Examples:
 * /api/test-query?type=freelancer-by-slug&slug=john-smith
 * /api/test-query?type=department-skills
 * /api/test-query?type=freelancer-with-links&id=123
 */
export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const queryType = searchParams.get("type");
  const slug = searchParams.get("slug");
  const id = searchParams.get("id");

  let pool;

  try {
    pool = await sql.connect(dbConfig);
    console.log("✅ Connected to database");

    let result = {};

    switch (queryType) {
      case "freelancer-by-slug":
        if (!slug) {
          return NextResponse.json(
            { error: "slug parameter required" },
            { status: 400 }
          );
        }
        console.log(`🔍 Searching for freelancer with slug: ${slug}`);
        const freelancerResult = await pool
          .request()
          .input("slug", sql.NVarChar, slug).query(`
            SELECT * FROM ${VIEWS.FREELANCERS}
            WHERE Slug = @slug
          `);
        result = {
          freelancer: freelancerResult.recordset[0] || null,
          found: freelancerResult.recordset.length > 0,
        };
        break;

      case "freelancer-with-links":
        const freelancerId = id || searchParams.get("freelancerId");
        if (!freelancerId) {
          return NextResponse.json(
            { error: "id or freelancerId parameter required" },
            { status: 400 }
          );
        }
        console.log(`🔍 Fetching freelancer and links for ID: ${freelancerId}`);

        // Get freelancer
        const flResult = await pool
          .request()
          .input("id", sql.Int, freelancerId)
          .query(`SELECT * FROM ${VIEWS.FREELANCERS} WHERE FreelancerID = @id`);

        // Get links
        const linksResult = await pool
          .request()
          .input("id", sql.Int, freelancerId)
          .query(
            `SELECT * FROM ${VIEWS.FREELANCER_LINKS} WHERE FreelancerID = @id`
          );

        // Get skills
        const skillsResult = await pool
          .request()
          .input("id", sql.Int, freelancerId)
          .query(
            `SELECT * FROM ${VIEWS.FREELANCER_SKILLS} WHERE FreelancerID = @id`
          );

        result = {
          freelancer: flResult.recordset[0] || null,
          links: linksResult.recordset,
          skills: skillsResult.recordset,
        };
        break;

      case "department-skills":
        console.log("🔍 Fetching all departments and skills");
        const deptSkillsResult = await pool.request().query(`
            SELECT * FROM ${VIEWS.DEPARTMENTS_SKILLS}
            ORDER BY DepartmentName, SkillName
          `);
        result = {
          departments: deptSkillsResult.recordset,
          count: deptSkillsResult.recordset.length,
        };
        break;

      case "slugs-overview":
        console.log("🔍 Getting overview of all slugs");

        // Freelancer slugs
        const freelancerSlugs = await pool
          .request()
          .query(`SELECT TOP 10 Slug, DisplayName FROM ${VIEWS.FREELANCERS}`);

        // Department/Skill slugs
        const deptSkillSlugs = await pool
          .request()
          .query(
            `SELECT TOP 10 Slug, DepartmentName, SkillName FROM ${VIEWS.DEPARTMENTS_SKILLS}`
          );

        result = {
          freelancerSlugs: freelancerSlugs.recordset,
          departmentSkillSlugs: deptSkillSlugs.recordset,
        };
        break;

      case "search-freelancers":
        const searchTerm = searchParams.get("search");
        if (!searchTerm) {
          return NextResponse.json(
            { error: "search parameter required" },
            { status: 400 }
          );
        }
        console.log(`🔍 Searching freelancers with term: ${searchTerm}`);
        const searchResult = await pool
          .request()
          .input("search", sql.NVarChar, `%${searchTerm}%`).query(`
            SELECT TOP 10 * FROM ${VIEWS.FREELANCERS}
            WHERE DisplayName LIKE @search
               OR FreelancerBio LIKE @search
          `);
        result = {
          results: searchResult.recordset,
          count: searchResult.recordset.length,
          searchTerm: searchTerm,
        };
        break;

      case "blob-ids":
        console.log("🔍 Fetching freelancers with blob IDs");
        const blobResult = await pool.request().query(`
            SELECT TOP 10 
              FreelancerID,
              DisplayName,
              PhotoBlobID,
              PhotoStatusID,
              CVBlobID,
              CVStatusID,
              Slug
            FROM ${VIEWS.FREELANCERS}
            WHERE PhotoBlobID IS NOT NULL OR CVBlobID IS NOT NULL
          `);
        result = {
          freelancersWithBlobs: blobResult.recordset,
          count: blobResult.recordset.length,
        };
        break;

      default:
        // Default: show available query types
        result = {
          message: "Available query types",
          queryTypes: [
            {
              type: "freelancer-by-slug",
              description: "Get freelancer by slug",
              example:
                "/api/test-query?type=freelancer-by-slug&slug=john-smith",
              params: ["slug (required)"],
            },
            {
              type: "freelancer-with-links",
              description: "Get freelancer with all links and skills",
              example: "/api/test-query?type=freelancer-with-links&id=123",
              params: ["id or freelancerId (required)"],
            },
            {
              type: "department-skills",
              description: "Get all departments and skills",
              example: "/api/test-query?type=department-skills",
              params: [],
            },
            {
              type: "slugs-overview",
              description: "Get sample slugs from all entities",
              example: "/api/test-query?type=slugs-overview",
              params: [],
            },
            {
              type: "search-freelancers",
              description: "Search freelancers by name or bio",
              example: "/api/test-query?type=search-freelancers&search=camera",
              params: ["search (required)"],
            },
            {
              type: "blob-ids",
              description: "Get freelancers with blob storage IDs",
              example: "/api/test-query?type=blob-ids",
              params: [],
            },
          ],
        };
    }

    await pool.close();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      queryType: queryType || "help",
      data: result,
    });
  } catch (error) {
    console.error("❌ Query error:", error);

    if (pool) {
      await pool.close();
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          number: error.number,
        },
      },
      { status: 500 }
    );
  }
}
