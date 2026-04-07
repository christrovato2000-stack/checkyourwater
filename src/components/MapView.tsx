"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MlMap, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const GRADES = ["A", "B", "C", "D", "F"] as const;
type Grade = (typeof GRADES)[number];

// Keep in sync with src/lib/format.ts — WCAG AA against white text.
const GRADE_COLORS: Record<Grade, string> = {
  A: "#15803d",
  B: "#4d7c0f",
  C: "#a16207",
  D: "#c2410c",
  F: "#b91c1c",
};

const GRADE_LABELS: Record<Grade, string> = {
  A: "No PFAS detected",
  B: "Below limits",
  C: "Approaching limits",
  D: "Exceeds limits",
  F: "Severely exceeds",
};

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const [activeGrades, setActiveGrades] = useState<Set<Grade>>(
    new Set(GRADES)
  );
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [-98.5, 39.8],
      zoom: 3.6,
      maxBounds: [
        [-179, 17],
        [-65, 72],
      ],
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({}), "top-right");

    // Force a resize after mount in case the container had 0 dimensions
    // when the map was constructed (can happen with dynamic imports).
    const resizeRaf = requestAnimationFrame(() => map.resize());

    map.on("load", () => {
      map.resize();
      map.addSource("systems", {
        type: "geojson",
        data: "/data/systems.geojson",
      });

      map.addLayer({
        id: "water-systems",
        type: "circle",
        source: "systems",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            1.8,
            6,
            3.5,
            10,
            8,
            14,
            14,
          ],
          "circle-color": [
            "match",
            ["get", "g"],
            "A",
            GRADE_COLORS.A,
            "B",
            GRADE_COLORS.B,
            "C",
            GRADE_COLORS.C,
            "D",
            GRADE_COLORS.D,
            "F",
            GRADE_COLORS.F,
            "#9ca3af",
          ],
          "circle-stroke-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            0,
            8,
            1,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.85,
        },
      });

      // Hover cursor
      map.on("mouseenter", "water-systems", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "water-systems", () => {
        map.getCanvas().style.cursor = "";
      });

      // Click popup
      map.on("click", "water-systems", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, string | number | null>;
        const coords = (f.geometry as GeoJSON.Point).coordinates as [
          number,
          number,
        ];
        const grade = (p.g as Grade) || "?";
        const color =
          (GRADE_COLORS as Record<string, string>)[grade] || "#9ca3af";
        const ratio = p.r != null ? Number(p.r).toFixed(2) : null;
        const pop =
          p.p != null ? Number(p.p).toLocaleString() : "Unknown";
        const city = p.c ? `${p.c}, ${p.s ?? ""}` : (p.s ?? "");
        const html = `
          <div class="font-sans text-slate-900" style="min-width:200px;max-width:260px">
            <div class="font-serif text-base font-semibold leading-tight">${escapeHtml(
              String(p.n ?? "")
            )}</div>
            <div class="text-xs text-slate-500 mt-0.5">${escapeHtml(
              String(city)
            )}</div>
            <div class="mt-2 flex items-center gap-2">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${color};color:#fff;font-weight:700;font-size:14px">${grade}</span>
              <span class="text-xs text-slate-600">${
                p.w ? `${escapeHtml(String(p.w))}${ratio ? ` &middot; ${ratio}× MCL` : ""}` : "No PFAS detected"
              }</span>
            </div>
            <div class="mt-1 text-xs text-slate-500">Population: ${pop}</div>
            <a href="/system/${encodeURIComponent(
              String(p.id ?? "")
            )}" class="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline">View details →</a>
          </div>
        `;
        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new maplibregl.Popup({
          closeButton: true,
          maxWidth: "280px",
        })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
      });

      setReady(true);
    });

    return () => {
      cancelAnimationFrame(resizeRaf);
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Apply grade filter when activeGrades changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const arr = Array.from(activeGrades);
    if (arr.length === 0) {
      map.setFilter("water-systems", ["==", ["get", "g"], "__none__"]);
    } else {
      map.setFilter("water-systems", [
        "in",
        ["get", "g"],
        ["literal", arr],
      ]);
    }
  }, [activeGrades, ready]);

  function toggleGrade(g: Grade) {
    setActiveGrades((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  function showAll() {
    setActiveGrades(new Set(GRADES));
  }
  function showExceedances() {
    setActiveGrades(new Set(["D", "F"] as Grade[]));
  }

  function findMyLocation() {
    const map = mapRef.current;
    if (!map) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        map.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 10,
          essential: true,
        });
      },
      (err) => {
        setLocating(false);
        alert(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it in your browser settings to use this feature."
            : "Could not determine your location."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <div
      className="relative"
      style={{ width: "100%", height: "calc(100vh - 64px)" }}
    >
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Filter toolbar */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex justify-center px-3 pt-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
          <span className="hidden text-xs font-medium text-slate-500 sm:inline">
            Filter:
          </span>
          {GRADES.map((g) => {
            const on = activeGrades.has(g);
            return (
              <button
                key={g}
                onClick={() => toggleGrade(g)}
                aria-pressed={on}
                style={{
                  backgroundColor: on ? GRADE_COLORS[g] : "transparent",
                  borderColor: GRADE_COLORS[g],
                  color: on ? "#fff" : GRADE_COLORS[g],
                }}
                className="h-7 w-7 rounded-full border-2 text-xs font-bold transition-opacity hover:opacity-80"
              >
                {g}
              </button>
            );
          })}
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <button
            onClick={showAll}
            className="rounded-full px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            All
          </button>
          <button
            onClick={showExceedances}
            className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Exceedances only
          </button>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <button
            onClick={findMyLocation}
            disabled={locating}
            aria-label="Find my location"
            className="flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3" />
              <path d="M12 19v3" />
              <path d="M2 12h3" />
              <path d="M19 12h3" />
            </svg>
            {locating ? "Locating…" : "Find me"}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="pointer-events-auto absolute bottom-4 right-4 z-10 max-w-[200px] rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-md backdrop-blur">
        <div className="mb-2 font-semibold text-slate-900">Grade</div>
        <ul className="space-y-1">
          {GRADES.map((g) => (
            <li key={g} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: GRADE_COLORS[g] }}
              />
              <span className="font-mono font-bold text-slate-700">{g}</span>
              <span className="text-slate-600">{GRADE_LABELS[g]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
