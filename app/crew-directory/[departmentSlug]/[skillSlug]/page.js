// app/crew-directory/[departmentSlug]/[skillSlug]/page.js
import { notFound } from "next/navigation";
import Link from "next/link";

import DownloadSelect from "../../(components)/DownloadSelect";
import FreelancerButtons from "./(components)/FreelancerButtons";

import styles from "../../../styles/crewDirectory.module.scss";

export const revalidate = 3600;

async function getSkillData(departmentSlug, skillSlug) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(
      `${baseUrl}/api/crew-directory/${departmentSlug}/${skillSlug}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching skill data:", error);
    return null;
  }
}

export default async function SkillPage({ params }) {
  const { departmentSlug, skillSlug } = await params;
  const response = await getSkillData(departmentSlug, skillSlug);

  if (!response || !response.success) {
    notFound();
  }

  const { skill, freelancers } = response.data;

  return (
    <section
      className={styles.skillPageContent}
      data-page="plain"
      data-footer="noBorder"
    >
      {/* Simplified breadcrumb - just back arrow and current path */}
      {/* Page Header */}
      <div className={styles.skillHeader}>
        <Link href="/crew-directory">
          <h1>‹ Crew Directory: {" " + skill.name}</h1>
        </Link>
      </div>

      {/* Freelancers List */}
      {freelancers.length === 0 ? (
        <div className={styles.noFreelancers}>
          <p>No freelancers found with this skill.</p>
        </div>
      ) : (
        <FreelancerButtons freelancers={freelancers} showCircles={true} />
      )}

      {/* Download component - data fetched on demand */}
      <DownloadSelect
        title="Download Crew List"
        downloadType="skill"
        departmentSlug={departmentSlug}
        skillSlug={skillSlug}
      />
    </section>
  );
}

export async function generateMetadata({ params }) {
  const { departmentSlug, skillSlug } = await params;
  const response = await getSkillData(departmentSlug, skillSlug);

  if (!response) {
    return {
      title: "Skill Not Found",
    };
  }

  const { skill } = response.data;

  return {
    title: `${skill.name} - ${skill.department.name} | Freelancers Promotions`,
    description: `Find experienced ${skill.name.toLowerCase()} professionals for your production.`,
  };
}
