import type { Metadata } from "next";
import { PhotoCredits } from "../../src/landing";
import { configuredSiteUrl } from "../../src/site-config";
export const metadata: Metadata = {
  title: "Photography credits — KaamProof",
  description:
    "Photographers and sources for the licensed worker photography on KaamProof.",
  ...(configuredSiteUrl
    ? { alternates: { canonical: configuredSiteUrl + "/photo-credits" } }
    : {}),
};
export default PhotoCredits;
