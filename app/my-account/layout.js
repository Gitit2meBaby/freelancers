// app/my-account/layout.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import styles from "../styles/profile.module.scss";

export default function AccountLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoggedIn = status === "authenticated";
  const loading = status === "loading";

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/member-login");
    }
  }, [isLoggedIn, loading, router]);

  if (loading) {
    return (
      <div
        className={styles.profilePage}
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
        ;
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return <>{children}</>;
}
