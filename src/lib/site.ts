/**
 * Central site configuration — candidate details, navigation, contacts, socials.
 * Values marked TODO are pending from the client (see docs/CAMPAIGN_BRIEF.md §7).
 */
export const site = {
  // Canonical production origin (no trailing slash). Used for metadataBase,
  // sitemap/robots, canonical URLs, and structured data.
  url: "https://votelanky.com",
  candidate: "Olanrewaju Okesooto",
  shortName: "Lanky",
  tagline: "The Bridge-Builder",
  office: "Federal House of Representatives",
  constituency: "Ibadan Southwest / Northwest Federal Constituency",
  state: "Oyo State",
  party: "Labour Party",
  // Official Labour Party logo (transparent PNG).
  partyLogo: "/brand/labour-party-logo.png",
  slogan: "Innovation for Ibadan: Securing Our Future, Together.",
  guidingPrinciple:
    "Representation Through Collaboration, Progress Through Innovation, and Development Through Collective Action.",

  // Constituency hubs featured in the hero slider.
  // NOTE: these are temporary Unsplash stock photos (Nigerian markets / streets)
  // standing in until the client supplies real constituency photography — just
  // swap each `src` for the real image URL or local /brand path.
  constituencySlides: [
    {
      name: "Ring Road",
      note: "Ibadan South-West",
      src: "https://images.unsplash.com/photo-1567622661088-6951d0f9eedd?auto=format&fit=crop&w=1920&q=70" as string | null,
    },
    {
      name: "Dugbe Market",
      note: "Ibadan North-West",
      src: "https://images.unsplash.com/photo-1585540083814-ea6ee8af9e4f?auto=format&fit=crop&w=1920&q=70" as string | null,
    },
    {
      name: "Eleyele",
      note: "Ibadan South-West",
      src: "https://images.unsplash.com/photo-1579998120708-682dd8a5624f?auto=format&fit=crop&w=1920&q=70" as string | null,
    },
    {
      name: "Beere",
      note: "Ibadan North-West",
      src: "https://images.unsplash.com/photo-1722072391426-964abfef1924?auto=format&fit=crop&w=1920&q=70" as string | null,
    },
  ],

  nav: [
    { label: "About", href: "/about" },
    { label: "Manifesto", href: "/manifesto" },
    { label: "Wards & LG", href: "/wards" },
    { label: "News & Media", href: "/news" },
    { label: "Get Involved", href: "/get-involved" },
    { label: "Contact", href: "/contact" },
  ],

  cta: {
    donate: { label: "Donate", href: "/donate" },
    volunteer: { label: "Volunteer", href: "/get-involved" },
  },

  // Public WhatsApp community group (shown after a successful form submission).
  whatsappGroup:
    "https://chat.whatsapp.com/DiXF4xgwlMEHXSfP3skN6M?s=cl&p=a&mlu=4",

  // TODO(client): confirm office address, email, WhatsApp number, social handles.
  contact: {
    email: "", // TODO
    whatsapp: "", // TODO — WhatsApp Business number
    address: "", // TODO — campaign office address
  },

  socials: [
    // TODO(client): real handles
    { label: "Facebook", href: "#" },
    { label: "Instagram", href: "#" },
    { label: "X", href: "#" },
    { label: "YouTube", href: "#" },
  ],

  // Numbers use +234 international format so diaspora supporters can dial directly.
  // More positions/names to be added as the client provides them.
  team: [
    {
      role: "Strategic Team Lead / Advisory Board Chairman",
      name: "Apostle (Dr.) Philips Olaiya Oladipo",
      phone: "+234 815 756 1814",
    },
    {
      role: "Religious Body Mobilizer",
      name: "Pastor Oluseye A. Ayeni (FSP)",
      phone: "+234 703 865 2796",
    },
    { role: "Youth Coordinators", name: "To be announced", phone: "" },
    {
      role: "Campaign Manager",
      name: "Adeyemo Olayomade",
      phone: "+234 810 999 1271",
    },
  ],
} as const;
