// app/crew-directory/page.js
import Link from "next/link";
import SearchBar from "../components/SearchBar";
import DownloadSelect from "./(components)/DownloadSelect";
import styles from "../styles/crewDirectory.module.scss";

export const revalidate = 3600;

async function getCrewDirectory() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/crew-directory`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch crew directory");
    }

    return await res.json();
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
      className={`${styles.crewDirectory}`}
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

      {/* Download component - data fetched on demand */}
      <DownloadSelect title="Download Crew Directory" downloadType="all" />
    </section>
  );
}

export async function generateMetadata() {
  return {
    title: "Crew Directory | Freelancers Promotions",
    description: "Browse experienced freelancers for your film production.",
  };
}
