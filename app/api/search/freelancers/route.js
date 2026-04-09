// app/api/search/freelancers/route.js
//
// FIX (2026-04-09): Removed N+1 query pattern.
//
// Previously, after fetching search results, a separate executeQuery() was
// fired per freelancer inside a Promise.all().map() to get their primary skill.
// With 15 results that's 15 concurrent DB round-trips on every search with no
// cache. Under any DB latency this produced the same connection storm pattern
// that killed instance ITY on 05:37 UTC.
//
// Fix: one additional bulk query fetches the primary skill for all result IDs
// in a single IN() clause. Results are assembled in JS via a Map.
//
// NOTE: LIKE queries with a leading wildcard ('%term') are non-sargable —
// SQL Server cannot use an index on DisplayName for these. Acceptable for
// a small crew directory; if the freelancer count grows significantly,
// consider a Full-Text Search index on DisplayName.

import { NextResponse } from "next/server";
import { executeQuery, VIEWS } from "../../../lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("q");
    const departmentSlug = searchParams.get("department");
    const skillSlug = searchParams.get("skill");

    if (!searchTerm || searchTerm.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Search term must be at least 2 characters",
          results: [],
        },
        { status: 400 },
      );
    }

    // --- Step 1: Fetch matching freelancers (single query, parameterised) ---

    let freelancerQuery;
    let freelancerParams = { searchTerm: `%${searchTerm}%` };

    if (skillSlug && departmentSlug) {
      freelancerQuery = `
        SELECT DISTINCT
          f.FreelancerID AS id,
          f.DisplayName  AS name,
          f.Slug         AS slug
        FROM ${VIEWS.FREELANCERS} f
        INNER JOIN ${VIEWS.FREELANCER_SKILLS} fs
          ON f.FreelancerID = fs.FreelancerID
        WHERE f.DisplayName        LIKE @searchTerm
          AND fs.DepartmentSlug    = @departmentSlug
          AND fs.SkillSlug         = @skillSlug
        ORDER BY f.DisplayName
      `;
      freelancerParams.departmentSlug = departmentSlug;
      freelancerParams.skillSlug = skillSlug;
    } else if (departmentSlug) {
      freelancerQuery = `
        SELECT DISTINCT
          f.FreelancerID AS id,
          f.DisplayName  AS name,
          f.Slug         AS slug
        FROM ${VIEWS.FREELANCERS} f
        INNER JOIN ${VIEWS.FREELANCER_SKILLS} fs
          ON f.FreelancerID = fs.FreelancerID
        WHERE f.DisplayName     LIKE @searchTerm
          AND fs.DepartmentSlug = @departmentSlug
        ORDER BY f.DisplayName
      `;
      freelancerParams.departmentSlug = departmentSlug;
    } else {
      freelancerQuery = `
        SELECT
          FreelancerID AS id,
          DisplayName  AS name,
          Slug         AS slug
        FROM ${VIEWS.FREELANCERS}
        WHERE DisplayName LIKE @searchTerm
        ORDER BY DisplayName
      `;
    }

    const results = await executeQuery(freelancerQuery, freelancerParams);

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        query: searchTerm,
        count: 0,
        results: [],
      });
    }

    // --- Step 2: Fetch primary skill for ALL result IDs in one bulk query ---
    //
    // Previously this was results.map(async f => executeQuery(...)) — one query
    // per freelancer. Now it's a single query with an IN() clause, and results
    // are assembled via a Map. Zero extra round-trips regardless of result count.
    //
    // We use ROW_NUMBER() to pick only the top skill per freelancer (lowest
    // DepartmentSort then SkillSort), equivalent to the previous SELECT TOP 1
    // per freelancer.

    // Build the IN list using positional params to avoid SQL injection.
    // mssql's NVarChar input handles sanitisation; we just need unique param names.
    const idParams = {};
    const idPlaceholders = results.map((f, i) => {
      idParams[`fid${i}`] = f.id;
      return `@fid${i}`;
    });

    const skillsBulkQuery = `
      WITH RankedSkills AS (
        SELECT
          fs.FreelancerID,
          ds.Department AS departmentName,
          ds.Skill      AS skillName,
          ROW_NUMBER() OVER (
            PARTITION BY fs.FreelancerID
            ORDER BY ds.DepartmentSort, ds.SkillSort
          ) AS rn
        FROM ${VIEWS.FREELANCER_SKILLS} fs
        INNER JOIN ${VIEWS.DEPARTMENTS_SKILLS} ds
          ON fs.DepartmentSlug = ds.DepartmentSlug
          AND fs.SkillSlug     = ds.SkillSlug
        WHERE fs.FreelancerID IN (${idPlaceholders.join(", ")})
      )
      SELECT FreelancerID, departmentName, skillName
      FROM RankedSkills
      WHERE rn = 1
    `;

    const skillRows = await executeQuery(skillsBulkQuery, idParams);

    // Index by FreelancerID for O(1) lookup
    const skillsByFreelancer = new Map(
      skillRows.map((row) => [
        row.FreelancerID,
        [{ departmentName: row.departmentName, skillName: row.skillName }],
      ]),
    );

    // Assemble final results — pure JS, no further I/O
    const enrichedResults = results.map((freelancer) => ({
      ...freelancer,
      skills: skillsByFreelancer.get(freelancer.id) ?? [],
    }));

    return NextResponse.json({
      success: true,
      query: searchTerm,
      count: enrichedResults.length,
      results: enrichedResults,
    });
  } catch (error) {
    console.error("❌ Search error:", error);
    return NextResponse.json(
      { success: false, error: error.message, results: [] },
      { status: 500 },
    );
  }
}
