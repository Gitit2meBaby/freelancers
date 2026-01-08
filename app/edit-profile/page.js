// app/edit-profile/page.jsx
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
    website: "",
    instagram: "",
    imdb: "",
    linkedin: "",
    description: "",
    cv: null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationChanges, setVerificationChanges] = useState({});

  // ********* temporarily
  useEffect(() => {
    if (session) {
      console.log("Session data:", session);
      console.log("FreelancerId:", session.user?.freelancerId);
      console.log("Slug:", session.user?.slug);
    }
  }, [session]);

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
      const response = await fetch(`/api/freelancer/${slug}`);

      if (!response.ok) {
        throw new Error("Failed to load profile");
      }

      const result = await response.json();
      const data = result.data;

      setFormData({
        photo: null,
        photoPreview: data.photoUrl || null,
        name: data.name || "",
        role: data.skills?.[0]?.skillName || "Unassigned Skill",
        website: data.links?.website || "",
        instagram: data.links?.instagram || "",
        imdb: data.links?.imdb || "",
        linkedin: data.links?.linkedin || "",
        description: data.bio || "",
        cv: null,
      });
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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors({ ...errors, photo: "Please select an image file" });
      return;
    }

    // Validate file size (2MB)
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

    // Validate file type
    if (file.type !== "application/pdf") {
      setErrors({ ...errors, cv: "CV must be a PDF file" });
      return;
    }

    // Validate file size (2.5MB)
    if (file.size > 2.5 * 1024 * 1024) {
      setErrors({ ...errors, cv: "CV must be less than 2.5MB" });
      return;
    }

    setFormData({ ...formData, cv: file });
    setErrors({ ...errors, cv: "" });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
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

      // Prepare update data
      const updateData = {
        displayName: formData.name,
        bio: formData.description,
        photoBlobId,
        cvBlobId,
        photoFileName: formData.photo?.name,
        cvFileName: formData.cv?.name,
        links: {
          website: formData.website,
          instagram: formData.instagram,
          imdb: formData.imdb,
          linkedin: formData.linkedin,
        },
      };

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
    // Redirect to profile after closing modal
    router.push(`/my-account/${session.user.slug}`);
    router.refresh();
  };

  if (isLoading || !isLoggedIn) {
    return <div className={styles.loading}>Loading...</div>;
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
                  </div>
                ) : (
                  <div className={styles.uploadPlaceholder}>
                    <p>No photo uploaded</p>
                  </div>
                )}
                <label htmlFor="photo" className={styles.uploadButton}>
                  {formData.photoPreview ? "Change Photo" : "Upload Photo"}
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
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={styles.textarea}
                rows="6"
                placeholder="Tell us about your experience..."
              />
            </div>

            {/* Links */}
            <div className={styles.formGroup}>
              <label htmlFor="website" className={styles.label}>
                Website
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className={styles.input}
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="instagram" className={styles.label}>
                Instagram
              </label>
              <input
                type="url"
                id="instagram"
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                className={styles.input}
                placeholder="https://instagram.com/yourusername"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="imdb" className={styles.label}>
                IMDB
              </label>
              <input
                type="url"
                id="imdb"
                name="imdb"
                value={formData.imdb}
                onChange={handleChange}
                className={styles.input}
                placeholder="https://imdb.com/name/..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="linkedin" className={styles.label}>
                LinkedIn
              </label>
              <input
                type="url"
                id="linkedin"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                className={styles.input}
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            {/* CV Upload */}
            <div className={styles.formGroup}>
              <label htmlFor="cv" className={styles.label}>
                CV / Resume
              </label>
              <label htmlFor="cv" className={styles.uploadButton}>
                {formData.cv ? formData.cv.name : "Upload CV"}
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
