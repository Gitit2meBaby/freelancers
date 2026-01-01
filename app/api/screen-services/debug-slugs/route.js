// app/api/screen-services/debug-slugs/route.js
import { NextResponse } from "next/server";
import { executeQuery, VIEWS } from "../../../lib/db";

/**
 * Generates a URL-friendly slug from a name
 */
function generateSlug(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(request) {
  try {
    const query = `
      SELECT DISTINCT
        CategoryID,
        Category
      FROM ${VIEWS.SERVICE_CATEGORIES}
      ORDER BY Category
    `;

    const results = await executeQuery(query);

    const categories = results.map((row) => ({
      id: row.CategoryID,
      name: row.Category,
      slug: generateSlug(row.Category),
      url: `/api/screen-services/${generateSlug(row.Category)}`,
    }));

    return NextResponse.json({
      success: true,
      message: "All available category slugs",
      categories,
      totalCategories: categories.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
