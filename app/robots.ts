import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Pages that are private or have no value in search results.
  const private_ = routing.locales.flatMap((l) => [
    `/${l}/account`,
    `/${l}/cart`,
    `/${l}/checkout`,
  ]);

  return {
    rules: [
      {
        userAgent: "*",
        // Product photos are served from /api/product-images and must stay
        // crawlable so they can appear in image search.
        allow: ["/", "/api/product-images/"],
        disallow: ["/admin", "/api/", ...private_],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
