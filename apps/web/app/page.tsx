import type { Metadata } from "next";
import { Landing } from "../src/landing";
import { configuredSiteUrl } from "../src/site-config";
export const metadata: Metadata = {
  title:
    "KaamProof — Clear work agreements, evidence & customer acknowledgements",
  ...(configuredSiteUrl
    ? { alternates: { canonical: configuredSiteUrl } }
    : {}),
};
export default function Page() {
  return <Landing />;
}
