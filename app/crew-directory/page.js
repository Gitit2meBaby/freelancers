// app/crew-directory/page.js
import Link from "next/link";
import { unstable_cache } from "next/cache";

import { executeQuery, VIEWS } from "../lib/db";
import SearchBar from "../components/SearchBar";
import DownloadSelect from "./(components)/DownloadSelect";

import styles from "../styles/crewDirectory.module.scss";

// Enable ISR - revalidate every hour
export const revalidate = 3600;

/**
 * Cached function to fetch departments directly from database
 */
const getCachedDepartments = unstable_cache(
  async () => {
    try {
      // Query to get all departments with their slugs
      const query = `
        SELECT DISTINCT
          Department,
          DepartmentSlug
        FROM ${VIEWS.DEPARTMENTS_SKILLS}
        ORDER BY Department
      `;

      const results = await executeQuery(query);

      // Transform to match expected format
      return results.map((row) => ({
        id: row.DepartmentSlug, // Use slug as ID for uniqueness
        name: row.Department,
        slug: row.DepartmentSlug,
      }));
    } catch (error) {
      console.error("Error fetching departments:", error);
      return [];
    }
  },
  ["crew-directory-departments"],
  {
    revalidate: 3600,
    tags: ["crew-directory"],
  }
);

/**
 * Server Component with ISR
 * Static department list rendered on server
 * Search bar is client component for interactivity
 */
export default async function CrewDirectoryPage() {
  const departments = await getCachedDepartments();

  return (
    <section
      className={styles.crewDirectory}
      data-page="plain"
      data-footer="noBorder"
    >
      <div className={styles.crewHead}>
        <div></div>
        <h1>Crew Directory</h1>
        {/* SearchBar is already a client component with modal handling */}
        <SearchBar scope="all" />
      </div>

      {/* Server-rendered department buttons */}
      <div className={styles.buttonSection}>
        {departments.length === 0 ? (
          <p>No departments available</p>
        ) : (
          departments.map((department) => (
            <Link
              key={department.id}
              href={`/crew-directory/${department.slug}`}
              prefetch={true}
            >
              <button>{department.name}</button>
            </Link>
          ))
        )}
      </div>

      {/* Download component - data fetched on demand */}
      <DownloadSelect title="Download Crew Directory" downloadType="all" />
    </section>
  );
}

/**
 * Metadata for the page
 */
export const metadata = {
  title: "Crew Directory - Freelancers Promotions",
  description:
    "Browse our comprehensive directory of film and television crew members in Melbourne and Australia. Find experienced professionals for your production needs.",
  alternates: {
    canonical: "https://freelancers.com.au/crew-directory",
  },
};
