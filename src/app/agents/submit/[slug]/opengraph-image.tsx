import { ImageResponse } from "next/og";
import { createAdminSupabase } from "@/lib/supabase/admin";

// Per-candidate share card: overrides the site-wide (Lanky-branded) default so
// a link shared by any candidate shows THEIR name, not Lanky's.
export const alt = "Polling Unit Agent Nomination";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function getCandidate(slug: string) {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("nomination_candidates")
    .select("full_name, office, is_active")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const candidate = await getCandidate(slug);
  const name = candidate?.is_active ? candidate.full_name : "Party Agent Nominations";
  const office = candidate?.is_active ? candidate.office : "Polling Unit Agent Nomination";

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
          Polling Unit Agent Nomination
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
          <div style={{ fontSize: 32, color: "#cfe0ec" }}>{office}</div>
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
          <div style={{ fontSize: 26, color: "#9fb6c4" }}>
            Nominated to serve? Use this link to submit your details.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
