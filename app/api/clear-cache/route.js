// app/api/clear-cache/route.js
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

/**
 * POST /api/clear-cache
 * Clears Next.js cache for the current user's profile
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.slug) {
      return NextResponse.json(
        { success: false, error: "Not logged in" },
        { status: 401 }
      );
    }

    const slug = session.user.slug;

    // Clear cache for user's profile endpoint
    revalidatePath(`/api/freelancer/${slug}`);

    // Clear cache tags
    revalidateTag("freelancers");
    revalidateTag(`freelancer-${slug}`);

    // Clear crew directory caches
    revalidatePath("/crew-directory");

    console.log(`🗑️ Cache cleared for: ${slug}`);

    return NextResponse.json({
      success: true,
      message: `Cache cleared for ${slug}`,
      clearedPaths: [`/api/freelancer/${slug}`, "/crew-directory"],
      nextStep: "Refresh the page to see updated data",
    });
  } catch (error) {
    console.error("❌ Error clearing cache:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "This is a POST endpoint. Use POST method to clear cache.",
    usage: "fetch('/api/clear-cache', { method: 'POST' })",
  });
}
