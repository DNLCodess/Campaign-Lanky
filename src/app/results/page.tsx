import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";
import { getPublicResults } from "@/lib/public-results";
import { LeaderboardBars, LeaderboardLegend } from "@/components/charts/leaderboard-bars";
import { Meter } from "@/components/charts/meter";

export const metadata: Metadata = {
  title: "Results",
  description:
    "Our campaign's transparent, agent-verified vote count for Ibadan Southwest/Northwest — collated ward by ward, published as it comes in.",
  alternates: { canonical: "/results" },
};

// Revalidate periodically rather than on every request — real-time-ish
// without hitting the database on every hit during high traffic.
export const revalidate = 30;

export default async function ResultsPage() {
  const results = await getPublicResults();

  return (
    <>
      <PageHeader
        image="/consituency/3.jpeg"
        eyebrow="Transparency & Accountability"
        title="Our results, as they come in"
        intro="A transparent, agent-verified parallel count — collated ward by ward by our own team, published openly. This is our campaign's own tally, not the official INEC declaration."
      />

      <section className="tone-navy px-5 py-20">
        <div className="mx-auto max-w-6xl sm:px-8">
          {!results ? (
            <Reveal className="rounded-brand border border-border bg-surface/40 p-10 text-center">
              <p className="font-heading text-2xl text-text">Results aren&apos;t published yet</p>
              <p className="mt-3 text-text-muted">
                Check back once collation is underway — this page will show LGA and ward-level
                totals as our agents report in.
              </p>
            </Reveal>
          ) : (
            <div className="space-y-12">
              <Reveal className="flex flex-wrap items-center justify-between gap-4 rounded-brand border border-border bg-surface/40 p-6">
                <div>
                  <p className="text-sm text-text-muted">{results.electionName}</p>
                  {results.publishedAt && (
                    <p className="mt-1 text-xs text-text-muted">
                      Last updated {new Date(results.publishedAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  )}
                </div>
                <div className="w-full max-w-xs sm:w-64">
                  <Meter
                    value={results.reportingPus}
                    max={results.totalPus}
                    label="Polling units reporting"
                  />
                </div>
              </Reveal>

              <Reveal>
                <h2 className="font-heading text-2xl text-text sm:text-3xl">Constituency-wide</h2>
                <div className="mt-5 rounded-brand border border-border bg-surface/40 p-6 sm:p-8">
                  <LeaderboardBars
                    items={results.totals.map((t) => ({
                      id: t.id,
                      label: t.name,
                      sublabel: t.party ?? undefined,
                      value: t.votes,
                      colorIndex: t.colorIndex,
                    }))}
                  />
                </div>
              </Reveal>

              <Reveal>
                <h2 className="font-heading text-2xl text-text sm:text-3xl">By Local Government</h2>
                <div className="mt-4">
                  <LeaderboardLegend
                    items={results.candidates.map((c) => ({ id: c.id, label: c.name, colorIndex: c.colorIndex }))}
                  />
                </div>
                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  {results.byLga.map((lga) => (
                    <div key={lga.lga} className="rounded-brand border border-border bg-surface/40 p-6">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-heading text-lg text-text">{lga.lga}</h3>
                        <span className="text-xs text-text-muted">
                          {lga.reportingPus}/{lga.totalPus} PUs
                        </span>
                      </div>
                      <div className="mt-4">
                        <LeaderboardBars
                          items={lga.candidates.map((c) => ({
                            id: c.id,
                            label: c.name,
                            value: c.votes,
                            colorIndex: c.colorIndex,
                          }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal>
                <h2 className="font-heading text-2xl text-text sm:text-3xl">By ward</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Full ward-by-ward breakdown across both LGAs.
                </p>
                <div className="mt-5 overflow-x-auto rounded-brand border border-border">
                  <table className="w-full min-w-160 text-left text-sm">
                    <thead className="bg-surface-2 text-text-muted">
                      <tr>
                        <th className="px-4 py-3 font-medium">LGA</th>
                        <th className="px-4 py-3 font-medium">Ward</th>
                        {results.candidates.map((c) => (
                          <th key={c.id} className="px-4 py-3 font-medium">
                            {c.name}
                          </th>
                        ))}
                        <th className="px-4 py-3 font-medium">PUs reporting</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.byWard.map((w) => (
                        <tr key={`${w.lga}-${w.ward}`} className="border-t border-border/40 text-text-muted">
                          <td className="px-4 py-3 text-text">{w.lga}</td>
                          <td className="px-4 py-3">{w.ward}</td>
                          {w.candidates.map((c) => (
                            <td key={c.id} className="px-4 py-3">
                              {c.votes.toLocaleString()}
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            {w.reportingPus}/{w.totalPus}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Reveal>

              <Reveal className="rounded-brand border border-border bg-surface/20 p-6 text-sm text-text-muted">
                <p className="font-medium text-text">How this count works</p>
                <p className="mt-2 leading-relaxed">
                  Each figure here is submitted by an accredited polling-unit agent, together with a
                  photo of the official result sheet, and is checksummed against tampering. This is
                  our campaign&apos;s own transparent collation — standard practice for party and
                  observer parallel counts — not a substitute for the official result declared by
                  INEC.
                </p>
              </Reveal>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
