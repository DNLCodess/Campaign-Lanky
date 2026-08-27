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
  constituency_admin: { creates: "lga_coordinator", homePath: "/admin", label: "Constituency Admin" },
  lga_coordinator: { creates: "ward_agent", homePath: "/lga", label: "LGA Coordinator" },
  ward_agent: { creates: "pu_agent", homePath: "/ward", label: "Ward Agent" },
  pu_agent: { creates: null, homePath: "/pu", label: "Polling Unit Agent" },
};
