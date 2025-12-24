// app/api/profile/[slug]/route.js
import { NextResponse } from "next/server";
import odbc from "odbc"; // or your ODBC library

const connectionString = process.env.ODBC_CONNECTION_STRING;

export async function GET(request, { params }) {
  try {
    const { slug } = params;

    // Connect to Access database via ODBC
    const connection = await odbc.connect(connectionString);

    // Query to get user profile data
    const query = `
      SELECT 
        crew.id,
        crew.name,
        crew.slug,
        crew.bio,
        crew.role,
        crew.website,
        crew.instagram,
        crew.linkedin,
        crew.imdb,
        crew.image_blob_id,
        crew.resume_blob_id
      FROM crew
      WHERE crew.slug = ?
    `;

    const result = await connection.query(query, [slug]);

    if (result.length === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profileData = result[0];

    // Fetch image URL from Azure Blob Storage
    if (profileData.image_blob_id) {
      profileData.image_url = `https://yourstorageaccount.blob.core.windows.net/images/${profileData.image_blob_id}`;
    }

    // Fetch resume URL from Azure Blob Storage
    if (profileData.resume_blob_id) {
      profileData.resume_url = `https://yourstorageaccount.blob.core.windows.net/resumes/${profileData.resume_blob_id}`;
    }

    // Fetch categories (if in separate table)
    const categoriesQuery = `
      SELECT category_name 
      FROM crew_categories 
      WHERE crew_id = ?
    `;
    const categories = await connection.query(categoriesQuery, [
      profileData.id,
    ]);
    profileData.categories = categories.map((c) => c.category_name);

    await connection.close();

    return NextResponse.json(profileData);
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
