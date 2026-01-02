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
          <button
            key={freelancer.id}
            className={styles.freelancerButton}
            onClick={() => handleFreelancerClick(freelancer)}
            aria-label={`View ${freelancer.name}'s profile`}
          >
            <div className={styles.freelancerButtonContent}>
              {/* Freelancer Photo */}
              {freelancer.photoUrl ? (
                <div className={styles.freelancerPhoto}>
                  <img
                    src={freelancer.photoUrl}
                    alt={freelancer.name}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className={styles.freelancerPhotoPlaceholder}>
                  <span>{freelancer.name.charAt(0)}</span>
                </div>
              )}

              {/* Freelancer Name */}
              <h3 className={styles.freelancerName}>{freelancer.name}</h3>
            </div>
          </button>
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
