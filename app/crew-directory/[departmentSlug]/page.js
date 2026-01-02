// app/crew-directory/[departmentSlug]/page.js
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "../../styles/crewDirectory.module.scss";

// Enable static generation with revalidation
export const revalidate = 3600; // Revalidate every hour

// Generate static params for all departments at build time
export async function generateStaticParams() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/crew-directory`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const departments = data.departments || [];

    // Return array of params for each department
    return departments.map((department) => ({
      departmentSlug: department.slug,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

async function getDepartmentSkills(slug) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/crew-directory/${slug}`, {
      // Cache for 1 hour on the server
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return null;
    }

    const response = await res.json();
    return response.data;
  } catch (error) {
    console.error("Error fetching department skills:", error);
    return null;
  }
}

export default async function DepartmentPage({ params }) {
  const { departmentSlug } = await params;
  const data = await getDepartmentSkills(departmentSlug);

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
      {/* Clickable header to return to main crew directory page */}
      <Link href="/crew-directory" className={styles.backLink}>
        <h1 className={styles.categoryHeader}>
          ← Crew Directory: {department.name}
        </h1>
      </Link>

      {skills.length === 0 ? (
        <div className={styles.noSkills}>
          <p>No skills found in this department.</p>
        </div>
      ) : (
        <div className={styles.buttonSection}>
          {skills.map((skill) => (
            <Link
              key={skill.id}
              href={`/crew-directory/${departmentSlug}/${skill.slug}`}
              prefetch={true}
            >
              <button>{skill.name}</button>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// Generate metadata for each page
export async function generateMetadata({ params }) {
  const { departmentSlug } = await params;
  const data = await getDepartmentSkills(departmentSlug);

  if (!data) {
    return {
      title: "Department Not Found",
    };
  }

  return {
    title: `${data.department.name} - Crew Directory | Freelancers Promotions`,
    description: `Find professional ${data.department.name.toLowerCase()} crew members for your film production needs.`,
  };
}
