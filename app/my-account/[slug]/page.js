// app/my-account/[slug]/page.js
//
// FIX (2026-04-10): Replaced outbound HTTP fetch with direct call to
// getFreelancerProfile() from lib/freelancerData.js.
//
// The previous getCachedFreelancerProfile() fetched:
//   ${NEXTAUTH_URL}/api/freelancer/${slug}
// This left the container, went through Azure's load balancer, and came back
// in — adding 7-9 seconds of latency on every cache miss. Both generateMetadata
// and the page component called it simultaneously before the cache was warm,
// causing 4x concurrent outbound HTTP fetches per profile page cold hit.
//
// Now: getFreelancerProfile(slug) calls getAllFreelancerData() directly.
// getAllFreelancerData is cached via unstable_cache in lib/freelancerData.js.
// Cache miss = 3 parallel SQL queries (~100-200ms). No HTTP round-trip.

import { notFound } from "next/navigation";
import { getFreelancerProfile } from "../../lib/freelancerData";

import News from "../../components/News";
import ProfileContent from "./(components)/ProfileContent";

import styles from "../../styles/profile.module.scss";

export const revalidate = 3600;
export const dynamicParams = true;

export default async function UserProfilePage({ params }) {
  const { slug } = await params;
  const profileData = await getFreelancerProfile(slug);

  if (!profileData) {
    notFound();
  }

  return (
    <section
      className={styles.profilePage}
      data-footer="noBorder"
      data-page="plain"
    >
      <ProfileContent profileData={profileData} />
      <News />
    </section>
  );
}

export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    const profileData = await getFreelancerProfile(slug);

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
