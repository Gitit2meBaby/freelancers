// app/edit-profile/page.jsx
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
    website: "",
    equipmentList: null,
    instagram: "",
    imdb: "",
    linkedin: "",
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

  /**
   * Upload a file to Azure Blob Storage via API
   * @param {File} file - The file to upload
   * @param {string} blobId - The blob identifier
   * @param {string} type - File type ('image', 'cv', 'equipment')
   * @returns {Promise<string>} The blob ID from Azure
   */
  const uploadToAzureBlob = async (file, blobId, type) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("blobId", blobId);
    formData.append("type", type);

    const response = await fetch("/api/upload-blob", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload file");
    }

    const result = await response.json();
    return result.blobId;
  };

  const loadUserProfile = async (slug) => {
    setLoading(true);
    try {
      // Fetch user data from the freelancer API
      const response = await fetch(`/api/freelancer/${slug}`);

      if (!response.ok) {
        throw new Error("Failed to load profile");
      }

      const result = await response.json();
      const data = result.data;

      // Populate form with existing data
      setFormData({
        photo: null,
        photoPreview: data.photoUrl || null,
        name: data.name || "",
        role: data.skills?.[0]?.skillName || "", // First skill as primary role
        website: data.links?.website || "",
        equipmentList: null,
        instagram: data.links?.instagram || "",
        imdb: data.links?.imdb || "",
        linkedin: data.links?.linkedin || "",
        description: data.bio || "",
        cv: null,
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      setErrors((prev) => ({
        ...prev,
        load: "Failed to load profile data",
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      if (!file.type.match(/image\/(png|jpg|jpeg|gif|webp)/)) {
        setErrors((prev) => ({
          ...prev,
          photo: "Please upload PNG, JPG, GIF, or WebP only",
        }));
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          photo: "File size must be less than 2MB",
        }));
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          photo: file,
          photoPreview: reader.result,
        }));
      };
      reader.readAsDataURL(file);
      setErrors((prev) => ({ ...prev, photo: null }));
    }
  };

  const handleEquipmentUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setErrors((prev) => ({ ...prev, equipment: "Please upload PDF only" }));
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          equipment: "File size must be less than 2MB",
        }));
        return;
      }

      setFormData((prev) => ({ ...prev, equipmentList: file }));
      setErrors((prev) => ({ ...prev, equipment: null }));
    }
  };

  const handleCVUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setErrors((prev) => ({ ...prev, cv: "Please upload PDF only" }));
        return;
      }
      if (file.size > 2.5 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          cv: "File size must be less than 2.5MB",
        }));
        return;
      }

      setFormData((prev) => ({ ...prev, cv: file }));
      setErrors((prev) => ({ ...prev, cv: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const freelancerId = session?.user?.id;
      if (!freelancerId) {
        throw new Error("User ID not found");
      }

      // Upload files to Azure Blob Storage if new files were selected
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
        links: {
          website: formData.website,
          instagram: formData.instagram,
          imdb: formData.imdb,
          linkedin: formData.linkedin,
        },
      };

      // Save data to database via API
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

      // Redirect back to profile on success
      router.push(`/my-account/${session.user.slug}`);
      router.refresh();
    } catch (error) {
      console.error("Error saving profile:", error);
      setErrors((prev) => ({
        ...prev,
        submit: error.message || "Failed to save profile. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !isLoggedIn) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div
      className={styles.editProfilePage}
      data-footer="noBorder"
      data-page="plain"
    >
      <h1 className={styles.pageTitle}>Crew Information</h1>

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
                  <img src={formData.photoPreview} alt="Preview" />
                </div>
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <p>No photo uploaded</p>
                </div>
              )}
              <div className={styles.flexBox}>
                <label htmlFor="photo" className={styles.uploadButton}>
                  Upload Photo
                </label>
                <input
                  type="file"
                  id="photo"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={handlePhotoUpload}
                  className={styles.fileInput}
                />
                <p className={styles.helpText}>
                  PNG, WebP or JPG, Maximum File size is 2MB
                </p>
                {errors.photo && <p className={styles.error}>{errors.photo}</p>}
              </div>
            </div>
          </div>

          {/* Name - Auto Populated */}
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Your full name"
              required
            />
          </div>

          {/* Role - Auto Populated from primary skill */}
          <div className={styles.formGroup}>
            <label htmlFor="role" className={styles.label}>
              Primary Role
            </label>
            <input
              type="text"
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="e.g., Stills Photographer"
            />
            <p className={styles.helpText}>Your main role or specialty</p>
          </div>

          {/* Website */}
          <div className={styles.formGroup}>
            <label htmlFor="website" className={styles.label}>
              Website
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="https://yourwebsite.com"
            />
          </div>

          {/* Equipment List */}
          <div className={styles.formGroup}>
            <label htmlFor="equipment" className={styles.label}>
              Equipment List
            </label>
            <label htmlFor="equipment" className={styles.uploadButton}>
              {formData.equipmentList
                ? formData.equipmentList.name
                : "Add File"}
            </label>
            <input
              type="file"
              id="equipment"
              accept="application/pdf"
              onChange={handleEquipmentUpload}
              className={styles.fileInput}
            />
            <p style={{ marginTop: ".5rem" }} className={styles.helpText}>
              PDF, Maximum File size is 2MB
            </p>
            {errors.equipment && (
              <p className={styles.error}>{errors.equipment}</p>
            )}
          </div>

          {/* Instagram */}
          <div className={styles.formGroup}>
            <label htmlFor="instagram" className={styles.label}>
              Instagram
            </label>
            <input
              type="text"
              id="instagram"
              name="instagram"
              value={formData.instagram}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="@username or URL"
            />
          </div>

          {/* IMDb */}
          <div className={styles.formGroup}>
            <label htmlFor="imdb" className={styles.label}>
              IMDb
            </label>
            <input
              type="url"
              id="imdb"
              name="imdb"
              value={formData.imdb}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="https://imdb.com/yourprofile"
            />
          </div>

          {/* LinkedIn */}
          <div className={styles.formGroup}>
            <label htmlFor="linkedin" className={styles.label}>
              LinkedIn
            </label>
            <input
              type="url"
              id="linkedin"
              name="linkedin"
              value={formData.linkedin}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

          {/* Description */}
          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={styles.textarea}
              rows="6"
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* CV Upload */}
          <div className={styles.formGroup}>
            <label htmlFor="cv" className={styles.label}>
              CV
            </label>
            <label htmlFor="cv" className={styles.uploadButton}>
              {formData.cv ? formData.cv.name : "Upload CV"}
            </label>
            <input
              type="file"
              id="cv"
              accept="application/pdf"
              onChange={handleCVUpload}
              className={styles.fileInput}
            />
            <p className={styles.helpText}>PDF, Maximum File size is 2.5MB</p>
            {errors.cv && <p className={styles.error}>{errors.cv}</p>}
          </div>

          {/* Submit Button */}
          {errors.submit && <p className={styles.error}>{errors.submit}</p>}
          <button
            type="submit"
            className={styles.saveButton}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
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
