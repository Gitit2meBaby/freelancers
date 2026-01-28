"use client";

import { useState, useEffect, useRef } from "react";
import styles from "../styles/searchBar.module.scss";

/**
 * SearchBar Component
 *
 * Real-time search for freelancers in crew directory
 * Shows dropdown with results after 2+ characters typed
 * Calls onSelectFreelancer callback with full freelancer data
 */
export default function SearchBar({ onSelectFreelancer }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search freelancers when user types (debounced)
  useEffect(() => {
    const searchFreelancers = async () => {
      // Don't search if less than 2 characters
      if (searchTerm.length < 2) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);

      try {
        const searchUrl = `/api/search/freelancers?q=${encodeURIComponent(
          searchTerm,
        )}`;

        const response = await fetch(searchUrl);

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();
        setResults(data.results || []);
        setShowDropdown(data.results.length > 0);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search (wait 300ms after user stops typing)
    const timeoutId = setTimeout(searchFreelancers, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelectFreelancer(results[selectedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle freelancer selection - fetch full data and call callback
  const handleSelectFreelancer = async (freelancer) => {
    if (!onSelectFreelancer) {
      console.error("⚠️ onSelectFreelancer callback not provided to SearchBar");
      return;
    }

    console.log("🔍 Fetching full data for:", freelancer.slug);

    try {
      // Fetch full freelancer data from API
      const response = await fetch(`/api/freelancer/${freelancer.slug}`);
      const result = await response.json();

      if (result.success && result.data) {
        console.log("✅ Loaded freelancer data, calling callback");
        // Call the callback to open modal with full data
        onSelectFreelancer(result.data);
      } else {
        console.error("❌ Failed to load freelancer data:", result.error);
      }
    } catch (error) {
      console.error("❌ Error loading freelancer:", error);
    }

    // Clear search
    setSearchTerm("");
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  // Clear search
  const handleClear = () => {
    setSearchTerm("");
    setResults([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchBar} ref={searchRef}>
        {/* Search Icon */}
        <svg
          className={styles.searchIcon}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
          <path
            d="M21 21l-4.35-4.35"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        {/* Search Input */}
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search crew members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          aria-label="Search freelancers"
          autoComplete="off"
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className={styles.loadingSpinner}>
            <svg
              width="16"
              height="16"
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
        )}

        {/* Clear Button */}
        {searchTerm && !isLoading && (
          <button
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="Clear search"
            type="button"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && results.length > 0 && (
        <div className={styles.dropdown} ref={dropdownRef}>
          <div className={styles.dropdownHeader}>
            <span className={styles.resultsCount}>
              {results.length} {results.length === 1 ? "result" : "results"}
            </span>
          </div>
          <ul className={styles.resultsList}>
            {results.map((freelancer, index) => (
              <li
                key={freelancer.id}
                className={`${styles.resultItem} ${
                  index === selectedIndex ? styles.selected : ""
                }`}
                onClick={() => handleSelectFreelancer(freelancer)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className={styles.resultContent}>
                  <span className={styles.resultName}>{freelancer.name}</span>
                  {freelancer.skills && freelancer.skills.length > 0 && (
                    <span className={styles.resultSkill}>
                      {freelancer.skills[0].departmentName} -{" "}
                      {freelancer.skills[0].skillName}
                    </span>
                  )}
                </div>
                <svg
                  className={styles.resultArrow}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No Results Message */}
      {showDropdown &&
        searchTerm.length >= 2 &&
        results.length === 0 &&
        !isLoading && (
          <div className={styles.dropdown} ref={dropdownRef}>
            <div className={styles.noResults}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={styles.noResultsIcon}
              >
                <circle
                  cx="11"
                  cy="11"
                  r="8"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M21 21l-4.35-4.35"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M8 11h6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <p>No crew members found</p>
              <span className={styles.noResultsHint}>
                Try a different search term
              </span>
            </div>
          </div>
        )}
    </div>
  );
}
