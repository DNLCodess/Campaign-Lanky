/**
 * Central site configuration — candidate details, navigation, contacts, socials.
 * Values marked TODO are pending from the client (see docs/CAMPAIGN_BRIEF.md §7).
 */
export const site = {
  candidate: "Olanrewaju Okesooto",
  shortName: "Lanky",
  tagline: "The Bridge-Builder",
  office: "Federal House of Representatives",
  constituency: "Ibadan Southwest / Northwest Federal Constituency",
  state: "Oyo State",
  party: "Labour Party",
  // Labour Party placeholder mark — swap for the official logo when provided.
  partyLogo: "/brand/labour-party.svg",
  slogan: "Innovation for Ibadan: Securing Our Future, Together.",
  guidingPrinciple:
    "Representation Through Collaboration, Progress Through Innovation, and Development Through Collective Action.",

  // Constituency hubs featured in the hero slider. `src` is null until the
  // client provides real photography (placeholder gradients render meanwhile).
  constituencySlides: [
    { name: "Ring Road", note: "Ibadan South-West", src: null as string | null },
    { name: "Dugbe Market", note: "Ibadan North-West", src: null as string | null },
    { name: "Eleyele", note: "Ibadan South-West", src: null as string | null },
    { name: "Beere", note: "Ibadan North-West", src: null as string | null },
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

  team: [
    { role: "Campaign Manager", name: "Adeyemo Olayomade", phone: "0810 999 1271" },
    {
      role: "Strategic Team Lead / Advisory Board Chairman",
      name: "Apostle (Dr.) Philips Olaiya Oladipo",
      phone: "0815 756 1814",
    },
  ],
} as const;
