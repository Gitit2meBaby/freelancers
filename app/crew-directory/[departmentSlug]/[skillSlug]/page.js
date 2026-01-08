// // app/crew-directory/[departmentSlug]/[skillSlug]/page.js
// import Link from "next/link";
// import { notFound } from "next/navigation";

// import FreelancerButtons from "./(components)/FreelancerButtons";
// import DownloadSelect from "../../(components)/DownloadSelect";

// import styles from "../../../styles/crewDirectory.module.scss";

// // Enable static generation with revalidation
// export const revalidate = 3600;

// // Generate static params for all department/skill combinations at build time
// export async function generateStaticParams() {
//   try {
//     const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

//     // Get all departments first
//     const deptRes = await fetch(`${baseUrl}/api/crew-directory`, {
//       next: { revalidate: 3600 },
//     });

//     if (!deptRes.ok) return [];

//     const deptData = await deptRes.json();
//     const departments = deptData.departments || [];

//     // For each department, get all its skills
//     const allParams = [];

//     for (const department of departments) {
//       const skillsRes = await fetch(
//         `${baseUrl}/api/crew-directory/${department.slug}`,
//         { next: { revalidate: 3600 } }
//       );

//       if (skillsRes.ok) {
//         const skillsData = await skillsRes.json();
//         const skills = skillsData.data?.skills || [];

//         // Add params for each skill in this department - encode for URL safety
//         skills.forEach((skill) => {
//           allParams.push({
//             departmentSlug: encodeURIComponent(department.slug),
//             skillSlug: encodeURIComponent(skill.slug),
//           });
//         });
//       }
//     }

//     return allParams;
//   } catch (error) {
//     console.error("Error generating static params:", error);
//     return [];
//   }
// }

// async function getSkillFreelancers(departmentSlug, skillSlug) {
//   try {
//     const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
//     const res = await fetch(
//       `${baseUrl}/api/crew-directory/${departmentSlug}/${skillSlug}`,
//       {
//         // Cache for 1 hour on the server
//         next: { revalidate: 3600 },
//       }
//     );

//     if (!res.ok) {
//       return null;
//     }

//     const response = await res.json();
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching skill freelancers:", error);
//     return null;
//   }
// }

// export default async function SkillPage({ params }) {
//   const { departmentSlug, skillSlug } = await params;

//   // Decode URL-encoded slugs
//   const decodedDeptSlug = decodeURIComponent(departmentSlug);
//   const decodedSkillSlug = decodeURIComponent(skillSlug);

//   const data = await getSkillFreelancers(decodedDeptSlug, decodedSkillSlug);

//   // Show 404 if skill not found
//   if (!data) {
//     notFound();
//   }

//   const { skill, freelancers } = data;

//   return (
//     <>
//       <section
//         className={styles.skillPageContent}
//         data-page="plain"
//         data-footer="noBorder"
//       >
//         {/* Simplified breadcrumb - just back arrow and current path */}
//         {/* Page Header */}
//         <div className={styles.skillHeader}>
//           <Link href="/crew-directory">
//             <h1>‹ Crew Directory: {" " + skill.name}</h1>
//           </Link>
//         </div>

//         {/* Freelancers List */}
//         {freelancers.length === 0 ? (
//           <div className={styles.noFreelancers}>
//             <p>No freelancers found with this skill.</p>
//           </div>
//         ) : (
//           <FreelancerButtons freelancers={freelancers} showCircles={true} />
//         )}

//         {/* Download Section */}
//         <DownloadSelect
//           title={"Download Crew List"}
//         />
//       </section>
//     </>
//   );
// }

// // Generate metadata for each page
// export async function generateMetadata({ params }) {
//   const { departmentSlug, skillSlug } = await params;
//   const data = await getSkillFreelancers(departmentSlug, skillSlug);

//   if (!data) {
//     return {
//       title: "Skill Not Found",
//     };
//   }

//   const { skill, freelancers } = data;

//   return {
//     title: `${skill.name} - ${skill.department.name} | Freelancers Promotions`,
//     description: `Find ${
//       freelancers.length
//     } professional ${skill.name.toLowerCase()} crew members in ${skill.department.name.toLowerCase()}. Browse experienced freelancers for your film production.`,
//   };
// }

// app/crew-directory/[departmentSlug]/[skillSlug]/page.js
import { notFound } from "next/navigation";
import SearchBar from "../../../components/SearchBar";
import DownloadSelect from "../../(components)/DownloadSelect";
import styles from "../../../styles/crewDirectory_module.scss";

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
    <section className={styles.crewDirectory}>
      <div className={styles.crewHead}>
        <h1>{skill.name}</h1>
        <p>{skill.department.name}</p>
        <SearchBar />
      </div>

      {/* Display freelancers */}
      <div className={styles.crewGrid}>
        {freelancers.map((freelancer) => (
          <div key={freelancer.id} className={styles.crewCard}>
            <h3>{freelancer.name}</h3>
            {/* Add more freelancer details here */}
          </div>
        ))}
      </div>

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
