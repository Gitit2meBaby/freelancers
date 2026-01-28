"use client";

import { useState } from "react";
import SearchBar from "../../components/SearchBar";
import FreelancerModal from "../[departmentSlug]/[skillSlug]/(components)/FreelancerModal";

/**
 * CrewDirectorySearch Component
 *
 * Client component wrapper that manages:
 * - SearchBar with modal callback
 * - FreelancerModal state
 *
 * Used in the crew directory page to enable search → modal flow
 */
export default function CrewDirectorySearch() {
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle freelancer selection from SearchBar
  const handleSelectFreelancer = (freelancerData) => {
    setSelectedFreelancer(freelancerData);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Delay clearing to allow close animation
    setTimeout(() => setSelectedFreelancer(null), 300);
  };

  return (
    <>
      {/* SearchBar with modal callback */}
      <SearchBar scope="all" onSelectFreelancer={handleSelectFreelancer} />

      {/* FreelancerModal */}
      {isModalOpen && selectedFreelancer && (
        <FreelancerModal
          freelancer={selectedFreelancer}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
