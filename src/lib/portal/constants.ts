import { portalPath } from "@/lib/portal/routes";

export const LGAS = ["Ibadan North-West", "Ibadan South-West"] as const;
export type Lga = (typeof LGAS)[number];

export const PORTAL_ROLES = [
  "constituency_admin",
  "lga_coordinator",
  "ward_agent",
  "pu_agent",
] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

/** The role each tier is allowed to create, and the home path after login. */
export const ROLE_CONFIG: Record<
  PortalRole,
  { creates: PortalRole | null; homePath: string; label: string }
> = {
  // homePath goes through portalPath(): bare (`/admin`) in production where the
  // portal.votelanky.com proxy rewrites it, `/portal/...` in local dev. Portal
  // accounts are also kept out of the campaign `/admin` dashboard by getAdminUser().
  constituency_admin: { creates: "lga_coordinator", homePath: portalPath("/admin"), label: "Constituency Admin" },
  lga_coordinator: { creates: "ward_agent", homePath: portalPath("/lga"), label: "LGA Coordinator" },
  ward_agent: { creates: "pu_agent", homePath: portalPath("/ward"), label: "Ward Agent" },
  pu_agent: { creates: null, homePath: portalPath("/pu"), label: "Polling Unit Agent" },
};
