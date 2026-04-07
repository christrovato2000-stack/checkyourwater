import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://checkyourwater.org/sitemap.xml",
    host: "https://checkyourwater.org",
  };
}
