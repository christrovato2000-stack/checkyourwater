import { getAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function page(title: string, body: string, status: number): Response {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} | Check Your Water</title>
    <meta name="robots" content="noindex" />
    <style>
      html { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #0f172a; }
      body { margin: 0; background: #ffffff; }
      main { max-width: 640px; margin: 80px auto; padding: 0 24px; }
      h1 { font-family: Georgia, serif; font-size: 32px; margin: 0 0 16px; }
      p { line-height: 1.6; font-size: 17px; color: #334155; }
      a { color: #2563eb; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${body}</p>
      <p><a href="/">Return to CheckYourWater</a></p>
    </main>
  </body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return page(
      "Invalid confirmation link",
      "This confirmation link is missing a token. Please check the link in your email and try again.",
      400
    );
  }

  const sb = getAdminClient();
  const { data, error } = await sb
    .from("email_subscribers")
    .select("id, confirmed, unsubscribed_at")
    .eq("confirm_token", token)
    .maybeSingle();

  if (error || !data) {
    return page(
      "Confirmation link not found",
      "We could not find a subscription for this link. It may have already been used, or it may be invalid.",
      404
    );
  }

  if (data.confirmed && !data.unsubscribed_at) {
    return page(
      "You are already subscribed",
      "Thanks. You will hear from us only when new EPA data is released or we publish a new investigation.",
      200
    );
  }

  const { error: updateError } = await sb
    .from("email_subscribers")
    .update({ confirmed: true, unsubscribed_at: null })
    .eq("id", data.id);

  if (updateError) {
    return page(
      "Something went wrong",
      "We could not confirm your subscription. Please try the link again or contact us if the problem continues.",
      500
    );
  }

  return page(
    "You're subscribed",
    "Your email is confirmed. We will only email you when new EPA PFAS data is released or we publish a new city investigation.",
    200
  );
}
