"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";

import styles from "../styles/screenService.module.scss";

const ScreenServiceCard = ({ service }) => {
  return (
    <div className={styles.serviceCard}>
      {/* Logo */}
      <div className={styles.logoContainer}>
        {service.logoUrl ? (
          <Image
            src={service.logoUrl}
            alt={`${service.name} logo`}
            width={300}
            height={150}
            className={styles.logo}
            style={{ objectFit: "contain" }}
          />
        ) : (
          <div className={styles.logoPlaceholder}>
            <span>{service.name}</span>
          </div>
        )}
      </div>

      {/* Service Name */}
      <h3 className={styles.serviceName}>{service.name}</h3>

      {/* Website Link */}
      {service.websiteUrl && (
        <Link
          href={service.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.websiteLink}
        >
          {service.websiteUrl}
        </Link>
      )}

      {/* Description */}
      {service.description && (
        <p className={styles.description}>{service.description}</p>
      )}

      {/* Contact Info */}
      {(service.contactEmail || service.contactPhone) && (
        <div className={styles.contactInfo}>
          {service.contactEmail && (
            <a
              href={`mailto:${service.contactEmail}`}
              className={styles.contactLink}
            >
              {service.contactEmail}
            </a>
          )}
          {service.contactPhone && (
            <a
              href={`tel:${service.contactPhone}`}
              className={styles.contactLink}
            >
              {service.contactPhone}
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default ScreenServiceCard;
