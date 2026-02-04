"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import styles from "../styles/editProfile.module.scss";
import Spinner from "../components/Spinner";

export const dynamic = "force-dynamic";

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
    cvUrl: null,
    cvFileName: "",
    equipment: null,
    equipmentUrl: null,
    equipmentFileName: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ✅ Helper to properly append cache-busting param
  const addCacheBuster = (url) => {
    if (!url) return null;

    const timestamp = Date.now();
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${timestamp}`;
  };

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
      // Cache-busting timestamp for API call
      const timestamp = Date.now();
      const editDataResponse = await fetch(
        `/api/profile/load-for-edit?t=${timestamp}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        },
      );

      if (!editDataResponse.ok) {
        throw new Error("Failed to load profile for editing");
      }

      const editResult = await editDataResponse.json();
      const editData = editResult.data;

      // ✅ FIX: Properly add cache-buster to photo URL
      const photoUrlWithTimestamp = addCacheBuster(editData.photoUrl);

      // Extract file names from URLs for display
      const cvFileName = editData.cvUrl
        ? extractFileNameFromUrl(editData.cvUrl) || "Current CV"
        : "";

      const equipmentFileName = editData.equipmentListUrl
        ? extractFileNameFromUrl(editData.equipmentListUrl) ||
          "Current Equipment List"
        : "";

      setFormData({
        photo: null,
        photoPreview: photoUrlWithTimestamp,
        name: editData.name || "",
        role: "Film Crew Member",
        Website: editData.links.Website || "",
        Instagram: editData.links.Instagram || "",
        Imdb: editData.links.Imdb || "",
        LinkedIn: editData.links.LinkedIn || "",
        description: editData.bio || "",
        cv: null,
        cvUrl: editData.cvUrl || null,
        cvFileName: cvFileName,
        equipment: null,
        equipmentUrl: editData.equipmentListUrl || null,
        equipmentFileName: equipmentFileName,
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      setErrors({ load: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract file name from URL
  const extractFileNameFromUrl = (url) => {
    if (!url) return "";
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split("/").pop();
      return fileName || "";
    } catch (e) {
      return "";
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

  const handlePdfChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const fieldName = type === "cv" ? "CV" : "Equipment list";

    if (file.type !== "application/pdf") {
      setErrors({ ...errors, [type]: `${fieldName} must be a PDF file` });
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setErrors({ ...errors, [type]: `${fieldName} must be less than 2.5MB` });
      return;
    }

    // Also update the file name when a new file is selected
    const fileNameKey = type === "cv" ? "cvFileName" : "equipmentFileName";
    setFormData({
      ...formData,
      [type]: file,
      [fileNameKey]: file.name,
    });
    setErrors({ ...errors, [type]: "" });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const uploadToAzureBlob = async (file, type) => {
    const formDataToUpload = new FormData();
    formDataToUpload.append("file", file);
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
      let photoBlobId = null;
      let cvBlobId = null;
      let EquipmentBlobID = null;

      if (formData.photo) {
        photoBlobId = await uploadToAzureBlob(formData.photo, "photo");
      }

      if (formData.cv) {
        cvBlobId = await uploadToAzureBlob(formData.cv, "cv");
      }

      if (formData.equipment) {
        EquipmentBlobID = await uploadToAzureBlob(
          formData.equipment,
          "equipment",
        );
      }

      const updateData = {
        displayName: formData.name,
        bio: formData.description,
        photoBlobId,
        cvBlobId,
        EquipmentBlobID,
        links: {
          Website: formData.Website,
          Instagram: formData.Instagram,
          Imdb: formData.Imdb,
          LinkedIn: formData.LinkedIn,
        },
      };

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

      console.log(`✅ Profile saved successfully`);

      // Cache busting and navigation
      window.dispatchEvent(new CustomEvent("profileUpdated"));
      console.log("📢 Dispatched profileUpdated event");

      await new Promise((resolve) => setTimeout(resolve, 500));

      const timestamp = Date.now();
      router.push(`/my-account/${session.user.slug}?updated=${timestamp}`);
      router.refresh();
    } catch (error) {
      console.error("❌ Error saving profile:", error);
      setErrors({
        submit: error.message || "Failed to save profile. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !isLoggedIn) {
    return (
      <section
        className={styles.editProfilePage}
        data-footer="noBorder"
        data-page="plain"
      >
        <Spinner />
      </section>
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
                  <img
                    src={formData.photoPreview}
                    alt="Profile preview"
                    key={formData.photoPreview}
                  />
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

          {/* CV and Equipment Upload */}
          <div className={styles.formUploads}>
            <div className={styles.formGroup}>
              <label htmlFor="cv" className={styles.label}>
                CV / Resume
              </label>
              <label htmlFor="cv" className={styles.uploadButton}>
                {formData.cv
                  ? formData.cv.name
                  : formData.cvFileName || "Upload CV"}
              </label>
              <input
                type="file"
                id="cv"
                accept="application/pdf"
                onChange={(e) => handlePdfChange(e, "cv")}
                className={styles.fileInput}
              />
              <p className={styles.helpText}>PDF, Max 2.5MB</p>
              {errors.cv && <p className={styles.error}>{errors.cv}</p>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="equipment" className={styles.label}>
                Equipment List
              </label>
              <label htmlFor="equipment" className={styles.uploadButton}>
                {formData.equipment
                  ? formData.equipment.name
                  : formData.equipmentFileName || "Upload List"}
              </label>
              <input
                type="file"
                id="equipment"
                accept="application/pdf"
                onChange={(e) => handlePdfChange(e, "equipment")}
                className={styles.fileInput}
              />
              <p className={styles.helpText}>PDF, Max 2.5MB</p>
              {errors.equipment && (
                <p className={styles.error}>{errors.equipment}</p>
              )}
            </div>
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
    <Suspense fallback={<Spinner />}>
      <EditProfileForm />
    </Suspense>
  );
}
