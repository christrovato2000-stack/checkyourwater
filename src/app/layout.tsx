import type { Metadata } from "next";
import { Source_Serif_4, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";

const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://checkyourwater.org"),
  title: {
    default: "Check Your Water | Free PFAS Contamination Data",
    template: "%s | Check Your Water",
  },
  description:
    "Find out if PFAS 'forever chemicals' are in your drinking water. Free tool using EPA data. Enter your zip code.",
  openGraph: {
    type: "website",
    url: "https://checkyourwater.org",
    siteName: "Check Your Water",
    title: "Check Your Water | Free PFAS Contamination Data",
    description:
      "Find out if PFAS 'forever chemicals' are in your drinking water. Free tool using EPA data. Enter your zip code.",
    images: ["/api/og"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Check Your Water | Free PFAS Contamination Data",
    description:
      "Find out if PFAS 'forever chemicals' are in your drinking water. Free tool using EPA data.",
    images: ["/api/og"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-slate-900">
        {/* Skip-to-content link, visible on keyboard focus only */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:font-sans focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Skip to main content
        </a>
        {/* Editorial top accent rule */}
        <div aria-hidden className="h-0.5 w-full bg-blue-600" />
        <Nav />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
