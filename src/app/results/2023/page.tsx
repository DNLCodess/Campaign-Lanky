import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";
import { LeaderboardBars } from "@/components/charts/leaderboard-bars";
import { Meter } from "@/components/charts/meter";
import {
  DECLARED,
  IREV_URL,
  PARTIES,
  PARTY_INFO,
  getPuResults,
  getResultsSummary,
  type AreaTotals,
} from "@/lib/results-2023";
import { ResultsExplorer } from "./results-explorer";

export const metadata: Metadata = {
  title: "2023 Results by Polling Unit",
  description:
    "How Ibadan South West / Ibadan North West voted in the 2023 House of Representatives election — every ward and all 713 polling units, read from INEC's own result sheets.",
  alternates: { canonical: "/results/2023" },
};

function partyItems(t: AreaTotals) {
  return PARTIES.map((p) => ({
    id: p,
    label: PARTY_INFO[p].label,
    value: t.votes[p],
    colorIndex: PARTY_INFO[p].colorIndex,
  }));
}

export default function Results2023Page() {
  const units = getPuResults();
  const { constituency, byLga, wards } = getResultsSummary();
  const declaredMargin = DECLARED.winner.votes - DECLARED.runnerUp.votes;
  const sheetMargin = constituency.votes.PDP - constituency.votes.APC;
  const lgaScaleMax = Math.max(...byLga.flatMap((l) => PARTIES.map((p) => l.votes[p])));

  return (
    <>
      <PageHeader
        image="/consituency/3.jpeg"
        eyebrow="2023 election record"
        title="How the constituency voted in 2023"
        intro="The House of Representatives result for Ibadan South West and Ibadan North West, ward by ward and polling unit by polling unit, read from INEC's own result sheets."
      />

      <section className="tone-navy px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl space-y-16 sm:px-8">
          {/* ---------------- Headline ---------------- */}
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
            <Reveal className="rounded-brand border border-border bg-surface/40 p-6 sm:p-8">
              <p className="text-xs font-medium uppercase tracking-widest text-accent">
                Declared by INEC
              </p>
              <p className="mt-3 font-heading text-3xl text-text sm:text-4xl">
                PDP won by {declaredMargin.toLocaleString()} votes
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {DECLARED.winner.candidate} (PDP) was returned with{" "}
                {DECLARED.winner.votes.toLocaleString()} votes against{" "}
                {DECLARED.runnerUp.votes.toLocaleString()} for {DECLARED.runnerUp.candidate} (APC).
              </p>
              <div className="mt-6">
                <LeaderboardBars
                  items={[DECLARED.winner, DECLARED.runnerUp].map((d) => ({
                    id: d.party,
                    label: PARTY_INFO[d.party].label,
                    value: d.votes,
                    colorIndex: PARTY_INFO[d.party].colorIndex,
                  }))}
                />
              </div>
            </Reveal>

            <Reveal delay={0.08} className="rounded-brand border border-border bg-surface/40 p-6 sm:p-8">
              <p className="text-xs font-medium uppercase tracking-widest text-accent">
                From the polling-unit sheets
              </p>
              <p className="mt-3 font-heading text-3xl text-text sm:text-4xl">
                PDP ahead by {sheetMargin.toLocaleString()}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                Our count of the {constituency.readPus.toLocaleString()} sheets that could be read.
                The other {constituency.noResultPus}{" "}
                are unreadable or the wrong upload on INEC&apos;s portal, so these totals sit below
                the declared figures.
              </p>
              <div className="mt-6">
                <LeaderboardBars items={partyItems(constituency)} />
              </div>
              <div className="mt-6 border-t border-border/50 pt-5">
                <Meter
                  value={constituency.readPus}
                  max={constituency.totalPus}
                  label="Polling-unit sheets read"
                />
              </div>
            </Reveal>
          </div>

          {/* ---------------- By LGA ---------------- */}
          <Reveal>
            <h2 className="font-heading text-2xl text-text sm:text-3xl">By local government</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
              PDP carried Ibadan North West. In the sheets we could read, APC edged Ibadan South
              West, driven by its large lead in Ward 12 (SW9 II).
            </p>
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              {byLga.map((l) => {
                const margin = l.votes.PDP - l.votes.APC;
                return (
                  <div key={l.lga} className="rounded-brand border border-border bg-surface/40 p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h3 className="font-heading text-lg text-text">{l.lga}</h3>
                      <span className="text-xs text-text-muted">
                        {l.readPus}/{l.totalPus} sheets read
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      {margin >= 0 ? "PDP" : "APC"} ahead by{" "}
                      <span className="font-medium text-text">{Math.abs(margin).toLocaleString()}</span>
                    </p>
                    <div className="mt-4">
                      <LeaderboardBars items={partyItems(l)} scaleMax={lgaScaleMax} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <ResultsExplorer units={units} wards={wards} />

          {/* ---------------- Method ---------------- */}
          <Reveal className="rounded-brand border border-border bg-surface/20 p-6 text-sm text-text-muted sm:p-8">
            <h2 className="font-heading text-xl text-text">How these figures were made</h2>
            <div className="mt-3 max-w-3xl space-y-3 leading-relaxed">
              <p>
                INEC publishes the 2023 results on its{" "}
                <a href={IREV_URL} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover">
                  Result Viewing Portal (IReV)
                </a>{" "}
                as photos of each polling unit&apos;s Form EC8A, not as numbers. We downloaded all
                713 sheets and read every one by hand, checking each party&apos;s figure against the
                amount written in words and against the total valid votes.
              </p>
              <p>
                {constituency.noResultPus}{" "}
                sheets have no usable result. Most were uploaded as tiny,
                blurred images; a few are the Senate or Presidential sheet, another unit&apos;s sheet,
                or a cancelled result. Units marked &ldquo;Check sheet&rdquo; were hard to read or
                have figures that don&apos;t add up. Every unit links to its original sheet so anyone
                can check our reading.
              </p>
              <p>
                Several sheets list Accord&apos;s votes on a handwritten extra row. Accord is party
                &ldquo;A&rdquo; on the ballot, so those votes are counted under Accord. This is an
                independent reading of public records, not an official INEC result.
              </p>
            </div>
            <Link
              href="/results"
              className="mt-5 inline-block text-sm font-medium text-accent hover:text-accent-hover"
            >
              See our live parallel count →
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
