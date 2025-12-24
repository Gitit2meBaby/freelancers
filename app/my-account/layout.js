// app/my-account/layout.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../AuthContext";

import News from "../components/News";

export const metadata = {
  title: "My Account",
  description: "Manage your account settings and profile.",
  name: "robots",
  content: "noindex, nofollow",
};

export default function AccountLayout({ children }) {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/member-login");
    }
  }, [isLoggedIn, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <>
      {children}
      <News />
    </>
  );
}
