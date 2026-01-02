// app/api/screen-services/[slug]/route.js
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { executeQuery, VIEWS } from "../../../lib/db";
import { getBlobUrl } from "../../../lib/azureBlob";

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

/**
 * Cached function to get all screen services data
 */
const getAllScreenServices = unstable_cache(
  async () => {
    const query = `
      SELECT 
        ServiceCategoryID,
        ServiceID,
        Service,
        CategoryID,
        Category,
        WebsiteURL,
        LogoBlobID
      FROM ${VIEWS.SERVICE_CATEGORIES}
      ORDER BY Service
    `;

    return await executeQuery(query);
  },
  ["screen-services-raw-data"],
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ["screen-services"],
  }
);

export async function GET(request, { params }) {
  try {
    // IMPORTANT: In Next.js 15+, params is a Promise
    const { slug } = await params;

    console.log(`📊 Fetching services for category slug: ${slug}`);

    // Get cached data
    const allResults = await getAllScreenServices();

    console.log(`📊 Total rows from cache: ${allResults.length}`);

    // Find all rows that match the category slug
    const matchingRows = allResults.filter((row) => {
      const categorySlug = generateSlug(row.Category);
      return categorySlug === slug;
    });

    console.log(`📊 Matching rows for slug "${slug}": ${matchingRows.length}`);

    if (matchingRows.length === 0) {
      console.log(`❌ No category found with slug: ${slug}`);
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Extract category info from first matching row
    const matchedCategory = {
      id: matchingRows[0].CategoryID,
      name: matchingRows[0].Category,
      slug: generateSlug(matchingRows[0].Category),
    };

    // Build unique services list for this category
    const servicesMap = new Map();

    matchingRows.forEach((row) => {
      if (!servicesMap.has(row.ServiceID)) {
        servicesMap.set(row.ServiceID, {
          id: row.ServiceID,
          name: row.Service,
          slug: generateSlug(row.Service),
          websiteUrl: row.WebsiteURL,
          logoUrl: row.LogoBlobID ? getBlobUrl(row.LogoBlobID) : null,
          logoBlobId: row.LogoBlobID,
        });
      }
    });

    const servicesForCategory = Array.from(servicesMap.values());

    console.log(
      `✅ Found ${servicesForCategory.length} services for category: ${matchedCategory.name}`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cached: true,
      data: {
        category: matchedCategory,
        services: servicesForCategory,
        serviceCount: servicesForCategory.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching category services:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
