"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminModal, { checkAdminAuth } from "./AdminModal";

export default function AdminLink() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  // Never read localStorage during render — only ever on explicit user click.
  // This prevents any SSR/hydration mismatch and ensures the modal
  // is only opened by deliberate interaction, never on page load.
  const handleClick = (e) => {
    e.preventDefault();
    if (checkAdminAuth()) {
      router.push("/admin/news");
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <a href="/admin/news" onClick={handleClick}>
        Admin
      </a>

      {showModal && (
        <AdminModal
          onClose={() => setShowModal(false)}
          redirectTo="/admin/news"
        />
      )}
    </>
  );
}
