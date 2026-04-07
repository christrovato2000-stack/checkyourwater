import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";

interface CityMapImageProps {
  slug: string;
  cityName: string;
  stateName: string;
  grade: string | null;
}

/**
 * Renders a static city map/infographic from /public/maps/city-{slug}.png.
 * Returns null if no image exists yet so the page degrades gracefully.
 */
export default function CityMapImage({
  slug,
  cityName,
  stateName,
}: CityMapImageProps) {
  const relPath = `/maps/city-${slug}.png`;
  const absPath = join(process.cwd(), "public", "maps", `city-${slug}.png`);
  if (!existsSync(absPath)) return null;

  return (
    <figure className="mt-8 overflow-hidden rounded-lg border border-slate-200">
      <Image
        src={relPath}
        alt={`Map of water systems in ${cityName}, ${stateName}`}
        width={1200}
        height={630}
        className="h-auto w-full"
        priority={false}
      />
      <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-2 font-sans text-xs text-slate-600">
        Water systems in {cityName}, {stateName}
      </figcaption>
    </figure>
  );
}
