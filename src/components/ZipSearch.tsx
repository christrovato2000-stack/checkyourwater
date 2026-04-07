"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import GradeCard from "@/components/GradeCard";
import ContaminantRow from "@/components/ContaminantRow";
import { formatGradeSummary, formatPopulation } from "@/lib/format";
import type { Grade } from "@/types/database";

interface ApiDetection {
  compound_abbrev: string;
  compound_name: string;
  avg_concentration: number | null;
  mcl: number | null;
  mcl_ratio: number | null;
  has_mcl: boolean;
}
interface ApiSystem {
  pwsid: string;
  name: string;
  city: string | null;
  state: string;
  population_served: number | null;
  is_primary: boolean;
  grade: Grade | null;
  worst_compound: string | null;
  worst_ratio: number | null;
  total_pfas_detected: number;
  city_slug: string | null;
  top_detections: ApiDetection[];
}
interface ApiResponse {
  zip: string;
  systems: ApiSystem[];
  total_systems: number;
}

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "results"; data: ApiResponse }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

export default function ZipSearch() {
  const [zip, setZip] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();
  const resultsId = useId();

  // Auto-focus on desktop only
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      inputRef.current?.focus();
    }
  }, []);

  const reset = useCallback(() => {
    setZip("");
    setValidationError(null);
    setState({ status: "idle" });
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const cleaned = zip.replace(/\D/g, "").slice(0, 5);
      if (cleaned.length !== 5) {
        setValidationError("Please enter a 5-digit zip code.");
        return;
      }
      setValidationError(null);
      setState({ status: "loading" });
      try {
        const res = await fetch(`/api/search?zip=${cleaned}`, {
          headers: { Accept: "application/json" },
        });
        if (res.status === 404) {
          const body = await res.json().catch(() => ({}));
          setState({
            status: "empty",
            message:
              body?.message ??
              "We don't have PFAS testing data for this zip code. This could mean your water system wasn't included in EPA's UCMR 5 testing program (systems serving fewer than 3,300 people are often not tested), or your zip code may not be mapped to a water system in our database.",
          });
          return;
        }
        if (!res.ok) {
          setState({
            status: "error",
            message: "Something went wrong. Please try again.",
          });
          return;
        }
        const data: ApiResponse = await res.json();
        if (!data.systems || data.systems.length === 0) {
          setState({
            status: "empty",
            message:
              "We don't have PFAS testing data for this zip code. This could mean your water system wasn't included in EPA's UCMR 5 testing program (systems serving fewer than 3,300 people are often not tested), or your zip code may not be mapped to a water system in our database.",
          });
          return;
        }
        setState({ status: "results", data });
      } catch {
        setState({
          status: "error",
          message: "Something went wrong. Please try again.",
        });
      }
    },
    [zip]
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        reset();
      }
    },
    [reset]
  );

  const isLoading = state.status === "loading";

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        role="search"
        aria-label="Search by zip code"
        className="mx-auto w-full max-w-[520px]"
      >
        <label htmlFor={inputId} className="sr-only">
          Zip code
        </label>
        <div
          className={`flex w-full overflow-hidden rounded-lg border-2 bg-white shadow-sm transition-colors ${
            validationError
              ? "border-red-500"
              : "border-slate-300 focus-within:border-blue-600"
          }`}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="postal-code"
            maxLength={5}
            placeholder="Enter your zip code"
            value={zip}
            disabled={isLoading}
            aria-invalid={!!validationError}
            aria-describedby={validationError ? errorId : undefined}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 5);
              setZip(next);
              if (validationError) setValidationError(null);
            }}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 bg-transparent px-4 py-3 font-sans text-lg tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-60 sm:text-xl"
            style={{ minHeight: 56 }}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="flex shrink-0 items-center justify-center bg-blue-600 px-6 font-sans text-base font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-70 sm:px-8 sm:text-lg"
          >
            {isLoading ? "Checking…" : "Check"}
          </button>
        </div>
        {validationError && (
          <p
            id={errorId}
            className="mt-2 font-sans text-sm text-red-600"
            role="alert"
          >
            {validationError}
          </p>
        )}
      </form>

      <div
        id={resultsId}
        aria-live="polite"
        aria-atomic="false"
        className="mx-auto mt-8 w-full max-w-[720px]"
      >
        {state.status === "loading" && <LoadingSkeleton />}
        {state.status === "empty" && (
          <EmptyState message={state.message} onReset={reset} />
        )}
        {state.status === "error" && (
          <ErrorState
            message={state.message}
            onRetry={() => handleSubmit()}
          />
        )}
        {state.status === "results" && <ResultsView data={state.data} />}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-md bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="h-3 w-1/3 rounded bg-slate-200" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-3 w-full rounded bg-slate-200" />
        <div className="h-3 w-5/6 rounded bg-slate-200" />
        <div className="h-3 w-4/6 rounded bg-slate-200" />
      </div>
    </div>
  );
}

