import Script from "next/script";

/**
 * Privacy-first analytics via Umami Cloud (no cookies, GDPR-compliant).
 *
 * The script is only injected when NEXT_PUBLIC_UMAMI_WEBSITE_ID is set in
 * the environment. To activate: create a site at cloud.umami.is, copy the
 * website ID, and add it as an env var in Vercel. No code change required.
 */
export default function Analytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!websiteId) return null;

  return (
    <Script
      src="https://cloud.umami.is/script.js"
      data-website-id={websiteId}
      strategy="afterInteractive"
    />
  );
}
