// app/screen-services/[slug]/page.js
import Link from "next/link";
import Image from "next/image";
import styles from "../../styles/screenService.module.scss";
import { notFound } from "next/navigation";

// Enable static generation with revalidation
export const revalidate = 3600; // Revalidate every hour

// Generate static params for all categories at build time
export async function generateStaticParams() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/screen-services`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const categories = data.categories || [];

    // Return array of params for each category
    return categories.map((category) => ({
      slug: category.slug,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

async function getCategoryServices(slug) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/screen-services/${slug}`, {
      // Cache for 1 hour on the server
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return null;
    }

    const response = await res.json();
    return response.data;
  } catch (error) {
    console.error("Error fetching category services:", error);
    return null;
  }
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const data = await getCategoryServices(slug);

  // Show 404 if category not found
  if (!data) {
    notFound();
  }

  const { category, services } = data;

  return (
    <section
      className={styles.categoryPage}
      data-page="plain"
      data-footer="noBorder"
    >
      {/* Clickable header to return to main screen services page */}
      <Link href="/screen-services" className={styles.backLink}>
        <h1 className={styles.categoryHeader}>
          ← Screen Services: {category.name}
        </h1>
      </Link>

      {services.length === 0 ? (
        <div className={styles.noServices}>
          <p>No services found in this category.</p>
        </div>
      ) : (
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
                    Visit Website →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Generate metadata for each page
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getCategoryServices(slug);

  if (!data) {
    return {
      title: "Category Not Found",
    };
  }

  return {
    title: `${data.category.name} - Screen Services | Freelancers Promotions`,
    description: `Find professional ${data.category.name.toLowerCase()} services for your film production needs.`,
  };
}
