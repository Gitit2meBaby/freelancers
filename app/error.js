"use client";

// app/error.js
// Global error boundary for the Next.js App Router.
// Catches unhandled errors in any route segment and renders a recovery UI
// instead of a blank page.
//
// Next.js automatically wraps each route segment with its nearest error.js.
// Place additional error.js files inside specific route folders
// (e.g. app/crew-directory/error.js) to provide more targeted recovery UI
// for those sections while the rest of the site stays functional.
//
// The reset() function attempts to re-render the segment — useful for
// transient errors like a momentary DB timeout.

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log to console in development; swap for your error reporting
    // service (e.g. Azure Application Insights) in production.
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        gap: "1.25rem",
      }}
    >
      <h2 style={{ fontSize: "1.25rem", fontWeight: 500, margin: 0 }}>
        Something went wrong
      </h2>
      <p
        style={{
          fontSize: "0.95rem",
          color: "var(--color-text-secondary, #666)",
          maxWidth: "420px",
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        We hit an unexpected error loading this page. This has been noted and
        the rest of the site is still available.
      </p>

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button
          onClick={reset}
          style={{
            padding: "0.55rem 1.25rem",
            fontSize: "0.9rem",
            borderRadius: "6px",
            border: "1px solid currentColor",
            background: "transparent",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            padding: "0.55rem 1.25rem",
            fontSize: "0.9rem",
            borderRadius: "6px",
            border: "1px solid transparent",
            background: "var(--color-text-primary, #111)",
            color: "var(--color-background-primary, #fff)",
            textDecoration: "none",
          }}
        >
          Go home
        </Link>
      </div>

      {/* Surface the error digest in development only */}
      {process.env.NODE_ENV === "development" && error?.digest && (
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-tertiary, #999)",
            fontFamily: "monospace",
            margin: 0,
          }}
        >
          Digest: {error.digest}
        </p>
      )}
    </div>
  );
}
