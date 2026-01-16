// app/screen-services/[slug]/page.js
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";

import { executeQuery, VIEWS } from "../../lib/db";
import { getBlobUrl } from "../../lib/azureBlob";

import styles from "../../styles/screenService.module.scss";

// Enable ISR - revalidate every hour
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
 * Generate static params for all categories at build time
 * Fetches directly from database instead of API
 */
export async function generateStaticParams() {
  try {
    const query = `
      SELECT DISTINCT Category, CategoryID
      FROM ${VIEWS.SERVICE_CATEGORIES}
      ORDER BY Category
    `;

    const categories = await executeQuery(query);

    return categories.map((category) => ({
      slug: generateSlug(category.Category),
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

/**
 * Cached function to fetch category services
 * Fetches directly from database instead of API
 */
const getCachedCategoryServices = unstable_cache(
  async (slug) => {
    // Query all service-category relationships
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

    // Find the category that matches the slug
    let targetCategory = null;
    const categoryMap = new Map();

    results.forEach((row) => {
      const categorySlug = generateSlug(row.Category);

      if (!categoryMap.has(categorySlug)) {
        categoryMap.set(categorySlug, {
          id: row.CategoryID,
          name: row.Category,
          slug: categorySlug,
          services: [],
        });
      }

      // If this is our target category, add the service
      if (categorySlug === slug) {
        targetCategory = categoryMap.get(categorySlug);

        // Check if service already added (avoid duplicates)
        if (!targetCategory.services.some((s) => s.id === row.ServiceID)) {
          targetCategory.services.push({
            id: row.ServiceID,
            name: row.Service,
            slug: generateSlug(row.Service),
            websiteUrl: row.WebsiteURL,
            logoUrl: row.LogoBlobID ? getBlobUrl(row.LogoBlobID) : null,
            logoBlobId: row.LogoBlobID,
          });
        }
      }
    });

    if (!targetCategory) {
      return null;
    }

    return {
      category: {
        id: targetCategory.id,
        name: targetCategory.name,
        slug: targetCategory.slug,
      },
      services: targetCategory.services,
    };
  },
  ["screen-services-category"],
  {
    revalidate: 3600,
    tags: ["screen-services"],
  }
);

/**
 * Server Component - Fully rendered on server with ISR
 */
export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const data = await getCachedCategoryServices(slug);

  // Show 404 if category not found
  if (!data) {
    notFound();
  }

  const { category, services } = data;

  return (
    <section
      className={styles.screenPageGridWrapper}
      data-page="plain"
      data-footer="noBorder"
    >
      {/* Clickable header to return to main screen services page */}
      <div className={styles.screenHead}>
        <Link href="/screen-services">
          <h1>‹ Screen Services: {category.name}</h1>
        </Link>
      </div>

      {/* Services grid */}
      {services.length === 0 ? (
        <div className={styles.noServices}>
          <p>No services found in this category.</p>
        </div>
      ) : (
        <div className={styles.servicesGridWrapper} data-circles="true">
          <div className={styles.servicesGrid}>
            {services.map((service) => (
              <div key={service.id} className={styles.serviceCard}>
                {/* Service Logo */}
                {service.logoUrl ? (
                  <div className={styles.logoContainer}>
                    <Image
                      src={service.logoUrl}
                      alt={`${service.name} logo`}
                      width={300}
                      height={150}
                      className={styles.logo}
                      priority={false}
                    />
                  </div>
                ) : (
                  <div className={styles.logoPlaceholder}>
                    <span>{service.name.charAt(0)}</span>
                  </div>
                )}

                {/* Service Info */}
                <div className={styles.serviceInfo}>
                  <h2>{service.name}</h2>

                  {service.websiteUrl && (
                    <a
                      href={service.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.websiteLink}
                    >
                      {service.websiteUrl.split("/").slice(0, 3).join("/")}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Generate metadata for each category page
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getCachedCategoryServices(slug);

  if (!data) {
    return {
      title: "Category Not Found - Freelancers Promotions",
    };
  }

  return {
    title: `${data.category.name} - Screen Services | Freelancers Promotions`,
    description: `Find professional ${data.category.name.toLowerCase()} services for your film and television production needs in Melbourne and Australia.`,
    alternates: {
      canonical: `https://freelancers.com.au/screen-services/${slug}`,
    },
    openGraph: {
      title: `${data.category.name} - Screen Services | Freelancers Promotions`,
      description: `Find professional ${data.category.name.toLowerCase()} services for your film and television production needs.`,
      url: `https://freelancers.com.au/screen-services/${slug}`,
      type: "website",
    },
  };
}