function EmptyState({
  message,
  onReset,
}: {
  message: string;
  onReset: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-left sm:p-8">
      <p className="font-serif text-xl text-slate-900">No data for this zip code</p>
      <p className="mt-3 font-sans text-sm leading-relaxed text-slate-600">
        {message}
      </p>
      <p className="mt-3 font-sans text-sm leading-relaxed text-slate-600">
        Try a nearby zip code, or search for your city on our{" "}
        <Link href="/cities" className="font-semibold text-blue-600 hover:underline">
          cities page
        </Link>
        .
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          type="button"
          onClick={onReset}
          className="font-sans text-sm font-semibold text-blue-600 hover:underline"
        >
          Try a different zip code
        </button>
        <Link
          href="/cities"
          className="font-sans text-sm font-semibold text-blue-600 hover:underline"
        >
          Browse all cities →
        </Link>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-sans text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 font-sans text-sm font-semibold text-red-700 underline hover:text-red-900"
      >
        Try again
      </button>
    </div>
  );
}

function systemHref(s: ApiSystem): string {
  if (s.city_slug) return `/city/${s.city_slug}`;
  return `/system/${s.pwsid}`;
}

function ResultsView({ data }: { data: ApiResponse }) {
  if (data.systems.length > 1) {
    return (
      <div className="space-y-4">
        <p className="font-sans text-sm text-slate-600">
          Zip code {data.zip} is served by {data.systems.length} water systems.
          Pick the one that serves your address:
        </p>
        {data.systems.map((s) => (
          <SystemCard key={s.pwsid} system={s} />
        ))}
      </div>
    );
  }
  return <PrimaryResult system={data.systems[0]} />;
}

function SystemCard({ system: s }: { system: ApiSystem }) {
  return (
    <Link
      href={systemHref(s)}
      className="block rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-blue-400 hover:shadow-sm"
    >
      <div className="flex items-start gap-4">
        <GradeCard grade={s.grade} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-lg font-semibold text-slate-900">
            {s.name}
          </p>
          <p className="mt-0.5 font-sans text-sm text-slate-600">
            {s.city ? `${s.city}, ${s.state}` : s.state} •{" "}
            {s.population_served
              ? `Serves ${formatPopulation(s.population_served)} people`
              : "Population unknown"}
          </p>
          <p className="mt-2 font-sans text-sm text-slate-700">
            {formatGradeSummary(s.grade)}
          </p>
          <p className="mt-3 font-sans text-sm font-medium text-blue-600">
            View full report →
          </p>
        </div>
      </div>
    </Link>
  );
}

function PrimaryResult({ system: s }: { system: ApiSystem }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <GradeCard grade={s.grade} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-2xl font-bold text-slate-900 sm:text-3xl">
            {s.name}
          </h2>
          <p className="mt-1 font-sans text-sm text-slate-600">
            {s.city ? `${s.city}, ${s.state}` : s.state}
            {s.population_served
              ? ` • Serves ${formatPopulation(s.population_served)} people`
              : ""}
          </p>
          <p className="mt-4 font-serif text-lg leading-snug text-slate-800">
            {formatGradeSummary(s.grade)}
          </p>
        </div>
      </div>

      {s.top_detections.length > 0 && (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
            Top compounds detected
          </h3>
          <div className="mt-2">
            {s.top_detections.slice(0, 3).map((d) => (
              <ContaminantRow
                key={d.compound_abbrev}
                compoundName={d.compound_abbrev}
                compoundFullName={d.compound_name}
                concentration={d.avg_concentration}
                mcl={d.mcl}
                mclRatio={d.mcl_ratio}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          href={systemHref(s)}
          className="font-sans text-sm font-semibold text-blue-600 hover:underline"
        >
          View full report →
        </Link>
        <Link
          href="/action"
          className="font-sans text-sm font-semibold text-blue-600 hover:underline"
        >
          What you can do →
        </Link>
      </div>
    </article>
  );
}
