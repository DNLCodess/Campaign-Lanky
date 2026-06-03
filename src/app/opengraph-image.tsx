import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

// Default social share card for the whole site. Pages can override by adding
// their own opengraph-image file deeper in the route tree.
export const alt = `${site.candidate} — ${site.shortName}, ${site.party} candidate for ${site.constituency}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          // Brand navy gradient (mirrors --bg / tone-deep in globals.css).
          background: "linear-gradient(135deg, #050f17 0%, #0d334a 100%)",
          color: "#f4f8fb",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: "4px",
            textTransform: "uppercase",
            color: "#7fb0d0",
          }}
        >
          {`${site.party} · ${site.state}`}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1 }}>
            {site.shortName}
          </div>
          <div style={{ fontSize: 40, color: "#cfe0ec" }}>
            {`${site.candidate} — ${site.tagline}`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            borderTop: "2px solid rgba(127,176,208,0.4)",
            paddingTop: "28px",
          }}
        >
          <div style={{ fontSize: 30, color: "#f4f8fb" }}>{site.slogan}</div>
          <div style={{ fontSize: 24, color: "#9fb6c4" }}>
            {`${site.office} · ${site.constituency}`}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
