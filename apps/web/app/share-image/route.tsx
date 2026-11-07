import { ImageResponse } from "next/og";
export const dynamic = "force-static";
export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#111827",
        padding: "68px 76px",
        color: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 15, fontSize: 35 }}
      >
        <div
          style={{
            width: 45,
            height: 48,
            background: "#477bff",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
          }}
        >
          K
        </div>
        <span>kaamproof.</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 65,
          fontSize: 65,
          lineHeight: 1.15,
          fontWeight: 700,
          letterSpacing: -2,
        }}
      >
        <span>Your work deserves</span>
        <span style={{ color: "#f5b84b" }}>more than a handshake.</span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 25,
          color: "#bdcbe1",
          marginTop: 35,
        }}
      >
        Clear agreements. Documented work. Connected records.
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 20,
          color: "#91acf0",
          marginTop: "auto",
        }}
      >
        YOUR WORK. YOUR PROOF.
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
