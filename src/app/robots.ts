import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The signed-in app and API surface should never be indexed.
      disallow: ["/app/", "/api/"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
