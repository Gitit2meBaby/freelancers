// app/crew-directory/[departmentSlug]/[skillSlug]/page.js
import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";

import { executeQuery, VIEWS } from "../../../lib/db";
import { getBlobUrl } from "../../../lib/azureBlob";
import DownloadSelect from "../../(components)/DownloadSelect";
import FreelancerButtons from "./(components)/FreelancerButtons";

import styles from "../../../styles/crewDirectory.module.scss";

// Enable ISR - revalidate every hour
export const revalidate = 3600;

// Increase timeout for this route
export const maxDuration = 60; // 60 seconds max

/**
 * Generate static params for all department/skill combinations at build time
 * Using a simpler, faster query
 */
export async function generateStaticParams() {
  try {
    // Simpler query - just get the slugs without complex joins
    const query = `
      SELECT DISTINCT 
        DepartmentSlug,
        SkillSlug
      FROM ${VIEWS.DEPARTMENTS_SKILLS}
      WHERE DepartmentSlug IS NOT NULL 
        AND SkillSlug IS NOT NULL
        AND DepartmentSlug <> ''
        AND SkillSlug <> ''
      ORDER BY DepartmentSlug, SkillSlug
    `;

    const results = await executeQuery(query);

    return results.map((row) => ({
      departmentSlug: row.DepartmentSlug,
      skillSlug: row.SkillSlug,
    }));
  } catch (error) {
    console.error("❌ Error generating static params:", error);
    // Return empty array to prevent build failure
    // Pages will be generated on-demand instead
    return [];
  }
}

/**
 * Cached function to fetch skill data with freelancers
 * With retry logic for timeouts
 */
const getCachedSkillData = unstable_cache(
  async (departmentSlug, skillSlug) => {
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        // First, get the skill and department info
        const skillInfoQuery = `
          SELECT TOP 1
            Department,
            DepartmentSlug,
            Skill,
            SkillSlug
          FROM ${VIEWS.DEPARTMENTS_SKILLS}
          WHERE DepartmentSlug = @departmentSlug
            AND SkillSlug = @skillSlug
        `;

        const skillInfo = await executeQuery(skillInfoQuery, {
          departmentSlug,
          skillSlug,
        });

        if (skillInfo.length === 0) {
          return null;
        }

        const skill = {
          name: skillInfo[0].Skill,
          slug: skillInfo[0].SkillSlug,
          department: {
            name: skillInfo[0].Department,
            slug: skillInfo[0].DepartmentSlug,
          },
        };

        // Get all freelancers with this skill
        // Use DISTINCT to prevent duplicates
        const freelancersQuery = `
          SELECT DISTINCT
            f.FreelancerID,
            f.DisplayName,
            f.Slug,
            f.FreelancerBio,
            f.PhotoBlobID,
            f.CVBlobID
          FROM ${VIEWS.FREELANCERS} f
          INNER JOIN ${VIEWS.FREELANCER_SKILLS} fs 
            ON f.FreelancerID = fs.FreelancerID
          WHERE fs.DepartmentSlug = @departmentSlug
            AND fs.SkillSlug = @skillSlug
          ORDER BY f.DisplayName
        `;

        const freelancersData = await executeQuery(freelancersQuery, {
          departmentSlug,
          skillSlug,
        });

        // Process freelancers data
        const freelancers = freelancersData.map((freelancer) => {
          // Generate blob URLs for photos and CVs
          const photoUrl = freelancer.PhotoBlobID
            ? getBlobUrl(freelancer.PhotoBlobID)
            : null;

          const cvUrl = freelancer.CVBlobID
            ? getBlobUrl(freelancer.CVBlobID)
            : null;

          return {
            id: freelancer.FreelancerID,
            name: freelancer.DisplayName,
            slug: freelancer.Slug,
            bio: freelancer.FreelancerBio,
            photoUrl,
            cvUrl,
          };
        });

        return {
          skill,
          freelancers,
        };
      } catch (error) {
        lastError = error;
        retries--;

        // If it's a timeout and we have retries left, try again
        if (error.code === "ETIMEOUT" && retries > 0) {
          // Wait 1 second before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        // Non-timeout error or out of retries
        console.error(
          `❌ Error fetching skill data (${retries} retries left):`,
          error
        );

        if (retries === 0) {
          break;
        }
      }
    }

    // If all retries failed, log and return null (will show 404)
    console.error(
      `❌ Failed to fetch ${departmentSlug}/${skillSlug} after all retries:`,
      lastError
    );
    return null;
  },
  ["crew-directory-skill"],
  {
    revalidate: 3600,
    tags: ["crew-directory"],
  }
);

/**
 * Server Component with ISR
 */
export default async function SkillPage({ params }) {
  const { departmentSlug, skillSlug } = await params;
  const data = await getCachedSkillData(departmentSlug, skillSlug);

  // Show 404 if skill not found
  if (!data) {
    notFound();
  }

  const { skill, freelancers } = data;

  return (
    <section
      className={styles.skillPageContent}
      data-page="plain"
      data-footer="noBorder"
    >
      {/* Page Header */}
      <div className={styles.skillHeader}>
        <Link href="/crew-directory">
          <h1>‹ Crew Directory: {skill.name}</h1>
        </Link>
      </div>

      {/* Freelancers List */}
      {freelancers.length === 0 ? (
        <div className={styles.noFreelancers}>
          <p>No freelancers found with this skill.</p>
        </div>
      ) : (
        <FreelancerButtons freelancers={freelancers} showCircles={true} />
      )}

      {/* Download component - data fetched on demand */}
      <DownloadSelect
        title="Download Crew List"
        downloadType="skill"
        departmentSlug={departmentSlug}
        skillSlug={skillSlug}
      />
    </section>
  );
}

/**
 * Generate metadata for each skill page
 */
export async function generateMetadata({ params }) {
  const { departmentSlug, skillSlug } = await params;
  const data = await getCachedSkillData(departmentSlug, skillSlug);

  if (!data) {
    return {
      title: "Skill Not Found - Freelancers Promotions",
    };
  }

  const { skill } = data;

  return {
    title: `${skill.name} - ${skill.department.name} | Freelancers Promotions`,
    description: `Find experienced ${skill.name.toLowerCase()} professionals for your film and television production in Melbourne and Australia.`,
    alternates: {
      canonical: `https://freelancers.com.au/crew-directory/${departmentSlug}/${skillSlug}`,
    },
    openGraph: {
      title: `${skill.name} - ${skill.department.name} | Freelancers Promotions`,
      description: `Find experienced ${skill.name.toLowerCase()} professionals for your production.`,
      url: `https://freelancers.com.au/crew-directory/${departmentSlug}/${skillSlug}`,
      type: "website",
    },
  };
}
