// app/my-account/[slug]/page.js
// Server Component with ISR that delegates rendering to client component for validation

import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";

import News from "../../components/News";
import ProfileContent from "./(components)/ProfileContent";

import styles from "../../styles/profile.module.scss";

// Enable ISR - revalidate every hour
export const revalidate = 3600;
// Allow dynamic params - don't pre-generate at build time
export const dynamicParams = true;

/**
 * Cached function to fetch freelancer profile from existing API.
 *
 * FIX (2026-04-10): Cache key now includes the slug — previously all profiles
 * shared the key "freelancer-profile", meaning the first profile loaded would
 * be served to every subsequent slug for up to an hour. This caused users to
 * see stale/wrong profile data and refresh repeatedly, generating unnecessary
 * DB hits.
 *
 * With per-slug keys, each freelancer gets their own cache entry. ~500 entries
 * at a few KB each is well within B1 memory limits.
 */
const getCachedFreelancerProfile = (slug) =>
  unstable_cache(
    async () => {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const apiUrl = `${baseUrl}/api/freelancer/${slug}`;

        console.log("🔍 Fetching profile:", {
          slug,
          baseUrl,
          apiUrl,
          hasNEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
        });

        const response = await fetch(apiUrl, {
          next: { revalidate: 3600 },
        });

        console.log("📡 API Response:", {
          status: response.status,
          ok: response.ok,
          url: response.url,
        });

        if (!response.ok) {
          console.error("❌ API returned error:", response.status);
          return null;
        }

        const result = await response.json();
        console.log("✅ Profile data received:", result.data?.name);
        return result.data;
      } catch (error) {
        console.error("❌ Error fetching profile:", error.message, error);
        return null;
      }
    },
    // KEY FIX: include slug in the cache key so each profile gets its own slot.
    // Previously ["freelancer-profile"] was shared across ALL slugs — the first
    // profile loaded would be returned for every subsequent slug for up to 1hr.
    [`freelancer-profile-${slug}`],
    {
      revalidate: 3600,
      tags: ["freelancers"],
    },
  )();

/**
 * Server Component - Fetches data with ISR
 * Renders ProfileContent client component for validation logic
 */
export default async function UserProfilePage({ params }) {
  const { slug } = await params;
  const profileData = await getCachedFreelancerProfile(slug);

  // Show 404 if profile not found
  if (!profileData) {
    notFound();
  }

  return (
    <section
      className={styles.profilePage}
      data-footer="noBorder"
      data-page="plain"
    >
      {/* Client component handles photo/equipment validation */}
      <ProfileContent profileData={profileData} />

      <News />
    </section>
  );
}

/**
 * Generate metadata for each profile page
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    const profileData = await getCachedFreelancerProfile(slug);

    if (!profileData) {
      return {
        title: "Profile Not Found - Freelancers Promotions",
      };
    }

    const role = profileData.skills?.[0]?.skillName || "Film Crew Member";
    const title = `${profileData.name} - ${role} | Freelancers Promotions`;
    const description =
      profileData.bio ||
      `${profileData.name} is a ${role} available for film and television production work in Melbourne and Australia.`;

    return {
      title,
      description,
      alternates: {
        canonical: `https://freelancers.com.au/my-account/${slug}`,
      },
      openGraph: {
        title,
        description,
        url: `https://freelancers.com.au/my-account/${slug}`,
        type: "profile",
        images: profileData.photoUrl ? [profileData.photoUrl] : [],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Profile - Freelancers Promotions",
    };
  }
}
