/**
 * POST /api/investigation-request
 *
 * Demand-signal pipeline for the toolkit and cities pages. Inserts a row
 * into investigation_requests via the service-role client (RLS denies
 * anon writes). Rate-limited to 3 submissions per email address.
 */
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const STATE_CODES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
]);

const bodySchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  zip_code: z.string().regex(/^\d{5}$/, "Zip code must be exactly 5 digits."),
  city_name: z.string().trim().min(1, "City is required.").max(120),
  state: z
    .string()
    .length(2, "State must be a 2-letter code.")
    .refine((s) => STATE_CODES.has(s.toUpperCase()), "Unknown state."),
  reason: z
    .string()
    .trim()
    .min(1, "Please tell us why you're concerned.")
    .max(500, "Reason must be 500 characters or less."),
});

const RATE_LIMIT_PER_EMAIL = 3;

export async function POST(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_json", message: "Request body must be JSON." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return Response.json(
      { error: "invalid_input", message: first?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const state = parsed.data.state.toUpperCase();

  let sb;
  try {
    sb = getAdminClient();
  } catch (err) {
    console.error("[investigation-request] admin client unavailable", err);
    return Response.json(
      {
        error: "server_error",
        message: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }

  // Rate limit: max 3 submissions per email
  const { count, error: countError } = await sb
    .from("investigation_requests")
    .select("id", { count: "exact", head: true })
    .eq("email", email);

  if (countError) {
    console.error(
      "[investigation-request] count error",
      countError.message
    );
    return Response.json(
      {
        error: "server_error",
        message: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }

  if ((count ?? 0) >= RATE_LIMIT_PER_EMAIL) {
    return Response.json(
      {
        error: "rate_limited",
        message:
          "You have reached the submission limit for this email address. Thank you, we have your previous requests.",
      },
      { status: 429 }
    );
  }

  const { error: insertError } = await sb
    .from("investigation_requests")
    .insert({
      email,
      zip_code: parsed.data.zip_code,
      city_name: parsed.data.city_name,
      state,
      reason: parsed.data.reason,
    });

  if (insertError) {
    console.error("[investigation-request] insert error", insertError.message);
    return Response.json(
      {
        error: "server_error",
        message: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }

  return Response.json({ ok: true }, { status: 200 });
}
