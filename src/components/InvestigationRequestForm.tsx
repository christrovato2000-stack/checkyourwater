"use client";

import { useState } from "react";

const STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

type Status = "idle" | "submitting" | "success" | "error";

export default function InvestigationRequestForm() {
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  function validate(): string | null {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return "Please enter a valid email address.";
    if (!/^\d{5}$/.test(zip)) return "Zip code must be exactly 5 digits.";
    if (!city.trim()) return "Please enter a city name.";
    if (!state) return "Please choose a state.";
    if (!reason.trim()) return "Please tell us why you're concerned.";
    if (reason.length > 500) return "Reason must be 500 characters or less.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setStatus("error");
      setMessage(err);
      return;
    }
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/investigation-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          zip_code: zip,
          city_name: city.trim(),
          state,
          reason: reason.trim(),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setStatus("error");
        setMessage(json.message ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      setMessage(
        `Thank you. We review every request and prioritize by population affected and available data. If we investigate your community, we'll email you at ${email.trim().toLowerCase()}.`
      );
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <p className="font-sans text-base leading-relaxed text-green-900">
          {message}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 font-sans text-base focus:border-blue-500 focus:outline-none"
            autoComplete="email"
          />
        </Field>
        <Field label="Zip code">
          <input
            type="text"
            required
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded border border-slate-300 px-3 py-2 font-sans text-base focus:border-blue-500 focus:outline-none"
          />
        </Field>
        <Field label="City">
          <input
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 font-sans text-base focus:border-blue-500 focus:outline-none"
          />
        </Field>
        <Field label="State">
          <select
            required
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 font-sans text-base focus:border-blue-500 focus:outline-none"
          >
            <option value="">Choose a state</option>
            {STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-4">
        <Field label={`Why are you concerned? (${reason.length}/500)`}>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            rows={4}
            placeholder="e.g., I heard about contamination from a nearby military base, my family has been experiencing health issues, local news reported on water quality problems..."
            className="w-full rounded border border-slate-300 px-3 py-2 font-sans text-base focus:border-blue-500 focus:outline-none"
          />
        </Field>
      </div>
      {status === "error" && message && (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm text-red-800">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-5 inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 font-sans text-base font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting..." : "Request Investigation"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-sans text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
