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
 * Cached function to fetch freelancer profile from existing API
 * This avoids schema/column name issues by using the working API
 */
const getCachedFreelancerProfile = unstable_cache(
  async (slug) => {
    try {
      // Use the existing API that already works
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/freelancer/${slug}`, {
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  },
  ["freelancer-profile"],
  {
    revalidate: 3600,
    tags: ["freelancers"],
  },
);

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
