// app/api/screen-services/route.js
import { NextResponse } from "next/server";
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

export async function GET(request) {
  try {
    console.log("📊 Fetching screen services...");

    // The SERVICE_CATEGORIES
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

    // Build unique categories map
    const categoriesMap = new Map();

    // Build unique services map
    const servicesMap = new Map();

    // Process results
    results.forEach((row) => {
      // Add category if not exists
      if (!categoriesMap.has(row.CategoryID)) {
        categoriesMap.set(row.CategoryID, {
          id: row.CategoryID,
          name: row.Category,
          slug: generateSlug(row.Category),
          services: [],
        });
      }

      // Add service if not exists
      if (!servicesMap.has(row.ServiceID)) {
        const service = {
          id: row.ServiceID,
          name: row.Service,
          slug: generateSlug(row.Service),
          websiteUrl: row.WebsiteURL,
          logoUrl: row.LogoBlobID ? getBlobUrl(row.LogoBlobID) : null,
          logoBlobId: row.LogoBlobID,
          categories: [],
        };
        servicesMap.set(row.ServiceID, service);
      }

      // Link service to category
      const category = categoriesMap.get(row.CategoryID);
      const service = servicesMap.get(row.ServiceID);

      // Add service to category's services array
      if (!category.services.find((s) => s.id === service.id)) {
        category.services.push(service);
      }

      // Add category to service's categories array
      if (!service.categories.find((c) => c.id === category.id)) {
        service.categories.push({
          id: category.id,
          name: category.name,
          slug: category.slug,
        });
      }
    });

    // Convert maps to arrays
    const categories = Array.from(categoriesMap.values()).map((cat) => ({
      ...cat,
      serviceCount: cat.services.length,
    }));

    const services = Array.from(servicesMap.values());

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        services,
        categories,
        totalServices: services.length,
        totalCategories: categories.length,
      },
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
