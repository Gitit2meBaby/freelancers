// app/edit-profile/page.jsx - CLEANED VERSION
"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
      const editDataResponse = await fetch(`/api/profile/load-for-edit`);

      if (!editDataResponse.ok) {
        throw new Error("Failed to load profile for editing");
      }

      const editResult = await editDataResponse.json();
      const editData = editResult.data;

      setFormData({
        photo: null,
        photoPreview: editData.photoUrl || null,
        name: editData.name || "",
        role: "Film Crew Member",
        Website: editData.links.Website || "",
        Instagram: editData.links.Instagram || "",
        Imdb: editData.links.Imdb || "",
        LinkedIn: editData.links.LinkedIn || "",
        description: editData.bio || "",
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

      // Prepare update data
      const updateData = {
        displayName: formData.name,
        bio: formData.description,
        photoBlobId,
        cvBlobId,
        photoFileName: formData.photo?.name,
        cvFileName: formData.cv?.name,
        links: {
          Website: formData.Website,
          Instagram: formData.Instagram,
          Imdb: formData.Imdb,
          LinkedIn: formData.LinkedIn,
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

      // Redirect to profile page
      router.push(`/my-account/${session.user.slug}`);
      router.refresh();
    } catch (error) {
      console.error("Error saving profile:", error);
      setErrors({
        submit: error.message || "Failed to save profile. Please try again.",
      });
    } finally {
      setLoading(false);
    }
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
              placeholder="Tell us about yourself..."
            />
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
  );
}

export default function EditProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditProfileForm />
    </Suspense>
  );
}
