import { ImageResponse } from "next/og";
import { supabasePublic } from "@/lib/supabase";

export const runtime = "nodejs";

// Keep in sync with src/lib/format.ts. WCAG AA against white text.
const GRADE_COLORS: Record<string, string> = {
  A: "#15803d",
  B: "#4d7c0f",
  C: "#a16207",
  D: "#c2410c",
  F: "#b91c1c",
};

const GRADE_SUMMARIES: Record<string, string> = {
  A: "No PFAS detected above reporting limits",
  B: "PFAS detected, below federal limits",
  C: "PFAS approaching federal limits",
  D: "PFAS exceeds federal limits",
  F: "PFAS significantly exceeds federal limits",
};

const NAVY = "#1a1a2e";
const SLATE = "#475569";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

interface CityOgRow {
  city_name: string;
  state_name: string | null;
  state_code: string;
  grade: string | null;
  worst_compound: string | null;
  worst_ratio: number | null;
  total_detections: number | null;
  total_exceedances: number | null;
}

async function loadCityForOg(slug: string): Promise<CityOgRow | null> {
  const { data } = await supabasePublic
    .from("cities")
    .select(
      "city_name, state_name, state_code, grade, worst_compound, worst_ratio, total_detections, total_exceedances"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  return data as CityOgRow;
}

function defaultCard() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "white",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            height: "12px",
            width: "100%",
            backgroundColor: "#2563eb",
            display: "flex",
          }}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 80px",
          }}
        >
          <div
            style={{
              fontSize: 32,
              color: SLATE,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            CheckYourWater.org
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: NAVY,
              marginTop: 24,
              lineHeight: 1.05,
              display: "flex",
            }}
          >
            What&rsquo;s in your water?
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#334155",
              marginTop: 28,
              lineHeight: 1.3,
              display: "flex",
            }}
          >
            Free PFAS contamination data for 10,297 water systems
          </div>
          <div
            style={{
              fontSize: 28,
              color: SLATE,
              marginTop: 40,
              display: "flex",
            }}
          >
            Enter your zip code at checkyourwater.org
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: CACHE_HEADERS,
    }
  );
}

function cityCard(city: CityOgRow) {
  const grade = (city.grade ?? "-").toString();
  const gradeColor = GRADE_COLORS[grade] ?? "#4a5568";
  const summary =
    GRADE_SUMMARIES[grade] ??
    "PFAS testing data from EPA UCMR 5";
  const detections = city.total_detections ?? 0;
  const exceedances = city.total_exceedances ?? 0;
  const stateName = city.state_name ?? city.state_code;

  const statBits: string[] = [];
  statBits.push(
    `${detections} ${detections === 1 ? "compound detected" : "compounds detected"}`
  );
  statBits.push(
    `${exceedances} ${exceedances === 1 ? "exceeds limits" : "exceed limits"}`
  );
  if (city.worst_compound && city.worst_ratio && city.worst_ratio >= 1) {
    statBits.push(
      `Worst: ${city.worst_compound} at ${city.worst_ratio.toFixed(1)}× limit`
    );
  }
  const statLine = statBits.join("  |  ");

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "white",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            height: "12px",
            width: "100%",
            backgroundColor: "#2563eb",
            display: "flex",
          }}
        />

        {/* Top brand row */}
        <div
          style={{
            display: "flex",
            padding: "40px 80px 0 80px",
            fontSize: 26,
            color: SLATE,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          CheckYourWater.org
        </div>

        {/* Middle row: grade circle + city/summary */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: "0 80px",
            gap: 56,
          }}
        >
          <div
            style={{
              width: 240,
              height: 240,
              borderRadius: 9999,
              backgroundColor: gradeColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 180,
                fontWeight: 800,
                color: "white",
                lineHeight: 1,
                display: "flex",
                marginTop: -16,
              }}
            >
              {grade}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: NAVY,
                lineHeight: 1.05,
                display: "flex",
              }}
            >
              {city.city_name}, {stateName}
            </div>
            <div
              style={{
                fontSize: 32,
                color: "#334155",
                marginTop: 20,
                lineHeight: 1.3,
                display: "flex",
              }}
            >
              {summary}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "0 80px 48px 80px",
          }}
        >
          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              paddingTop: 24,
              display: "flex",
              fontSize: 26,
              color: NAVY,
              fontWeight: 600,
            }}
          >
            {statLine}
          </div>
          <div
            style={{
              fontSize: 22,
              color: SLATE,
              marginTop: 12,
              display: "flex",
            }}
          >
            Free water quality data at checkyourwater.org
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: CACHE_HEADERS,
    }
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("city");

    if (!slug) {
      return defaultCard();
    }

    const city = await loadCityForOg(slug);
    if (!city) {
      return defaultCard();
    }

    return cityCard(city);
  } catch (err) {
    console.error("[og] failed to render", err);
    return new Response("Failed to generate image", { status: 500 });
  }
}
