// app/edit-profile/page.jsx - FIXED TO LOAD ALL LINKS FROM TABLE
"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import VerificationModal from "../components/VerificationModal";

import styles from "../styles/editProfile.module.scss";

function EditProfileForm() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const isLoggedIn = status === "authenticated";
  const isLoading = status === "loading";

  const [formData, setFormData] = useState({
    photo: null,
    photoPreview: null,
    name: "",
    role: "",
    Website: "",
    Instagram: "",
    Imdb: "",
    LinkedIn: "",
    description: "",
    cv: null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // NEW: Pending verification status
  const [pendingStatus, setPendingStatus] = useState({
    photo: false,
    cv: false,
    bio: false,
  });

  // Verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationChanges, setVerificationChanges] = useState({});

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/member-login");
    }
  }, [isLoading, isLoggedIn, router]);

  // Load user profile data
  useEffect(() => {
    if (isLoggedIn && session?.user?.slug) {
      loadUserProfile(session.user.slug);
    }
  }, [isLoggedIn, session]);

  const loadUserProfile = async (slug) => {
    setLoading(true);
    try {
      // CRITICAL FIX: Load from the new endpoint that gets ALL links from TABLE
      // This ensures we don't lose existing link values when updating
      const editDataResponse = await fetch(`/api/profile/load-for-edit`);

      if (!editDataResponse.ok) {
        throw new Error("Failed to load profile for editing");
      }

      const editResult = await editDataResponse.json();
      const editData = editResult.data;

      console.log("📝 Loaded profile for editing:", editData);
      console.log("🔗 Links from TABLE:", editData.links);

      // Load pending verification status
      const pendingResponse = await fetch(`/api/my-pending-status`);
      let pendingData = null;
      if (pendingResponse.ok) {
        const pendingResult = await pendingResponse.json();
        pendingData = pendingResult;
      }

      // Set form data with ALL current values (including empty links)
      setFormData({
        photo: null,
        photoPreview: editData.photoUrl || null,
        name: editData.name || "",
        role: "Film Crew Member", // This can be removed if not needed
        Website: editData.links.Website || "", // ✅ Will have current value
        Instagram: editData.links.Instagram || "", // ✅ Will have current value
        Imdb: editData.links.Imdb || "", // ✅ Will have current value
        LinkedIn: editData.links.LinkedIn || "", // ✅ Will have current value
        description: editData.bio || "",
        cv: null,
      });

      console.log("✅ Form initialized with current link values:");
      console.log("   Website:", editData.links.Website || "(empty)");
      console.log("   Instagram:", editData.links.Instagram || "(empty)");
      console.log("   Imdb:", editData.links.Imdb || "(empty)");
      console.log("   LinkedIn:", editData.links.LinkedIn || "(empty)");

      // Set pending status
      if (pendingData?.success) {
        setPendingStatus({
          photo: pendingData.pending.photo,
          cv: pendingData.pending.cv,
          bio: pendingData.pending.bio,
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setErrors({ load: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors({ ...errors, photo: "Please select an image file" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors({ ...errors, photo: "Image must be less than 2MB" });
      return;
    }

    setFormData({
      ...formData,
      photo: file,
      photoPreview: URL.createObjectURL(file),
    });
    setErrors({ ...errors, photo: "" });
  };

  const handleCVChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setErrors({ ...errors, cv: "CV must be a PDF file" });
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setErrors({ ...errors, cv: "CV must be less than 2.5MB" });
      return;
    }

    setFormData({ ...formData, cv: file });
    setErrors({ ...errors, cv: "" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    console.log(`📝 Field changed: ${name} = "${value}"`);

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const uploadToAzureBlob = async (file, blobId, type) => {
    const formDataToUpload = new FormData();
    formDataToUpload.append("file", file);
    formDataToUpload.append("blobId", blobId);
    formDataToUpload.append("type", type);

    const response = await fetch("/api/upload-blob", {
      method: "POST",
      body: formDataToUpload,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload file");
    }

    const result = await response.json();
    return result.blobId;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const freelancerId = session.user.freelancerId;

      // Upload files to Azure Blob if provided
      let photoBlobId = null;
      let cvBlobId = null;

      if (formData.photo) {
        const photoFileName = `photo-${freelancerId}-${Date.now()}`;
        photoBlobId = await uploadToAzureBlob(
          formData.photo,
          photoFileName,
          "image"
        );
      }

      if (formData.cv) {
        const cvFileName = `cv-${freelancerId}-${Date.now()}`;
        cvBlobId = await uploadToAzureBlob(formData.cv, cvFileName, "cv");
      }

      // Prepare update data - ALL current form values
      const updateData = {
        displayName: formData.name,
        bio: formData.description,
        photoBlobId,
        cvBlobId,
        photoFileName: formData.photo?.name,
        cvFileName: formData.cv?.name,
        links: {
          Website: formData.Website, // ✅ Current value (unchanged or changed)
          Instagram: formData.Instagram, // ✅ Current value (unchanged or changed)
          Imdb: formData.Imdb, // ✅ Current value (unchanged or changed)
          LinkedIn: formData.LinkedIn, // ✅ Current value (unchanged or changed)
        },
      };

      console.log("📤 Submitting update with links:", updateData.links);

      // Save to database
      const response = await fetch("/api/profile/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save profile");
      }

      const result = await response.json();

      console.log("✅ Update response:", result);

      // Show verification modal if changes need verification
      if (result.needsVerification) {
        setVerificationChanges(result.changes);
        setShowVerificationModal(true);
      } else {
        // No verification needed, just redirect
        router.push(`/my-account/${session.user.slug}`);
        router.refresh();
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setErrors({
        submit: error.message || "Failed to save profile. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowVerificationModal(false);
    // Reload to show pending status
    loadUserProfile(session.user.slug);
  };

  if (isLoading || !isLoggedIn) {
    return (
      <div
        className={styles.editProfilePage}
        data-footer="noBorder"
        data-page="plain"
      >
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
      </div>
    );
  }

  return (
    <>
      <div
        className={styles.editProfilePage}
        data-footer="noBorder"
        data-page="plain"
      >
        <h1 className={styles.pageTitle}>Edit Your Profile</h1>

        {errors.load && <div className={styles.errorBanner}>{errors.load}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formCard}>
            {/* Photo Upload */}
            <div className={styles.formGroup}>
              <label htmlFor="photo" className={styles.label}>
                Photo
              </label>
              <div className={styles.uploadArea}>
                {formData.photoPreview ? (
                  <div className={styles.photoPreview}>
                    <img src={formData.photoPreview} alt="Profile preview" />
                    {pendingStatus.photo && (
                      <div className={styles.pendingBadge}>
                        ⏳ Update pending verification
                      </div>
                    )}
                  </div>
                ) : pendingStatus.photo ? (
                  <div className={styles.uploadPlaceholder}>
                    <div className={styles.pendingIndicator}>
                      <span className={styles.pendingIcon}>⏳</span>
                      <p>Photo update waiting for verification</p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.uploadPlaceholder}>
                    <p>No photo uploaded</p>
                  </div>
                )}
                <label htmlFor="photo" className={styles.uploadButton}>
                  {formData.photoPreview || pendingStatus.photo
                    ? "Change Photo"
                    : "Upload Photo"}
                </label>
                <input
                  type="file"
                  id="photo"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className={styles.fileInput}
                />
                <p className={styles.helpText}>JPG, PNG or GIF. Max 2MB</p>
                {errors.photo && <p className={styles.error}>{errors.photo}</p>}
              </div>
            </div>

            {/* Name */}
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>
                Display Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>

            {/* Bio */}
            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.label}>
                Bio
                {pendingStatus.bio && (
                  <span className={styles.pendingLabel}>
                    ⏳ Update pending...
                  </span>
                )}
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={styles.textarea}
                rows="6"
                placeholder={
                  pendingStatus.bio
                    ? "Your bio update is waiting for verification..."
                    : "Tell us about yourself..."
                }
              />
              {pendingStatus.bio && (
                <p className={styles.pendingNote}>
                  Your bio changes are awaiting admin verification
                </p>
              )}
            </div>

            {/* Links */}
            <div className={styles.formGroup}>
              <label htmlFor="Website" className={styles.label}>
                Website
              </label>
              <input
                type="url"
                id="Website"
                name="Website"
                value={formData.Website}
                onChange={handleChange}
                className={styles.input}
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="Instagram" className={styles.label}>
                Instagram
              </label>
              <input
                type="url"
                id="Instagram"
                name="Instagram"
                value={formData.Instagram}
                onChange={handleChange}
                className={styles.input}
                placeholder="https://instagram.com/yourusername"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="Imdb" className={styles.label}>
                IMDB
              </label>
              <input
                type="url"
                id="Imdb"
                name="Imdb"
                value={formData.Imdb}
                onChange={handleChange}
                className={styles.input}
                placeholder="https://imdb.com/name/..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="LinkedIn" className={styles.label}>
                LinkedIn
              </label>
              <input
                type="url"
                id="LinkedIn"
                name="LinkedIn"
                value={formData.LinkedIn}
                onChange={handleChange}
                className={styles.input}
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            {/* CV Upload */}
            <div className={styles.formGroup}>
              <label htmlFor="cv" className={styles.label}>
                CV / Resume
                {pendingStatus.cv && (
                  <span className={styles.pendingLabel}>⏳ Update pending</span>
                )}
              </label>
              <label htmlFor="cv" className={styles.uploadButton}>
                {formData.cv
                  ? formData.cv.name
                  : pendingStatus.cv
                  ? "CV update pending verification"
                  : "Upload CV"}
              </label>
              <input
                type="file"
                id="cv"
                accept="application/pdf"
                onChange={handleCVChange}
                className={styles.fileInput}
              />
              <p className={styles.helpText}>PDF, Maximum 2.5MB</p>
              {errors.cv && <p className={styles.error}>{errors.cv}</p>}
            </div>

            {/* Submit */}
            {errors.submit && <p className={styles.error}>{errors.submit}</p>}
            <button
              type="submit"
              className={styles.saveButton}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Verification Modal */}
      <VerificationModal
        isOpen={showVerificationModal}
        onClose={handleModalClose}
        changes={verificationChanges}
      />
    </>
  );
}

export default function EditProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditProfileForm />
    </Suspense>
  );
}
