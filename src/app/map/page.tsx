import type { Metadata } from "next";
import MapPageClient from "@/components/MapPageClient";

export const metadata: Metadata = {
  title: "National PFAS Contamination Map",
  description:
    "Interactive map of PFAS contamination levels in 10,297 water systems across the United States. Color-coded by EPA grade. Built from EPA UCMR 5 data.",
  openGraph: {
    title: "National PFAS Contamination Map | CheckYourWater",
    description:
      "Interactive map of PFAS contamination levels in 10,297 water systems across the United States.",
    images: ["/api/og"],
  },
};

export default function MapPage() {
  return <MapPageClient />;
}
