import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Ajo Mercy — find a business worth backing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default share card. Generated rather than shipped as a static asset so the
 * wording stays in step with the site, and so there is no stale PNG to forget
 * about. Business profiles override this with their own photograph.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#FBF7F0",
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: "#0F3D2E" }}>Ajo</span>
          <span style={{ fontSize: 40, fontStyle: "italic", color: "#C9531F" }}>Mercy</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 92,
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              color: "#181410",
              maxWidth: 900,
            }}
          >
            Find a business worth backing.
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 30,
              lineHeight: 1.35,
              color: "#5B534A",
              maxWidth: 760,
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            Verified Nigerian businesses, reviewed one at a time by a person.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            borderTop: "2px solid #E3DACB",
            paddingTop: 26,
            fontSize: 22,
            color: "#8C8378",
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          <span>ajomercy.com</span>
          <span style={{ color: "#E3DACB" }}>/</span>
          <span>From the Ajo tussle to real impact</span>
        </div>
      </div>
    ),
    size,
  );
}
