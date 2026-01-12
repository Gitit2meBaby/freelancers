// app/api/screen-services/route.js
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { executeQuery, VIEWS } from "../../lib/db";
import { getBlobUrl } from "../../lib/azureBlob";

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
 * Cached database query function
 * This will cache results for 1 hour (3600 seconds)
 */
const getCachedScreenServices = unstable_cache(
  async () => {
    // Query the denormalized view that contains all data
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
      ORDER BY Category, Service
    `;

    const results = await executeQuery(query);

    // Build unique services map
    const servicesMap = new Map();
    const categoriesMap = new Map();
    const serviceCategoriesMap = new Map(); // Track which categories each service belongs to

    results.forEach((row) => {
      // Add service
      if (!servicesMap.has(row.ServiceID)) {
        servicesMap.set(row.ServiceID, {
          id: row.ServiceID,
          name: row.Service,
          slug: generateSlug(row.Service),
          websiteUrl: row.WebsiteURL,
          logoUrl: row.LogoBlobID ? getBlobUrl(row.LogoBlobID) : null,
          logoBlobId: row.LogoBlobID,
          categories: [],
        });
      }

      // Add category
      if (!categoriesMap.has(row.CategoryID)) {
        categoriesMap.set(row.CategoryID, {
          id: row.CategoryID,
          name: row.Category,
          slug: generateSlug(row.Category),
          services: [],
        });
      }

      // Link service to category
      const service = servicesMap.get(row.ServiceID);
      const category = categoriesMap.get(row.CategoryID);

      if (!service.categories.some((c) => c.id === category.id)) {
        service.categories.push({
          id: category.id,
          name: category.name,
          slug: category.slug,
        });
      }

      if (!category.services.some((s) => s.id === service.id)) {
        category.services.push({
          id: service.id,
          name: service.name,
          slug: service.slug,
        });
      }
    });

    const services = Array.from(servicesMap.values());
    const categories = Array.from(categoriesMap.values());

    return {
      services,
      categories,
      totalServices: services.length,
      totalCategories: categories.length,
    };
  },
  ["screen-services-all"], // Cache key
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ["screen-services"], // Tag for on-demand revalidation
  }
);

export async function GET(request) {
  try {
    const data = await getCachedScreenServices();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cached: true,
      ...data,
    });
  } catch (error) {
    console.error("❌ Error fetching screen services:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
