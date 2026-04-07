"use client";

/**
 * Small, honest email signup form for the CheckYourWater notification list.
 *
 * We only email subscribers when new EPA data is released or we publish
 * a new city investigation. No newsletters, no marketing, no popups.
 *
 * The form POSTs to /api/subscribe which validates, stores a row in the
 * email_subscribers table, and sends a confirmation email via Resend.
 */
import { useState } from "react";

type Variant = "default" | "compact";

interface Props {
  variant?: Variant;
  heading?: string | null;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export default function NotifySignup({
  variant = "default",
  heading,
}: Props) {
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) {
      setState({ kind: "error", message: "Please enter your email." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, zip_code: zip || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({
          kind: "error",
          message:
            (data && (data.message as string)) ||
            "Something went wrong. Please try again.",
        });
        return;
      }
      setState({ kind: "success" });
      setEmail("");
      setZip("");
    } catch {
      setState({
        kind: "error",
        message: "Network error. Please try again.",
      });
    }
  }

  const isCompact = variant === "compact";

  return (
    <section
      aria-labelledby="notify-heading"
      className={
        isCompact
          ? "mx-auto max-w-[640px]"
          : "mx-auto max-w-[640px] rounded-lg border border-slate-200 bg-slate-50 p-6 sm:p-8"
      }
    >
      {heading !== null && (
        <h2
          id="notify-heading"
          className={
            isCompact
              ? "font-serif text-lg font-semibold text-slate-900"
              : "font-serif text-2xl font-semibold text-slate-900"
          }
        >
          {heading ?? "Get notified when new PFAS data is released"}
        </h2>
      )}

      {state.kind === "success" ? (
        <p className="mt-3 font-sans text-base text-slate-700">
          Check your email to confirm your subscription.
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="notify-email">
              Email address
            </label>
            <input
              id="notify-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-4 py-2.5 font-sans text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
            />
            <label className="sr-only" htmlFor="notify-zip">
              Zip code (optional)
            </label>
            <input
              id="notify-zip"
              type="text"
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Zip (optional)"
              className="w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 font-sans text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 sm:w-[140px]"
            />
            <button
              type="submit"
              disabled={state.kind === "loading"}
              className="rounded-md bg-slate-900 px-5 py-2.5 font-sans text-base font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {state.kind === "loading" ? "Sending..." : "Notify me"}
            </button>
          </div>
          {state.kind === "error" && (
            <p
              role="alert"
              className="mt-3 font-sans text-sm text-red-700"
            >
              {state.message}
            </p>
          )}
          <p className="mt-3 font-sans text-sm text-slate-500">
            We only email when new EPA data is released or we publish a new
            investigation. No spam, no newsletters. Unsubscribe anytime.
          </p>
        </form>
      )}
    </section>
  );
}
