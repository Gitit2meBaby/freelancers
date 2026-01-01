// app/api/test-connection/route.js
import { NextResponse } from "next/server";
import { testConnection, executeQuery, VIEWS } from "../../lib/db";

export async function GET(request) {
  try {
    console.log("🔌 Testing database connection...");

    // Test basic connection
    const isConnected = await testConnection();

    if (!isConnected) {
      return NextResponse.json(
        { success: false, error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Test reading from Services view
    console.log("📊 Fetching services data...");
    const services = await executeQuery(
      `SELECT TOP 5 * FROM ${VIEWS.SERVICES}`
    );

    // Test reading from Categories view
    console.log("📊 Fetching categories data...");
    const categories = await executeQuery(
      `SELECT TOP 5 * FROM ${VIEWS.CATEGORIES}`
    );

    return NextResponse.json({
      success: true,
      message: "Database connection successful!",
      timestamp: new Date().toISOString(),
      data: {
        servicesCount: services.length,
        categoriesCount: categories.length,
        sampleServices: services,
        sampleCategories: categories,
      },
    });
  } catch (error) {
    console.error("❌ Connection test error:", error);
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
