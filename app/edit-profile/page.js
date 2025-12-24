// app/edit-profile/page.jsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../AuthContext";

import styles from "../styles/editProfile.module.scss";

function EditProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const userId = searchParams.get("id");

  const [formData, setFormData] = useState({
    photo: null,
    photoPreview: null,
    name: "",
    role: "",
    website: "",
    equipmentList: null,
    instagram: "",
    imdb: "",
    description: "",
    cv: null,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/member-login");
      return;
    }

    if (userId) {
      loadUserProfile(userId);
    }
  }, [authLoading, isLoggedIn, userId, router]);

  const loadUserProfile = async (id) => {
    setLoading(true);
    try {
      // TODO: Fetch user data from database via API
      // const response = await fetch(`/api/profile/${id}`);
      // const data = await response.json();

      // TODO: Populate form with existing data
      // setFormData({
      //   photo: null,
      //   photoPreview: data.image_url || null,
      //   name: data.name || '',
      //   role: data.role || '',
      //   website: data.website || '',
      //   equipmentList: null,
      //   instagram: data.instagram || '',
      //   imdb: data.imdb || '',
      //   description: data.description || '',
      //   cv: null,
      // });

      console.log("TODO: Load user profile for ID:", id);
    } catch (error) {
      console.error("Error loading profile:", error);
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
      if (!file.type.match(/image\/(png|jpg|jpeg)/)) {
        setErrors((prev) => ({
          ...prev,
          photo: "Please upload PNG or JPG only",
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
      // TODO: Create FormData object for file uploads
      // const submitData = new FormData();
      // if (formData.photo) submitData.append('photo', formData.photo);
      // if (formData.equipmentList) submitData.append('equipment', formData.equipmentList);
      // if (formData.cv) submitData.append('cv', formData.cv);
      // submitData.append('name', formData.name);
      // submitData.append('role', formData.role);
      // submitData.append('website', formData.website);
      // submitData.append('instagram', formData.instagram);
      // submitData.append('imdb', formData.imdb);
      // submitData.append('description', formData.description);

      // TODO: Upload files to Azure Blob Storage
      // const photoUrl = await uploadToAzureBlob(formData.photo, 'images');
      // const equipmentUrl = await uploadToAzureBlob(formData.equipmentList, 'equipment');
      // const cvUrl = await uploadToAzureBlob(formData.cv, 'resumes');

      // TODO: Save data to Access database via API
      // const response = await fetch(`/api/profile/${userId}`, {
      //   method: 'PUT',
      //   body: submitData,
      // });

      // if (!response.ok) throw new Error('Failed to save profile');

      console.log("TODO: Submit form data:", formData);

      // TODO: Redirect back to profile on success
      // router.push(`/my-account/${user.slug}`);

      alert("Profile saved successfully! (TODO: Implement actual save)");
    } catch (error) {
      console.error("Error saving profile:", error);
      setErrors((prev) => ({
        ...prev,
        submit: "Failed to save profile. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.editProfilePage}>
      <h1 className={styles.pageTitle}>Crew Information</h1>

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
              <label htmlFor="photo" className={styles.uploadButton}>
                Upload Photo
              </label>
              <input
                type="file"
                id="photo"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handlePhotoUpload}
                className={styles.fileInput}
              />
              <p className={styles.helpText}>
                PNG or JPG, Maximum File size is 2MB
              </p>
              {errors.photo && <p className={styles.error}>{errors.photo}</p>}
            </div>
          </div>

          {/* Name */}
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
              placeholder="Dan Thomas"
              required
            />
          </div>

          {/* Role */}
          <div className={styles.formGroup}>
            <label htmlFor="role" className={styles.label}>
              Role
            </label>
            <input
              type="text"
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Stills Photographer"
              required
            />
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
            <p className={styles.helpText}>PDF, Maximum File size is 2MB</p>
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
