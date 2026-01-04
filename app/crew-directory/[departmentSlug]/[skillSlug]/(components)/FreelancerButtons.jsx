"use client";
import React, { useState } from "react";

import FreelancerModal from "./FreelancerModal";

import styles from "../../../../styles/crewDirectory.module.scss";

export default function FreelancerButtons({ freelancers }) {
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFreelancerClick = (freelancer) => {
    setSelectedFreelancer(freelancer);
    setIsModalOpen(true);
    console.log(freelancer);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Small delay before clearing to allow close animation
    setTimeout(() => {
      setSelectedFreelancer(null);
    }, 300);
  };

  return (
    <>
      <div className={styles.freelancerGrid}>
        {freelancers.map((freelancer) => (
          <div key={freelancer.id} className={styles.freelancerCell}>
            <button
              className={styles.freelancerButton}
              onClick={() => handleFreelancerClick(freelancer)}
              aria-label={`View ${freelancer.name}'s profile`}
            >
              <div className={styles.freelancerButtonContent}>
                {/* Freelancer Name */}
                <h3 className={styles.freelancerName}>{freelancer.name}</h3>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && selectedFreelancer && (
        <FreelancerModal
          freelancer={selectedFreelancer}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
