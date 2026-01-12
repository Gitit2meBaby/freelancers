// app/admin/news/page.jsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import styles from "../../styles/adminNews.module.scss";

export default function AdminNewsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    pdfFile: null,
  });
  const [uploading, setUploading] = useState(false);

  const isLoggedIn = status === "authenticated";
  const isLoading = status === "loading";

  // Check if user is admin (you'll need to add isAdmin to your session)
  const isAdmin = session?.user?.isAdmin || false;

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/member-login");
    } else if (isLoggedIn && !isAdmin) {
      router.push("/");
    } else if (isLoggedIn && isAdmin) {
      fetchNewsItems();
    }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  const fetchNewsItems = async () => {
    try {
      const response = await fetch("/api/admin/news");
      if (!response.ok) throw new Error("Failed to fetch news");

      const result = await response.json();
      setNewsItems(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please select a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("PDF must be less than 10MB");
      return;
    }

    setFormData({ ...formData, pdfFile: file });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.pdfFile) {
      alert("Please provide a title and PDF file");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload PDF to Azure Blob
      const uploadFormData = new FormData();
      uploadFormData.append("file", formData.pdfFile);
      uploadFormData.append("blobId", `news-${Date.now()}`);
      uploadFormData.append("type", "news-pdf");

      const uploadResponse = await fetch("/api/upload-blob", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload PDF");
      }

      const uploadResult = await uploadResponse.json();

      // Create news item in database
      const createResponse = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          pdfBlobId: uploadResult.blobId,
          pdfFileName: formData.pdfFile.name,
        }),
      });

      if (!createResponse.ok) {
        throw new Error("Failed to create news item");
      }

      // Reset form and refresh list
      setFormData({ title: "", pdfFile: null });
      setShowAddForm(false);
      fetchNewsItems();
      alert("News item added successfully!");
    } catch (err) {
      console.error("Error adding news:", err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this news item?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/news/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete news item");
      }

      fetchNewsItems();
      alert("News item deleted successfully!");
    } catch (err) {
      console.error("Error deleting news:", err);
      alert(err.message);
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      const response = await fetch(`/api/admin/news/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update news item");
      }

      fetchNewsItems();
    } catch (err) {
      console.error("Error updating news:", err);
      alert(err.message);
    }
  };

  if (isLoading || !isLoggedIn || !isAdmin) {
    return (
      <div className={styles.adminPage}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.adminPage} data-page="plain" data-footer="noBorder">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Manage News</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={styles.addButton}
          >
            {showAddForm ? "Cancel" : "Add News Item"}
          </button>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <p>{error}</p>
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleSubmit} className={styles.addForm}>
            <h2>Add New News Item</h2>

            <div className={styles.formGroup}>
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Drama Production Report Dec 25"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="pdfFile">PDF File *</label>
              <input
                type="file"
                id="pdfFile"
                accept="application/pdf"
                onChange={handleFileChange}
                required
              />
              {formData.pdfFile && (
                <p className={styles.fileName}>{formData.pdfFile.name}</p>
              )}
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Add News Item"}
            </button>
          </form>
        )}

        <div className={styles.newsList}>
          <h2>Current News Items</h2>

          {loading ? (
            <div className={styles.loading}>
              <p>Loading news items...</p>
            </div>
          ) : newsItems.length === 0 ? (
            <p className={styles.noItems}>No news items yet</p>
          ) : (
            <div className={styles.newsTable}>
              {newsItems.map((item) => (
                <div key={item.id} className={styles.newsItem}>
                  <div className={styles.newsInfo}>
                    <h3>{item.title}</h3>
                    <div className={styles.metadata}>
                      <span>
                        Published:{" "}
                        {new Date(item.publishDate).toLocaleDateString()}
                      </span>
                      <span
                        className={
                          item.isActive ? styles.active : styles.inactive
                        }
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <a
                      href={item.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.viewButton}
                    >
                      View PDF
                    </a>
                    <button
                      onClick={() => toggleActive(item.id, item.isActive)}
                      className={styles.toggleButton}
                    >
                      {item.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
