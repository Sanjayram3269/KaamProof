import type { MetadataRoute } from "next";
import { configuredSiteUrl } from "../src/site-config";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: configuredSiteUrl ? "/" : undefined,
      disallow: configuredSiteUrl
        ? [
            "/app",
            "/portal",
            "/api",
            "/login",
            "/register",
            "/forgot-password",
            "/reset-password",
            "/verify-email",
            "/jobs",
            "/customers",
            "/payments",
            "/settings",
          ]
        : "/",
    },
    ...(configuredSiteUrl
      ? { sitemap: configuredSiteUrl + "/sitemap.xml" }
      : {}),
  };
}
