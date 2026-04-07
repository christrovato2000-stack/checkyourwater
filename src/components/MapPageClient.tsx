"use client";

import dynamic from "next/dynamic";

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
    <div className="h-[calc(100vh-60px)] w-full">
      <MapView />
    </div>
  );
}
