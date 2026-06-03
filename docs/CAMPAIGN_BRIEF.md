# Campaign Brief — Lanky, The Bridge-Builder

> **Project:** `campaign-lanky` — Official campaign website
> **Candidate:** Olanrewaju Okesooto ("Lanky") — *display name is "Olanrewaju Okesooto" only; do not use a longer full name anywhere on the site.*
> **State:** Oyo State
> **Office:** Federal House of Representatives — Ibadan Southwest / Northwest Federal Constituency
> **Party:** Labour Party
> **Slogan:** *Innovation for Ibadan: Securing Our Future, Together.*
> **Tagline:** *Lanky — The Bridge-Builder*
> **Source:** Client document (provided by candidate). This file is the single source of truth — consult and update it as the project evolves.

---

## 0. Tech & Design Decisions

### Stack
- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Backend:** **Supabase** — Postgres (leads, volunteers, endorsements, blog/media, donations), Auth, Storage (images/video)
- **Payments:** **Flutterwave** (Standard hosted checkout) — built end-to-end

#### Donations / Payments (Flutterwave) — how it works
- **Flow:** donate form → server action `initiateDonation` creates a **pending** `donations` row (unique `tx_ref` = idempotency key) → Flutterwave hosted checkout (card, **bank transfer**, USSD) → redirect to `/donate/callback` → **server-side verify** → idempotent finalize. A **webhook** (`/api/flutterwave/webhook`) is the source of truth and finalizes even if the donor never returns (e.g. paid in their bank app and closed the tab).
- **Robustness:** bounded retries + timeouts on all Flutterwave calls (retry only on network/5xx/429); amount/currency re-checked server-side (never trust client); `verif-hash` webhook signature verified with a timing-safe compare; finalize guarded by `status != 'successful'` so callback + webhook can't double-apply.
- **Data:** `donations` table is **server-only** (RLS on, no public policies); the server uses the **service-role** key.
- **Required env (see `.env.local.example`):** `SUPABASE_SERVICE_ROLE_KEY`, `FLW_SECRET_KEY`, `FLW_SECRET_HASH`, `NEXT_PUBLIC_SITE_URL`.
- **Flutterwave dashboard setup:** add webhook URL `<site>/api/flutterwave/webhook` and set the **Secret hash** to match `FLW_SECRET_HASH`.
- Until keys are set the donate form shows a friendly "not available yet" message (no crash).

