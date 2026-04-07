import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase";
import { sendEmail, confirmEmailBody, SITE_URL } from "@/lib/email";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  zip_code: z
    .string()
    .regex(/^\d{5}$/, "Zip code must be exactly 5 digits.")
    .optional(),
});

export async function POST(request: Request) {
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
      {
        error: "invalid_input",
        message: first?.message ?? "Invalid input.",
      },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const zipCode = parsed.data.zip_code ?? null;

  const sb = getAdminClient();

  // Does the address already exist?
  const { data: existing, error: lookupError } = await sb
    .from("email_subscribers")
    .select("id, confirmed, confirm_token, unsubscribed_at")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    console.error("[subscribe] lookup error", lookupError.message);
    return Response.json(
      {
        error: "server_error",
        message: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }

  let confirmToken: string;
  let unsubscribeToken: string;

  if (existing) {
    // Already subscribed and confirmed: silently succeed so we don't leak
    // whether an address is on the list.
    if (existing.confirmed && !existing.unsubscribed_at) {
      return Response.json({ ok: true }, { status: 200 });
    }

    // Re-send the confirmation for an unconfirmed or previously unsubscribed
    // address. Generate fresh tokens.
    confirmToken = randomUUID();
    unsubscribeToken = randomUUID();
    const { error } = await sb
      .from("email_subscribers")
      .update({
        zip_code: zipCode,
        confirm_token: confirmToken,
        unsubscribe_token: unsubscribeToken,
        confirmed: false,
        unsubscribed_at: null,
        subscribed_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) {
      console.error("[subscribe] update error", error.message);
      return Response.json(
        {
          error: "server_error",
          message: "Something went wrong. Please try again.",
        },
        { status: 500 }
      );
    }
  } else {
    confirmToken = randomUUID();
    unsubscribeToken = randomUUID();
    const { error } = await sb.from("email_subscribers").insert({
      email,
      zip_code: zipCode,
      confirm_token: confirmToken,
      unsubscribe_token: unsubscribeToken,
      confirmed: false,
    });
    if (error) {
      console.error("[subscribe] insert error", error.message);
      return Response.json(
        {
          error: "server_error",
          message: "Something went wrong. Please try again.",
        },
        { status: 500 }
      );
    }
  }

  const confirmUrl = `${SITE_URL}/api/confirm?token=${confirmToken}`;
  const emailResult = await sendEmail({
    to: email,
    subject: "Confirm your CheckYourWater subscription",
    text: confirmEmailBody(confirmUrl),
  });

  if (!emailResult.ok) {
    // We still keep the subscriber row so they can confirm later. Tell the
    // user it worked; we'll log the server-side failure for follow-up.
    console.error("[subscribe] send failed but row created for", email);
  }

  return Response.json({ ok: true }, { status: 200 });
}
