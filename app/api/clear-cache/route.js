// app/api/clear-cache/route.js - UPDATED WITH NEWS CACHE
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

/**
 * POST /api/clear-cache
 * Clears Next.js cache for the current user's profile and all related caches
 * Also clears news cache if user is admin
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
    const isAdmin = session.user?.isAdmin || false;

    // Revalidate freelancer cache tags
    revalidateTag("freelancers");
    revalidateTag("freelancer-data-raw");
    revalidateTag("crew-directory");
    revalidateTag("crew-directory-all");
    revalidateTag("crew-directory-raw-data");
    revalidateTag("crew-directory-freelancers-raw");
    revalidateTag(`freelancer-${slug}`);

    const clearedTags = [
      "freelancers",
      "freelancer-data-raw",
      "crew-directory",
      "crew-directory-all",
      "crew-directory-raw-data",
      "crew-directory-freelancers-raw",
      `freelancer-${slug}`,
    ];

    // Revalidate paths
    revalidatePath(`/api/freelancer/${slug}`, "page");
    revalidatePath(`/my-account/${slug}`, "page");
    revalidatePath("/crew-directory", "page");
    revalidatePath("/api/crew-directory", "page");

    const clearedPaths = [
      `/api/freelancer/${slug}`,
      `/my-account/${slug}`,
      "/crew-directory",
      "/api/crew-directory",
    ];

    // If admin, also clear news cache
    if (isAdmin) {
      revalidateTag("news");
      revalidateTag("news-items");
      revalidatePath("/api/news", "page");
      revalidatePath("/api/admin/news", "page");

      clearedTags.push("news", "news-items");
      clearedPaths.push("/api/news", "/api/admin/news");
    }

    return NextResponse.json({
      success: true,
      message: `Cache cleared for ${slug}${
        isAdmin ? " (including news cache)" : ""
      }`,
      clearedTags,
      clearedPaths,
      nextStep:
        "Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R) to see updated data",
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
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
    availableTags: [
      "freelancers",
      "freelancer-data-raw",
      "crew-directory",
      "crew-directory-all",
      "crew-directory-raw-data",
      "crew-directory-freelancers-raw",
      "news (admin only)",
      "news-items (admin only)",
    ],
  });
}
