"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

// Lazy-load the actual MapView so MapLibre is only fetched on /map.
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-60px)] w-full items-center justify-center bg-slate-50 text-slate-500">
      Loading map…
    </div>
  ),
});

export default function MapPageClient() {
  return (
    <div
      role="region"
      aria-label="Interactive map of PFAS contamination levels across the United States"
      style={{ width: "100%", height: "calc(100vh - 64px)" }}
    >
      {/* Screen-reader / keyboard alternative: the map is mouse and touch
          interactive only. Anyone using assistive tech can reach the same
          data via the zip-code search on the homepage. */}
      <p className="sr-only">
        This map is mouse and touch interactive. The same PFAS contamination
        data for any U.S. address is also available through the zip code
        search on the{" "}
        <Link href="/">homepage</Link>.
      </p>
      <MapView />
    </div>
  );
}
