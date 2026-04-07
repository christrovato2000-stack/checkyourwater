/**
 * On-demand cache revalidation endpoint.
 *
 * Used after a manual data refresh (see .github/workflows/data-refresh.yml)
 * to flush stale ISR pages on Vercel without waiting for the 24-hour
 * revalidate timer.
 *
 * Usage:
 *   curl -X POST "https://checkyourwater.org/api/revalidate?\
 *     secret=$REVALIDATION_SECRET&path=/cities"
 *
 *   curl -X POST "https://checkyourwater.org/api/revalidate?\
 *     secret=$REVALIDATION_SECRET&path=/city/[slug]&type=page"
 *
 *   curl -X POST "https://checkyourwater.org/api/revalidate?\
 *     secret=$REVALIDATION_SECRET&tag=city-data"
 *
 * You can pass both `path` and `tag` in the same call. `type=page|layout`
 * is required when `path` contains a dynamic segment like `/city/[slug]`.
 */
import { revalidatePath, revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

// Must be dynamic — this route mutates server cache state and should
// never be statically optimized.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const expected = process.env.REVALIDATION_SECRET;
  if (!expected) {
    return Response.json(
      { error: "not_configured", message: "REVALIDATION_SECRET is not set" },
      { status: 500 }
    );
  }

  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== expected) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get("path");
  const tag = request.nextUrl.searchParams.get("tag");
  const typeRaw = request.nextUrl.searchParams.get("type");

  if (!path && !tag) {
    return Response.json(
      {
        error: "missing_target",
        message:
          "Pass at least one of `path` or `tag` as a query parameter.",
      },
      { status: 400 }
    );
  }

  const revalidated: { paths: string[]; tags: string[] } = {
    paths: [],
    tags: [],
  };

  if (path) {
    const type =
      typeRaw === "page" || typeRaw === "layout" ? typeRaw : undefined;
    // If the path contains a dynamic segment like /city/[slug] a type
    // is required by Next — default to 'page' in that case.
    const hasDynamicSegment = /\[.+\]/.test(path);
    if (hasDynamicSegment && !type) {
      revalidatePath(path, "page");
    } else if (type) {
      revalidatePath(path, type);
    } else {
      revalidatePath(path);
    }
    revalidated.paths.push(path);
  }

  if (tag) {
    // Next 16 requires a second argument. `{ expire: 0 }` gives the
    // webhook-style "expire immediately" semantics that match the
    // intent of a manual data-refresh trigger — any subsequent request
    // for tagged data must fetch fresh.
    revalidateTag(tag, { expire: 0 });
    revalidated.tags.push(tag);
  }

  return Response.json({
    revalidated: true,
    ...revalidated,
    now: Date.now(),
  });
}
