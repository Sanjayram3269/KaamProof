import type { Metadata } from "next";
import { connection } from "next/server";
import Providers from "../src/main";
import "../src/styles.css";
import "../src/readability.css";
import "../src/public-site.css";
import { configuredSiteUrl, metadataOrigin } from "../src/site-config";
export const metadata: Metadata = {
  metadataBase: metadataOrigin,
  title: "KaamProof — Your Work. Your Proof.",
  description:
    "Create clear work agreements, document progress and keep customer decisions, evidence and payment records together. Built for independent professionals.",
  openGraph: {
    type: "website",
    siteName: "KaamProof",
    title: "Your work deserves more than a handshake. | KaamProof",
    description:
      "Clear agreements. Connected work records. Customer decisions, evidence and payment history in one workspace.",
    ...(configuredSiteUrl ? { url: configuredSiteUrl } : {}),
    images: [
      {
        url: "/share-image",
        width: 1200,
        height: 630,
        alt: "KaamProof — Your Work. Your Proof.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KaamProof — Your Work. Your Proof.",
    description:
      "Clear agreements, documented progress and customer acknowledgements.",
    images: ["/share-image"],
  },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
