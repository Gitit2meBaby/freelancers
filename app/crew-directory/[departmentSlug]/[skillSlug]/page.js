// app/crew-directory/[departmentSlug]/[skillSlug]/page.js
import Link from "next/link";
import { notFound } from "next/navigation";

import FreelancerButtons from "./(components)/FreelancerButtons";
import styles from "../../../styles/crewDirectory.module.scss";

// Enable static generation with revalidation
export const revalidate = 3600; // Revalidate every hour

// Generate static params for all department/skill combinations at build time
export async function generateStaticParams() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Get all departments first
    const deptRes = await fetch(`${baseUrl}/api/crew-directory`, {
      next: { revalidate: 3600 },
    });

    if (!deptRes.ok) return [];

    const deptData = await deptRes.json();
    const departments = deptData.departments || [];

    // For each department, get all its skills
    const allParams = [];

    for (const department of departments) {
      const skillsRes = await fetch(
        `${baseUrl}/api/crew-directory/${department.slug}`,
        { next: { revalidate: 3600 } }
      );

      if (skillsRes.ok) {
        const skillsData = await skillsRes.json();
        const skills = skillsData.data?.skills || [];

        // Add params for each skill in this department
        skills.forEach((skill) => {
          allParams.push({
            departmentSlug: department.slug,
            skillSlug: skill.slug,
          });
        });
      }
    }

    return allParams;
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

async function getSkillFreelancers(departmentSlug, skillSlug) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(
      `${baseUrl}/api/crew-directory/${departmentSlug}/${skillSlug}`,
      {
        // Cache for 1 hour on the server
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      return null;
    }

    const response = await res.json();
    return response.data;
  } catch (error) {
    console.error("Error fetching skill freelancers:", error);
    return null;
  }
}

export default async function SkillPage({ params }) {
  const { departmentSlug, skillSlug } = await params;
  const data = await getSkillFreelancers(departmentSlug, skillSlug);

  // Show 404 if skill not found
  if (!data) {
    notFound();
  }

  const { skill, freelancers } = data;

  return (
    <section
      className={styles.crewDirectory}
      data-page="plain"
      data-footer="noBorder"
    >
      {/* Breadcrumb navigation */}
      <div className={styles.breadcrumb}>
        <Link href="/crew-directory" className={styles.breadcrumbLink}>
          Crew Directory
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link
          href={`/crew-directory/${departmentSlug}`}
          className={styles.breadcrumbLink}
        >
          {skill.department.name}
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{skill.name}</span>
      </div>

      {/* Page Header */}
      <div className={styles.skillHeader}>
        <h1>{skill.name}</h1>
        <p className={styles.freelancerCount}>
          {freelancers.length}{" "}
          {freelancers.length === 1 ? "freelancer" : "freelancers"} found
        </p>
      </div>

      {/* Freelancers List */}
      {freelancers.length === 0 ? (
        <div className={styles.noFreelancers}>
          <p>No freelancers found with this skill.</p>
        </div>
      ) : (
        <FreelancerButtons freelancers={freelancers} />
      )}
    </section>
  );
}

// Generate metadata for each page
export async function generateMetadata({ params }) {
  const { departmentSlug, skillSlug } = await params;
  const data = await getSkillFreelancers(departmentSlug, skillSlug);

  if (!data) {
    return {
      title: "Skill Not Found",
    };
  }

  const { skill, freelancers } = data;

  return {
    title: `${skill.name} - ${skill.department.name} | Freelancers Promotions`,
    description: `Find ${
      freelancers.length
    } professional ${skill.name.toLowerCase()} crew members in ${skill.department.name.toLowerCase()}. Browse experienced freelancers for your film production.`,
  };
}
