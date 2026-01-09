// app/crew-directory/[departmentSlug]/page.js
import { notFound } from "next/navigation";
import Link from "next/link";

import DownloadSelect from "../(components)/DownloadSelect";

import styles from "../../styles/crewDirectory.module.scss";

export const revalidate = 3600;

async function getDepartmentData(departmentSlug) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/crew-directory/${departmentSlug}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching department:", error);
    return null;
  }
}

export default async function DepartmentPage({ params }) {
  const { departmentSlug } = await params;
  const data = await getDepartmentData(departmentSlug);

  if (!data || !data.success) {
    notFound();
  }

  const { department, skills } = data.data;

  return (
    <section
      className={styles.crewDirectory}
      data-page="plain"
      data-footer="noBorder"
    >
      <div className={`${styles.crewHead} ${styles.departmentHead}`}>
        <Link href="/crew-directory">
          <h1>‹ Crew Directory: {" " + department.name}</h1>
        </Link>
      </div>

      {/* Display skills as buttons */}
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

      {/* Download component - data fetched on demand */}
      <DownloadSelect
        title="Download Crew List"
        downloadType="department"
        departmentSlug={departmentSlug}
      />
    </section>
  );
}

export async function generateMetadata({ params }) {
  const { departmentSlug } = await params;
  const data = await getDepartmentData(departmentSlug);

  if (!data) {
    return {
      title: "Department Not Found",
    };
  }

  const { department } = data.data;

  return {
    title: `${department.name} - Crew Directory | Freelancers Promotions`,
    description: `Find professional ${department.name.toLowerCase()} crew members for your film production needs.`,
  };
}
