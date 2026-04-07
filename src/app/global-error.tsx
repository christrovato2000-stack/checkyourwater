"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary for failures inside the root layout itself.
 * Cannot rely on layout components — must render its own <html>/<body>.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("Global error", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          color: "#0f172a",
          backgroundColor: "#ffffff",
          margin: 0,
          padding: "4rem 1.5rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ marginTop: "1rem", color: "#475569" }}>
          We hit an unexpected problem. Please try again.
        </p>
        <p style={{ marginTop: "1.5rem" }}>
          <a
            href="/"
            style={{
              color: "#2563eb",
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            Return to homepage
          </a>
        </p>
      </body>
    </html>
  );
}
