// app/admin/news/page.jsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import styles from "../../../styles/adminNews.module.scss";
import Spinner from "../../../components/Spinner";

export const dynamic = "force-dynamic";
export default function AdminNewsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // Form state for editing
  const [formData, setFormData] = useState({
    title: "",
    pdfFile: null,
  });
  const [uploading, setUploading] = useState(false);

  const isLoggedIn = status === "authenticated";
  const isLoading = status === "loading";
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

  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      pdfFile: null,
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      pdfFile: null,
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title) {
      alert("Please provide a title");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      let newBlobId = null;

      // If a new PDF file was selected, upload it to Azure Blob
      if (formData.pdfFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", formData.pdfFile);
        uploadFormData.append("blobId", editingItem.blobId); // Use existing blobId
        uploadFormData.append("type", "news-pdf");

        const uploadResponse = await fetch("/api/upload-blob", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload PDF");
        }

        const uploadResult = await uploadResponse.json();
        newBlobId = uploadResult.blobId;
      }

      // Update news item in database
      const updateResponse = await fetch(
        `/api/admin/news/${editingItem.blobId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            newBlobId: newBlobId, // Only sent if a new file was uploaded
            fileName: formData.pdfFile ? formData.pdfFile.name : null,
          }),
        },
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || "Failed to update news item");
      }

      // Reset form and refresh list
      setFormData({ title: "", pdfFile: null });
      setEditingItem(null);
      fetchNewsItems();
      alert("News item updated successfully!");
    } catch (err) {
      console.error("Error updating news:", err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading || !isLoggedIn || !isAdmin) {
    return (
      <div className={styles.loading}>
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Manage News</h1>
          <p className={styles.subtitle}>
            Update the 4 monthly news documents below
          </p>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className={styles.loading}>
            <Spinner />
          </div>
        ) : (
          <div className={styles.newsList}>
            {newsItems.map((item) => (
              <div key={item.id} className={styles.newsItemCard}>
                {editingItem?.id === item.id ? (
                  // Edit Mode
                  <form onSubmit={handleSubmit} className={styles.editForm}>
                    <div className={styles.formGroup}>
                      <label htmlFor={`title-${item.id}`}>Title *</label>
                      <input
                        type="text"
                        id={`title-${item.id}`}
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder="e.g., Drama Production Report Dec 25"
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor={`pdfFile-${item.id}`}>
                        PDF File{" "}
                        {formData.pdfFile
                          ? "*"
                          : "(optional - leave empty to keep current file)"}
                      </label>
                      <input
                        type="file"
                        id={`pdfFile-${item.id}`}
                        accept="application/pdf"
                        onChange={handleFileChange}
                      />
                      {formData.pdfFile && (
                        <p className={styles.fileName}>
                          {formData.pdfFile.name}
                        </p>
                      )}
                      {!formData.pdfFile && (
                        <p className={styles.currentFile}>
                          Current file: {item.pdfFileName}
                        </p>
                      )}
                    </div>

                    <div className={styles.formActions}>
                      <button
                        type="submit"
                        className={styles.saveButton}
                        disabled={uploading}
                      >
                        {uploading ? "Updating..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className={styles.cancelButton}
                        disabled={uploading}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  // View Mode
                  <>
                    <div className={styles.newsInfo}>
                      <h3>{item.title}</h3>
                      <div className={styles.metadata}>
                        <span>
                          Published:{" "}
                          {new Date(item.publishDate).toLocaleDateString()}
                        </span>
                        <span className={styles.fileName}>
                          File: {item.pdfFileName}
                        </span>
                      </div>
                    </div>

                    <div className={styles.actions}>
                      <a
                        // href={item.pdfUrl}
                        href={`${process.env.AZURE_BLOB_BASE_URL}/${item.blobId}?${process.env.AZURE_BLOB_SAS_TOKEN}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.viewButton}
                      >
                        View PDF
                      </a>
                      <button
                        onClick={() => startEdit(item)}
                        className={styles.editButton}
                        disabled={editingItem !== null}
                      >
                        Edit
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {newsItems.length === 0 && !loading && (
          <p className={styles.noItems}>No news items found</p>
        )}
      </div>
    </>
  );
}
