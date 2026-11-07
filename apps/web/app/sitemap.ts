import type { MetadataRoute } from "next";
import { configuredSiteUrl } from "../src/site-config";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  return configuredSiteUrl
    ? [
        { url: configuredSiteUrl, changeFrequency: "monthly", priority: 1 },
        {
          url: configuredSiteUrl + "/photo-credits",
          changeFrequency: "yearly",
          priority: 0.2,
        },
      ]
    : [];
}