### Design Direction
- **Theme:** Dark-background, premium feel
- **Mood:** Innovative + Trustworthy — clean modern layouts, generous whitespace, sharp photography, subtle motion; balances tech credibility with civic trust
- **Typography — FINAL:** **Fraunces** (headings — echoes the logo's high-contrast editorial serif) + **Inter** (body — crisp, legible on mobile). Both free Google Fonts.

### Background Variety (client feedback)
Do **not** flatten the whole site to one navy. Use the **section tone utilities** in `globals.css` (`.tone-deep`, `.tone-navy`, `.tone-steel`, `.tone-red`, `.tone-gradient`, `.tone-aurora`, `.tone-panel`) to alternate professional, brand-derived backgrounds between bands — on every page, built and future.

### Party & State Emphasis (client feedback)
**Labour Party** and **Oyo State** must be unmistakable without reading deeply: site-wide top strip, hero badge, and footer lockup via the `PartyState` component. Party logo is a **placeholder** (`public/brand/labour-party.svg`) until the official mark is supplied.

### Hero Constituency Slider (client feedback)
Hero uses an auto-crossfading, Ken-Burns **constituency image slider** (text content retained over a legibility scrim). Real photos pending — currently branded gradient placeholders; set `src` in `site.constituencySlides` when images arrive.

### Admin Dashboard (`/admin`)
- **Auth:** Supabase Auth (email/password). Disable public sign-ups in Supabase. Leave `ADMIN_EMAILS` blank so every team account created in-app counts as an admin.
- **Creating admins:** bootstrap the **first** account once in Supabase → Authentication → Users (or set `ADMIN_EMAILS` to your email and sign up). After that, manage admins entirely in-app at **`/admin/team`** — add (email + temp password, auto-confirmed) or remove accounts (can't remove yourself). Uses the Supabase Admin API via the service-role key.
- **Dashboard:** stat cards (total raised, supporters, volunteers, messages) + tabbed tables (donations, volunteers, supporters, messages) with **search**, **pagination**, and **CSV export** per table. Reads via the service-role client; tables stay RLS server-only.
- **Env:** `SUPABASE_SERVICE_ROLE_KEY` (required), optional `ADMIN_EMAILS`.

### Imagery
Constituency photos in `public/consituency/` are used as the **hero slider** and as **page-header backgrounds** across inner pages (with scrims). Candidate transparent cut-outs (`public/brand/candidate-4/5/6.png`) appear in the Portrait Journey, About, and the Promise quote.

### Iconography Guideline
- **Avoid generic "AI-coded" / tech-cliché icons** — no lightning bolts (`zap`), flashes, sparkles, "magic wand", robots, brains, or rocket clichés. They cheapen a civic/political brand.
- Prefer **restrained, civic line icons** (people, ballot, megaphone, handshake, location, calendar, document) or **the brand's own window-pane motif** and **numerals** (e.g. 01–05) as visual anchors.
- When in doubt, use **no icon** + strong typography rather than a cliché icon.

### Brand Assets (in `docs/assets/`)
- **Logo (full, navy):** `logo-3.png` — window-pane mark + "Lanky" serif wordmark
- **Logo (full, white/reversed):** `logo-1.png` — for dark backgrounds
- **Icon mark (color):** `logo-4.png` — four-square window-pane (reveals full palette)
- **Icon mark (navy mono):** `logo-2.png`
- **Candidate photos:** `image-1` (royal-blue suit, arms crossed — authoritative), `image-2` (hand to chin, smiling — approachable), `image-3` (white agbada + Yoruba fila — cultural/grassroots)
- **NOTE:** Client is preparing **background-free (transparent) versions** of the logos and photos for flexible compositing on dark sections.

### Brand Palette (extracted from `logo-4.png`)
| Token | Hex | Role |
|-------|-----|------|
| Deep Navy | `#0D334A` | brand base / elevated surfaces |
| Steel Blue | `#679CBC` | cool "innovation" accent, links, icons |
| Vivid Red | `#C21720` | energy / primary CTA (Donate, Volunteer); also nods to Labour |
| White | `#FFFFFF` | text on dark, surfaces |

### Motion & Interaction (GSAP) — FINAL
**Library:** GSAP + ScrollTrigger + SplitText (all now free) via `@gsap/react` `useGSAP()`. Lazy-loaded.
**Scope:** Full signature set. **Mobile:** light (desktop = cinematic, phones = simple fades/reveals). **Always** honor `prefers-reduced-motion` (static fallbacks) and animate only `transform`/`opacity`.
**Hard dependency:** transparent/background-free candidate cut-outs (client preparing).

**Brand signatures:**
1. **Portrait Journey** — a pinned portrait stage (desktop) that persists through the hero + opening sections, **crossfading the 3 portraits** as a narrative arc, then gracefully hands off before the manifesto/donate sections:
   - Hero → `image-1` (authority) · About/Why → `image-2` (approachable) · Vision/Community → `image-3` (roots).
   - Mobile: per-section static reveals, no pinning.
2. **The Bridge Draw** — SVG bridge line that draws on scroll in the vision section (government ↔ people); the "Bridge-Builder" signature moment.
3. **Window-Pane Motif** — the logo's four squares as scroll-driven section dividers / pillar framing.

**Tier-2 polish:** split-text hero reveal (Fraunces), count-up stats on scroll, staggered pillar cards, red scroll-progress bar.
**Tier-3 micro-delight:** magnetic Donate/Volunteer buttons, subtle background parallax, endorsement marquee.

#### Dark Theme Tokens — FINAL (Brand-Pure, approved)
Strictly the logo's colors on deep navy; red is the only hot accent, so CTAs pop. No gold.
| Token | Hex | Use |
|-------|-----|-----|
| `--bg` | `#071A26` | page background (deepest navy) |
| `--surface` | `#0D334A` | cards, sections (brand navy) |
| `--surface-2` | `#12425E` | elevated cards, hovers |
| `--border` | `#1E4D69` | hairlines, dividers |
| `--primary` | `#E0212B` | CTAs (red, brightened from `#C21720` for dark-bg contrast) |
| `--accent` | `#7FB0D0` | links, highlights (steel blue, lifted for AA) |
| `--text` | `#F4F8FB` | primary text |
| `--text-muted` | `#9FB6C4` | secondary text |
| All text/CTA combos targeted at **WCAG AA** on dark backgrounds. | | |

---

## 1. Who & Why

**Candidate:** Okesooto Olanrewaju Moses — CEO & Creative Director of **Lanky First Ideal Creativity** (a technology company specializing in digital solutions, branding, mobile app development, and advanced web technologies). Lead Pastor at **Cross Life Christian Network**. Founder of the **"Avoid Failed Future Initiative."**

**Positioning:** Not just a politician, but a *practitioner* — someone who has built businesses, mentored students, and served the community. A neighbor, a listener, and a proactive grassroots leader bridging the gap between the government and the governed.

**Campaign philosophy:** "People First."

**Guiding Principle:**
> "Representation Through Collaboration, Progress Through Innovation, and Development Through Collective Action."

---

## 2. Vision & Mission

### Vision Statement
> "To build a digitally empowered, educated, innovative, and prosperous Ibadan North West / Ibadan South West Federal Constituency where every citizen has a voice, every youth has an opportunity, and every child is prepared to compete and succeed in a rapidly evolving global world."

### Mission Statement
To provide effective, inclusive, and accountable representation by working hand in hand with communities, stakeholders, and development partners. Committed to listening to constituents, understanding their needs, and championing policies that improve quality of life for all segments — youths, women, professionals, artisans, entrepreneurs, students, and the elderly.

**Together, we will build a constituency that is:**
- Digitally empowered
- Educationally advanced
- Economically vibrant
- Socially inclusive
- Globally competitive

---

## 3. The Vision (Manifesto / Policy Pillars)

### Pillar 1 — Digital Town Hall Initiative
A **Constituency Town Hall Application** connecting every resident directly with their representative, anytime, anywhere.

**Features:**
- Direct communication with constituents
- Community feedback and opinion polls
- Project monitoring and reporting
- Submission of complaints and suggestions
- Constituency development updates
- Emergency community alerts
- Youth and women engagement programs
- Online town hall meetings

**Benefits:** Gives everyone a voice; encourages transparency and accountability; reduces cost of repeated physical meetings; improves response time; creates a permanent citizen↔representative channel. Makes governance more inclusive, accessible, and responsive.

### Pillar 2 — Constituency Technology & Innovation Hub
Training young people in high-demand skills and connecting them to income.

**Digital Skills:** Software Development, Mobile App Development, Artificial Intelligence, Robotics, Cybersecurity, UI/UX Design, Graphic Design, Digital Marketing, Video Production, Data Analytics, Cloud Computing.

**Entrepreneurship Skills:** Business Development, Start-up Management, Innovation Commercialization, Freelancing and Remote Work.

**Remote Work & Global Employment Initiative:** Graduates connected to remote employment and freelance platforms to earn from international clients. Goal: a pipeline *from learning to earning*. Reduces unemployment, creates wealth, improves household incomes, curbs cybercrime, and positions youths as global digital professionals.

### Pillar 3 — Robotics & Technology Education in Public Schools
Closing the gap between public and private education by sponsoring legislation/programs that introduce: Robotics Education, Coding Clubs, Computer Laboratories, AI Awareness Programs, and a Digital Literacy Curriculum in government-owned schools.

**Outcomes:** Improved STEM education, increased student innovation, better career preparation, competitiveness with private schools, future scientists/engineers/tech leaders.

### Pillar 4 — Grooming Hub Initiative
Bringing professionals into schools to mentor students beyond academics.

**Focus areas:** Leadership Development, Career Guidance, Personal Development, Communication Skills, Financial Literacy, Entrepreneurship, Emotional Intelligence, Civic Responsibility.

**Mentors:** Doctors, Engineers, Lawyers, Technology Experts, Entrepreneurs, Public Servants, Academics, Community Leaders.

### Pillar 5 — Preparing Our People for the Future
Equip every young person with the tools, skills, and opportunities to compete in the global economy — preparing children not only for examinations, but for life, leadership, innovation, and opportunity.

### Additional Pillars (from candidate profile)
- **Empowerment through Opportunity:** Sustainable youth employment + support for small business owners.
- **Legislative Advocacy:** Bills improving local infrastructure, healthcare access, and education.
- **Accountability:** Transparent system for constituents to engage and see project impact.
- **Human Capital & Well-being:** Support for elders and vulnerable families through community-led health initiatives.

### Our Commitment (checklist)
- ✓ Build a Constituency Town Hall App for direct citizen engagement
- ✓ Establish a Technology and Innovation Hub
- ✓ Train youths in high-demand digital skills
- ✓ Connect graduates with remote job opportunities
- ✓ Promote robotics and coding education in public schools
- ✓ Launch the Grooming Hub Initiative for student mentorship
- ✓ Create pathways to entrepreneurship and global competitiveness
- ✓ Foster transparency, accountability, and citizen participation

---

## 4. Website Site Map (8 pages)

> Guideline from candidate — *flexible, not a rigid template.*

### 1. Homepage
- **Hero:** High-quality photo of constituents in key hubs (Ring Road, Dugbe, or Eleyele), campaign slogan, prominent **Donate** / **Volunteer** button.
- **Candidate Introduction**
- **Pillars Summary**
- **CTA:** Simple form collecting visitor emails + phone numbers for SMS campaigns.

### 2. Meet Olanrewaju Okesooto (About)
- Professional & Personal Biography
- Constituency Roots
- Values Statement

### 3. Campaign Agenda / Manifesto (The Vision)
- Full policy pillars (see §3).

### 4. Wards & Local Government Focus
- **Find Your Polling Unit:** Link/guide routing users to INEC portal tools to verify where to vote.

### 5. News & Media Hub
- **Campaign Blog:** Updates on ward-to-ward consultation tours, town hall meetings, community engagements.
- **Press Releases:** Official statements on local/national issues.
- **Gallery & Videos:** Hi-res photos and short videos with market women, elders, youth groups.

### 6. Get Involved (Volunteer & Support Hub)
- **Volunteer Sign-up Form:** Categorized — Door-to-door canvassing, Social media advocacy, Polling unit agents, Event planning.
- **Endorsement Page:** Quotes/photos from community leaders, traditional elders, local associations.

### 7. Secure Donation Page
- **Local & Diaspora Giving:** Secure payment gateway (Flutterwave or Paystack) for supporters in Nigeria and abroad.
- **Transparency Disclaimer:** Note on compliance with financial/campaign regulations.

### 8. Contact & Social Media Integration
- Campaign Office Address
- Direct Communication Lines: campaign email + visible **WhatsApp Business** link (crucial for high-engagement comms with Nigerian voters)
- Social Links

---

## 5. Key Content Assets

### CTAs
- **Support the Campaign** (Donate)
- **Volunteer Today**
- **Join the Movement**

### Press Release (for the Blog)
**FOR IMMEDIATE RELEASE** — *Olanrewaju Okesooto Announces Candidacy for Federal House of Representatives, Ibadan Southwest/Northwest Constituency under the umbrella of the Labour Party.*

> IBADAN, OYO STATE — June 1st, 2026. Olanrewaju Okesooto, a seasoned community leader, tech consultant, and founder of the "Avoid Failed Future Initiative," has officially announced his candidacy for the Federal House of Representatives to represent the people of Ibadan Southwest and Northwest.

Built on the pillars of integrity, digital inclusion, and radical economic empowerment.

> "My journey to this point has been defined by one singular purpose: to secure a future where no child or business is left behind. The people of Ibadan Southwest and Northwest deserve a representative who is not just a politician, but a practitioner — someone who has built businesses, mentored students, and served the community in the trenches. I am that candidate." — Olanrewaju Okesooto

**Key Policy Pillars (press):** Digital Hubs for Economic Growth · Accountability in Representation (digital town halls) · Youth & Education (scaling the Avoid Failed Future Initiative).

### The Promise (quote)
> "My commitment to Ibadan Southwest and Northwest is unwavering. I am not running to fill a seat; I am running to bridge the gap between the government and the governed. Together, we can build a constituency where every resident has the opportunity to succeed." — Okesooto Olanrewaju Moses

---

## 6. Contacts

Numbers use **+234** international format so diaspora supporters can dial directly. Order is fixed (Apostle → Daddy Ayeni → … → Yomade last). More positions/names to be added by the client.

| Role | Name | Phone |
|------|------|-------|
| Strategic Team Lead / Advisory Board Chairman | Apostle (Dr.) Philips Olaiya Oladipo | +234 815 756 1814 |
| Religious Body Mobilizer | Pastor Oluseye A. Ayeni (FSP) | +234 703 865 2796 |
| Youth Coordinators | *To be announced* | — |
| Campaign Manager | Adeyemo Olayomade | +234 810 999 1271 |

**Campaign Office Address:** *(TBD — to confirm with client)*
**Campaign Email:** *(TBD)*
**WhatsApp Business:** *(TBD)*
**Social Links:** *(TBD)*

---

## 7. Open Questions / To Confirm With Client
- [ ] Official high-resolution hero photos (Ring Road / Dugbe / Eleyele) and candidate portraits
- [ ] Payment gateway preference: **Flutterwave** vs **Paystack** (and is diaspora/international giving required at launch?)
- [ ] Campaign office address, official email, WhatsApp Business number, social media handles
- [ ] Full professional background details (biography section currently a placeholder in the brief)
- [ ] Brand assets: logo, color palette, fonts (Labour Party association — confirm visual guidelines)
- [ ] SMS provider for the email/phone capture campaign
- [ ] Is the Town Hall App in scope for this project, or website-only for now?
- [ ] Domain name + hosting preference
- [ ] List of endorsements (quotes/photos) available at launch
