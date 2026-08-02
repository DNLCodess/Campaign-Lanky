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

  // Constituency scenes featured in the hero slider (real photography).
  // NOTE: folder is spelled "consituency" on disk — keep paths in sync.
  constituencySlides: [
    {
      name: "Oluyole Statue",
      note: "Ibadan",
      src: "/consituency/8.jpeg" as string | null,
    },
    {
      name: "Our Roads",
      note: "Ibadan South-West",
      src: "/consituency/1.jpeg" as string | null,
    },
    {
      name: "Eleyele",
      note: "Ibadan South-West",
      src: "/consituency/9.jpeg" as string | null,
    },
    {
      name: "Our Markets",
      note: "Ibadan North-West",
      src: "/consituency/10.jpeg" as string | null,
    },
    {
      name: "Cocoa House",
      note: "Ibadan North-West",
      src: "/consituency/5.jpeg" as string | null,
    },
  ],

  nav: [
    { label: "About", href: "/about" },
    { label: "Manifesto", href: "/manifesto" },
    { label: "Wards & LG", href: "/wards" },
    { label: "News & Media", href: "/news" },
    { label: "Get Your DP", href: "/dp" },
    { label: "Get Involved", href: "/get-involved" },
    { label: "Contact", href: "/contact" },
  ],

  cta: {
    donate: { label: "Donate", href: "/donate" },
    volunteer: { label: "Volunteer", href: "/get-involved" },
    register: { label: "Register to Vote", href: "/register" },
  },

  // Public WhatsApp community group (shown after a successful form submission).
  whatsappGroup:
    "https://chat.whatsapp.com/DiXF4xgwlMEHXSfP3skN6M?s=cl&p=a&mlu=4",

  // INEC portal — voters can verify their ward & polling unit here.
  inecUrl: "https://www.inecnigeria.org/",

  // TODO(client): confirm office address, email, WhatsApp number, social handles.
  contact: {
    email: "", // TODO
    whatsapp: "", // TODO — WhatsApp Business number
    address: "", // TODO — campaign office address
  },

  socials: [
    { label: "Facebook",  href: "https://facebook.com/votelanky2027"          },
    { label: "Instagram", href: "https://www.instagram.com/olanrewajuokesooto" },
    { label: "X",         href: "https://x.com/omokesooto"                     },
    { label: "TikTok",    href: "https://www.tiktok.com/@votelanky2027"       },
    { label: "YouTube",   href: "https://www.youtube.com/@votelanky2027"      },
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
      name: "Pastor Oluseye A. Ayeni",
      phone: "+234 703 865 2796",
    },
    {
      role: "Campaign Manager",
      name: "Com. Adeyemo Olayomade",
      phone: "+234 810 999 1271",
    },
    { role: "Youth Leader", name: "To be announced", phone: "" },
    { role: "Women Leader", name: "To be announced", phone: "" },
    { role: "Artisan Leader", name: "To be announced", phone: "" },
    {
      role: "PVC Registration Officer",
      name: "Oluwatimileyin Ayeni",
      phone: "+234 814 400 7259",
    },
  ],
} as const;
