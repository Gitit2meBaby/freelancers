// app/screen-services/page.js
import Link from "next/link";
import styles from "../styles/crewDirectory.module.scss";

// Enable static generation with revalidation
export const revalidate = 3600; // Revalidate every hour (3600 seconds)

async function getScreenServices() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/screen-services`, {
      // Cache for 1 hour on the server
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch screen services");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching screen services:", error);
    return { categories: [], services: [] };
  }
}

export default async function ScreenServicesPage() {
  const data = await getScreenServices();
  const categories = data.categories || [];

  return (
    <section
      className={styles.crewDirectory}
      data-page="plain"
      data-footer="noBorder"
      data-spacing="large"
    >
      <div className={styles.crewHead}>
        <h1>Screen Services</h1>
      </div>

      <div className={styles.buttonSection}>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/screen-services/${category.slug}`}
            prefetch={true}
          >
            <button>{category.name}</button>
          </Link>
        ))}
      </div>
    </section>
  );
}
