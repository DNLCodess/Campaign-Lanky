import { site } from "@/lib/site";

/**
 * Site-wide JSON-LD structured data.
 *
 * Emits a single @graph with three linked entities so search engines and AI
 * crawlers can understand the site: the candidate (Person), the campaign
 * organisation, and the website itself. Rendered once in the root layout.
 */
export function StructuredData() {
  const { url } = site;

  const person = {
    "@type": "Person",
    "@id": `${url}/#candidate`,
    name: site.candidate,
    alternateName: site.shortName,
    description: `${site.party} candidate for the ${site.office}, ${site.constituency}.`,
    jobTitle: `Candidate, ${site.office}`,
    url: `${url}/about`,
    image: `${url}/brand/candidate-4.png`,
    homeLocation: {
      "@type": "Place",
      name: `${site.constituency}, ${site.state}, Nigeria`,
    },
    memberOf: {
      "@type": "PoliticalParty",
      name: site.party,
    },
    sameAs: site.socials.map((s) => s.href).filter(Boolean),
  };

  const organization = {
    "@type": "Organization",
    "@id": `${url}/#campaign`,
    name: `${site.shortName} for Ibadan Campaign`,
    description: site.slogan,
    url,
    logo: `${url}/brand/logo-navy.png`,
    member: { "@id": `${url}/#candidate` },
    areaServed: {
      "@type": "AdministrativeArea",
      name: `${site.constituency}, ${site.state}, Nigeria`,
    },
    ...(site.contact.email ? { email: site.contact.email } : {}),
    ...(site.contact.address ? { address: site.contact.address } : {}),
  };

  const website = {
    "@type": "WebSite",
    "@id": `${url}/#website`,
    url,
    name: `${site.shortName} — ${site.candidate}`,
    description: site.slogan,
    inLanguage: "en-NG",
    publisher: { "@id": `${url}/#campaign` },
    about: { "@id": `${url}/#candidate` },
  };

  const graph = {
    "@context": "https://schema.org",
    "@graph": [person, organization, website],
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; no user input is interpolated.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
