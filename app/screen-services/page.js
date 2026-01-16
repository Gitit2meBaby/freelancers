// app/screen-services/page.js
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { executeQuery, VIEWS } from "../lib/db";
import { getBlobUrl } from "../lib/azureBlob";
import styles from "../styles/crewDirectory.module.scss";

// Enable ISR with 1 hour revalidation
export const revalidate = 3600;

/**
 * Generates a URL-friendly slug from a name
 */
function generateSlug(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Cached database query - moved from API route to page level
 * More efficient: eliminates API roundtrip
 */
const getCachedScreenServices = unstable_cache(
  async () => {
    const query = `
      SELECT 
        ServiceCategoryID,
        ServiceID,
        Service,
        CategoryID,
        Category,
        WebsiteURL,
        LogoBlobID
      FROM ${VIEWS.SERVICE_CATEGORIES}
      ORDER BY Category, Service
    `;

    const results = await executeQuery(query);

    // Build unique services map
    const servicesMap = new Map();
    const categoriesMap = new Map();

    results.forEach((row) => {
      // Add service
      if (!servicesMap.has(row.ServiceID)) {
        servicesMap.set(row.ServiceID, {
          id: row.ServiceID,
          name: row.Service,
          slug: generateSlug(row.Service),
          websiteUrl: row.WebsiteURL,
          logoUrl: row.LogoBlobID ? getBlobUrl(row.LogoBlobID) : null,
          logoBlobId: row.LogoBlobID,
          categories: [],
        });
      }

      // Add category
      if (!categoriesMap.has(row.CategoryID)) {
        categoriesMap.set(row.CategoryID, {
          id: row.CategoryID,
          name: row.Category,
          slug: generateSlug(row.Category),
          services: [],
        });
      }

      // Link service to category
      const service = servicesMap.get(row.ServiceID);
      const category = categoriesMap.get(row.CategoryID);

      if (!service.categories.some((c) => c.id === category.id)) {
        service.categories.push({
          id: category.id,
          name: category.name,
          slug: category.slug,
        });
      }

      if (!category.services.some((s) => s.id === service.id)) {
        category.services.push({
          id: service.id,
          name: service.name,
          slug: service.slug,
        });
      }
    });

    const services = Array.from(servicesMap.values());
    const categories = Array.from(categoriesMap.values());

    return {
      services,
      categories,
      totalServices: services.length,
      totalCategories: categories.length,
    };
  },
  ["screen-services-all"],
  {
    revalidate: 3600,
    tags: ["screen-services"],
  }
);

export default async function ScreenServicesPage() {
  // Fetch directly from database - no API roundtrip needed!
  const data = await getCachedScreenServices();
  const categories = data.categories || [];

  return (
    <section
      className={styles.crewDirectory}
      data-page="plain"
      data-footer="noBorder"
      data-spacing="large"
    >
      <div
        className={`${styles.crewHead} ${styles.departmentHead}`}
        style={{ paddingTop: "0" }}
      >
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
