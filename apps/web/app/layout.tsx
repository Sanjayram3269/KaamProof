import type { Metadata } from "next";
import { connection } from "next/server";
import Providers from "../src/main";
import "../src/styles.css";
export const metadata: Metadata = {
  title: "KaamProof — Your Work. Your Proof.",
  description:
    "Worker-owned agreements, evidence and customer acknowledgements.",
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
