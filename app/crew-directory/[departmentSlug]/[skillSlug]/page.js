// app/crew-directory/[departmentSlug]/[skillSlug]/page.js

import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";

import { executeQuery, VIEWS, LINK_TYPES } from "../../../lib/db";
import { getBlobUrl } from "../../../lib/azureBlob";
import DownloadSelect from "../../(components)/DownloadSelect";
import FreelancerButtons from "./(components)/FreelancerButtons";

import styles from "../../../styles/crewDirectory.module.scss";

export const revalidate = 3600;
export const maxDuration = 60;

export async function generateStaticParams() {
  try {
    const query = `
      SELECT DISTINCT
        DepartmentSlug,
        SkillSlug
      FROM ${VIEWS.DEPARTMENTS_SKILLS}
      WHERE DepartmentSlug IS NOT NULL
        AND SkillSlug       IS NOT NULL
        AND DepartmentSlug <> ''
        AND SkillSlug      <> ''
      ORDER BY DepartmentSlug, SkillSlug
    `;

    const results = await executeQuery(query);

    return results.map((row) => ({
      departmentSlug: row.DepartmentSlug,
      skillSlug: row.SkillSlug,
    }));
  } catch (error) {
    console.error("❌ Error generating static params:", error);
    return [];
  }
}

/**
 * Returns a cached fetcher scoped to this specific department+skill pair.
 *
 * A new unstable_cache instance is created per slug combination so each page
 * gets its own isolated cache entry. This is the correct pattern for dynamic
 * segments — the previous static key "crew-directory-skill" caused all skill
 * pages to share a single cache slot.
 */
function getSkillDataFetcher(departmentSlug, skillSlug) {
  return unstable_cache(
    async () => {
      // Skill info and freelancer list run in parallel — the skill info query
      // is cheap (TOP 1) but there's no reason to wait for it before starting
      // the freelancer query since both use the same WHERE clause.
      const skillInfoQuery = `
        SELECT TOP 1
          Department,
          DepartmentSlug,
          Skill,
          SkillSlug
        FROM ${VIEWS.DEPARTMENTS_SKILLS}
        WHERE DepartmentSlug = @departmentSlug
          AND SkillSlug      = @skillSlug
      `;

      const freelancersQuery = `
        SELECT DISTINCT
          f.FreelancerID,
          f.DisplayName,
          f.Slug,
          f.FreelancerBio,
          f.PhotoBlobID,
          f.CVBlobID,
          f.EquipmentBlobID
        FROM ${VIEWS.FREELANCERS} f
        INNER JOIN ${VIEWS.FREELANCER_SKILLS} fs
          ON f.FreelancerID = fs.FreelancerID
        WHERE fs.DepartmentSlug = @departmentSlug
          AND fs.SkillSlug      = @skillSlug
        ORDER BY f.DisplayName
      `;

      const linksQuery = `
        SELECT
          fl.FreelancerID,
          fl.LinkName,
          fl.LinkURL
        FROM ${VIEWS.FREELANCER_LINKS} fl
        INNER JOIN ${VIEWS.FREELANCER_SKILLS} fs
          ON fl.FreelancerID = fs.FreelancerID
        WHERE fs.DepartmentSlug = @departmentSlug
          AND fs.SkillSlug      = @skillSlug
          AND fl.LinkURL IS NOT NULL
          AND fl.LinkURL != ''
      `;

      const params = { departmentSlug, skillSlug };

      const [skillInfo, freelancersData, linksData] = await Promise.all([
        executeQuery(skillInfoQuery, params),
        executeQuery(freelancersQuery, params),
        executeQuery(linksQuery, params),
      ]);

      if (skillInfo.length === 0) return null;

      const skill = {
        name: skillInfo[0].Skill,
        slug: skillInfo[0].SkillSlug,
        department: {
          name: skillInfo[0].Department,
          slug: skillInfo[0].DepartmentSlug,
        },
      };

      const stripInternalNotes = (name) =>
        name?.replace(/\s*\(.*?\)\s*/g, "").trim() ?? "";

      // Build links map — O(n) once, O(1) lookup per freelancer below
      const linksMap = new Map();
      linksData.forEach((link) => {
        if (!linksMap.has(link.FreelancerID)) {
          linksMap.set(link.FreelancerID, {});
        }
        linksMap.get(link.FreelancerID)[link.LinkName] = link.LinkURL;
      });

      const freelancers = freelancersData.map((freelancer) => {
        const photoUrl = freelancer.PhotoBlobID?.trim()
          ? getBlobUrl(freelancer.PhotoBlobID)
          : null;

        const cvUrl = freelancer.CVBlobID?.trim()
          ? getBlobUrl(freelancer.CVBlobID)
          : null;

        const equipmentListUrl = freelancer.EquipmentBlobID?.trim()
          ? getBlobUrl(freelancer.EquipmentBlobID)
          : null;

        const freelancerLinks = linksMap.get(freelancer.FreelancerID) || {};

        return {
          id: freelancer.FreelancerID,
          name: stripInternalNotes(freelancer.DisplayName), // ← was: freelancer.DisplayName
          slug: freelancer.Slug,
          bio: freelancer.FreelancerBio,
          photoUrl,
          cvUrl,
          equipmentListUrl,
          links: {
            Website: freelancerLinks[LINK_TYPES.WEBSITE] || null,
            Instagram: freelancerLinks[LINK_TYPES.INSTAGRAM] || null,
            Imdb: freelancerLinks[LINK_TYPES.IMDB] || null,
            LinkedIn: freelancerLinks[LINK_TYPES.LINKEDIN] || null,
          },
        };
      });

      return { skill, freelancers };
    },
    // Cache key includes both slugs — each skill page gets its own cache entry
    [`crew-directory-skill-${departmentSlug}-${skillSlug}`],
    {
      revalidate: 3600,
      tags: ["crew-directory"],
    },
  );
}

export default async function SkillPage({ params }) {
  const { departmentSlug, skillSlug } = await params;
  const fetchSkillData = getSkillDataFetcher(departmentSlug, skillSlug);
  const data = await fetchSkillData();

  if (!data) notFound();

  const { skill, freelancers } = data;

  return (
    <section
      className={styles.skillPageContent}
      data-page="plain"
      data-footer="noBorder"
    >
      <div className={styles.skillHeader}>
        <Link href="/crew-directory">
          <h1>‹ Crew Directory: {skill.name}</h1>
        </Link>
      </div>

      {freelancers.length === 0 ? (
        <div className={styles.noFreelancers}>
          <p>No freelancers found with this skill.</p>
        </div>
      ) : (
        <FreelancerButtons freelancers={freelancers} showCircles={true} />
      )}

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
  const fetchSkillData = getSkillDataFetcher(departmentSlug, skillSlug);
  const data = await fetchSkillData();

  if (!data) {
    return { title: "Skill Not Found - Freelancers Promotions" };
  }

  const { skill } = data;

  return {
    title: `${skill.name} - ${skill.department.name} | Freelancers Promotions`,
    description: `Find experienced ${skill.name.toLowerCase()} professionals for your film and television production in Melbourne and Australia.`,
    alternates: {
      canonical: `https://freelancers.com.au/crew-directory/${departmentSlug}/${skillSlug}`,
    },
    openGraph: {
      title: `${skill.name} - ${skill.department.name} | Freelancers Promotions`,
      description: `Find experienced ${skill.name.toLowerCase()} professionals for your production.`,
      url: `https://freelancers.com.au/crew-directory/${departmentSlug}/${skillSlug}`,
      type: "website",
    },
  };
}
