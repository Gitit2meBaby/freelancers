// app/crew-directory/[departmentSlug]/page.js
import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";

import { executeQuery, VIEWS } from "../../lib/db";
import DownloadSelect from "../(components)/DownloadSelect";

import styles from "../../styles/crewDirectory.module.scss";

// Enable ISR - revalidate every hour
export const revalidate = 3600;

/**
 * Generate static params for all departments at build time
 */
export async function generateStaticParams() {
  try {
    const query = `
      SELECT DISTINCT DepartmentSlug
      FROM ${VIEWS.DEPARTMENTS_SKILLS}
      WHERE DepartmentSlug IS NOT NULL
      ORDER BY DepartmentSlug
    `;

    const departments = await executeQuery(query);

    return departments.map((dept) => ({
      departmentSlug: dept.DepartmentSlug,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

/**
 * Cached function to fetch department with its skills
 */
const getCachedDepartmentData = unstable_cache(
  async (departmentSlug) => {
    try {
      // Query to get department and all its skills
      const query = `
        SELECT 
          Department,
          DepartmentSlug,
          Skill,
          SkillSlug
        FROM ${VIEWS.DEPARTMENTS_SKILLS}
        WHERE DepartmentSlug = @departmentSlug
        ORDER BY Skill
      `;

      const results = await executeQuery(query, { departmentSlug });

      if (results.length === 0) {
        return null;
      }

      // Extract department info (same for all rows)
      const department = {
        name: results[0].Department,
        slug: results[0].DepartmentSlug,
      };

      // Extract unique skills
      const skillsMap = new Map();
      results.forEach((row) => {
        if (!skillsMap.has(row.SkillSlug)) {
          skillsMap.set(row.SkillSlug, {
            id: row.SkillSlug,
            name: row.Skill,
            slug: row.SkillSlug,
          });
        }
      });

      const skills = Array.from(skillsMap.values());

      return {
        department,
        skills,
      };
    } catch (error) {
      console.error("Error fetching department data:", error);
      return null;
    }
  },
  ["crew-directory-department"],
  {
    revalidate: 3600,
    tags: ["crew-directory"],
  },
);

/**
 * Server Component with ISR
 */
export default async function DepartmentPage({ params }) {
  const { departmentSlug } = await params;
  const data = await getCachedDepartmentData(departmentSlug);

  // Show 404 if department not found
  if (!data) {
    notFound();
  }

  const { department, skills } = data;

  return (
    <section
      className={styles.crewDirectory}
      data-page="plain"
      data-footer="noBorder"
    >
      <div className={`${styles.crewHead} ${styles.departmentHead}`}>
        <Link href="/crew-directory">
          <h1>‹ Crew Directory: {department.name}</h1>
        </Link>
      </div>

      {/* Display skills as buttons */}
      <div className={styles.buttonSection}>
        {skills.length === 0 ? (
          <p>No skills available for this department</p>
        ) : (
          skills.map((skill) => (
            <Link
              key={skill.id}
              href={`/crew-directory/${departmentSlug}/${skill.slug}`}
              prefetch={true}
            >
              <button>{skill.name}</button>
            </Link>
          ))
        )}
      </div>

      {/* Download component - data fetched on demand */}
      <DownloadSelect
        title="Download Crew List"
        downloadType="department"
        departmentSlug={departmentSlug}
      />
    </section>
  );
}

/**
 * Generate metadata for each department page
 */
export async function generateMetadata({ params }) {
  const { departmentSlug } = await params;
  const data = await getCachedDepartmentData(departmentSlug);

  if (!data) {
    return {
      title: "Department Not Found - Freelancers Promotions",
    };
  }

  const { department } = data;

  return {
    title: `${department.name} - Crew Directory | Freelancers Promotions`,
    description: `Find professional ${department.name.toLowerCase()} crew members for your film and television production needs in Melbourne and Australia.`,
    alternates: {
      canonical: `https://freelancers.com.au/crew-directory/${departmentSlug}`,
    },
    openGraph: {
      title: `${department.name} - Crew Directory | Freelancers Promotions`,
      description: `Find professional ${department.name.toLowerCase()} crew members for your production needs.`,
      url: `https://freelancers.com.au/crew-directory/${departmentSlug}`,
      type: "website",
    },
  };
}
