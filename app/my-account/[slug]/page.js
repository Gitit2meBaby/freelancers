// app/my-account/[slug]/page.js
// SIMPLIFIED VERSION - Queries from existing API to avoid schema issues

import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import Image from "next/image";
import Link from "next/link";

import News from "../../components/News";
import EditProfileButton from "./(components)/EditProfileButton";

import styles from "../../styles/profile.module.scss";

// Enable ISR - revalidate every hour
export const revalidate = 3600;

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
  }
);

/**
 * Server Component - Uses existing working API
 * Only the Edit button is a client component
 */
export default async function UserProfilePage({ params }) {
  const { slug } = await params;
  const profileData = await getCachedFreelancerProfile(slug);

  // Show 404 if profile not found
  if (!profileData) {
    notFound();
  }

  // Extract role from skills array
  const role = profileData.skills?.[0]?.skillName || "Film Crew Member";

  return (
    <section
      className={styles.profilePage}
      data-footer="noBorder"
      data-page="plain"
    >
      <h1 className={styles.pageTitle}>Crew Profile</h1>

      <div className={styles.profileContainer}>
        {/* Left: Photo */}
        <div className={styles.photoSection}>
          {profileData.photoUrl ? (
            <Image
              src={profileData.photoUrl}
              alt={profileData.name}
              width={430}
              height={680}
              className={styles.profilePhoto}
              priority={false}
            />
          ) : (
            <div className={styles.placeholderPhoto}>
              <svg
                width="200"
                height="200"
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="100" cy="70" r="35" fill="#ccc" />
                <ellipse cx="100" cy="160" rx="60" ry="50" fill="#ccc" />
              </svg>
            </div>
          )}

          {/* Edit Profile Button (desktop) - CLIENT COMPONENT */}
          <EditProfileButton
            profileSlug={profileData.slug}
            className={styles.desk}
          />
        </div>

        {/* Right: Info */}
        <div className={styles.infoSection}>
          <h2 className={styles.name}>{profileData.name}</h2>
          <p className={styles.role}>{role}</p>
          {profileData.bio && <p className={styles.bio}>{profileData.bio}</p>}

          {/* Links */}
          {(profileData.links?.Website ||
            profileData.links?.Instagram ||
            profileData.links?.Imdb ||
            profileData.links?.LinkedIn) && (
            <div className={styles.links}>
              {profileData.links.Website && (
                <Link
                  href={profileData.links.Website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Website
                </Link>
              )}

              {profileData.links.Instagram && (
                <Link
                  href={profileData.links.Instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="2"
                      y="2"
                      width="20"
                      height="20"
                      rx="5"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle cx="18" cy="6" r="1" fill="currentColor" />
                  </svg>
                  Instagram
                </Link>
              )}

              {profileData.links.Imdb && (
                <Link
                  href={profileData.links.Imdb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="2"
                      y="3"
                      width="20"
                      height="18"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M7 7v10M10 7v10M13 7l2 10M17 7l2 10"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  IMDb
                </Link>
              )}

              {profileData.links.LinkedIn && (
                <Link
                  href={profileData.links.LinkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <rect
                      x="2"
                      y="9"
                      width="4"
                      height="12"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle cx="4" cy="4" r="2" fill="currentColor" />
                  </svg>
                  LinkedIn
                </Link>
              )}
            </div>
          )}

          {/* CV Download */}
          {profileData.cvUrl && (
            <div className={styles.cvSection}>
              <a
                href={profileData.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.cvButton}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M7 10l5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 15V3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Download CV
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Button (mobile) - CLIENT COMPONENT */}
      <EditProfileButton
        profileSlug={profileData.slug}
        className={styles.mob}
      />

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
