// app/api/db-schema/route.js
import { NextResponse } from "next/server";
import { executeQuery, VIEWS } from "../../../lib/db";

export async function GET(request) {
  try {
    // Get sample records to see actual column names
    const servicesQuery = `SELECT TOP 1 * FROM ${VIEWS.SERVICES}`;
    const categoriesQuery = `SELECT TOP 1 * FROM ${VIEWS.CATEGORIES}`;
    const serviceCategoriesQuery = `SELECT TOP 1 * FROM ${VIEWS.SERVICE_CATEGORIES}`;

    const [services, categories, serviceCategories] = await Promise.all([
      executeQuery(servicesQuery),
      executeQuery(categoriesQuery),
      executeQuery(serviceCategoriesQuery),
    ]);

    return NextResponse.json({
      success: true,
      schema: {
        services: {
          columns: services[0] ? Object.keys(services[0]) : [],
          sample: services[0] || null,
        },
        categories: {
          columns: categories[0] ? Object.keys(categories[0]) : [],
          sample: categories[0] || null,
        },
        serviceCategories: {
          columns: serviceCategories[0]
            ? Object.keys(serviceCategories[0])
            : [],
          sample: serviceCategories[0] || null,
        },
      },
    });
  } catch (error) {
    console.error("❌ Schema check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
