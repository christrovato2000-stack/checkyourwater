import { z } from "zod";
import { lookupZip } from "@/lib/geo";

const querySchema = z.object({
  zip: z.string().regex(/^\d{5}$/, "Zip code must be exactly 5 digits"),
});

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
  Vary: "Accept-Encoding",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ zip: url.searchParams.get("zip") ?? "" });
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_zip", message: "Please enter a 5-digit zip code." },
      { status: 400 }
    );
  }

  const result = await lookupZip(parsed.data.zip);

  if (!result.ok) {
    if (result.error.kind === "invalid") {
      return Response.json(
        { error: "invalid_zip", message: result.error.message },
        { status: 400 }
      );
    }
    if (result.error.kind === "not_found") {
      return Response.json(
        { error: "not_found", message: result.error.message },
        { status: 404 }
      );
    }
    return Response.json(
      { error: "server_error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  return Response.json(result.data, { status: 200, headers: CACHE_HEADERS });
}
