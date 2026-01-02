// app/crew-directory/page.js
import Link from "next/link";

import SearchBar from "../components/SearchBar";
import DownloadSelect from "./(components)/DownloadSelect";

import styles from "../styles/crewDirectory.module.scss";

// Enable static generation with revalidation
export const revalidate = 3600; // Revalidate every hour (3600 seconds)

async function getCrewDirectory() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/crew-directory`, {
      // Cache for 1 hour on the server
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch crew directory");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching crew directory:", error);
    return { departments: [] };
  }
}

export default async function CrewDirectoryPage() {
  const data = await getCrewDirectory();
  const departments = data.departments || [];

  return (
    <section
      className={styles.crewDirectory}
      data-page="plain"
      data-footer="noBorder"
    >
      <div className={styles.crewHead}>
        <h1>Crew Directory</h1>
        <SearchBar />
      </div>

      <div className={styles.buttonSection}>
        {departments.map((department) => (
          <Link
            key={department.id}
            href={`/crew-directory/${department.slug}`}
            prefetch={true}
          >
            <button>{department.name}</button>
          </Link>
        ))}
      </div>

      <DownloadSelect />
    </section>
  );
}
