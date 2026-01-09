// app/crew-directory/page.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import SearchBar from "../components/SearchBar";
import DownloadSelect from "./(components)/DownloadSelect";
import FreelancerModal from "./[departmentSlug]/[skillSlug]/(components)/FreelancerModal";

import styles from "../styles/crewDirectory.module.scss";

export default function CrewDirectoryPage() {
  // State
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch departments on mount
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const res = await fetch("/api/crew-directory");

        if (!res.ok) {
          throw new Error("Failed to fetch crew directory");
        }

        const data = await res.json();
        setDepartments(data.departments || []);
      } catch (error) {
        console.error("Error fetching crew directory:", error);
        setDepartments([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDepartments();
  }, []);

  // Handle search result selection
  const handleSearchSelect = (freelancerData) => {
    setSelectedFreelancer(freelancerData);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedFreelancer(null);
    }, 300);
  };

  return (
    <section
      className={`${styles.crewDirectory}`}
      data-page="plain"
      data-footer="noBorder"
    >
      <div className={styles.crewHead}>
        <div></div>
        <h1>Crew Directory</h1>
        <SearchBar scope="all" onSelectFreelancer={handleSearchSelect} />
      </div>

      {loading ? (
        <div className={styles.loadingSpinner}>
          <svg
            width="66"
            height="66"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={styles.spinner}
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              strokeOpacity="0.3"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ) : (
        <div className={styles.buttonSection}>
          {departments.map((department) => (
            <Link
              key={department.id}
              href={`/crew-directory/${department.slug}`}
              prefetch={true}
            >
              <button>{department.name}</button>
            </Link>
          ))}
        </div>
      )}

      {/* Download component - data fetched on demand */}
      <DownloadSelect title="Download Crew Directory" downloadType="all" />

      {/* Modal - shows when search result is clicked */}
      {isModalOpen && selectedFreelancer && (
        <FreelancerModal
          freelancer={selectedFreelancer}
          onClose={handleCloseModal}
        />
      )}
    </section>
  );
}
