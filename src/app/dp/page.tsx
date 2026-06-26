import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";
import { DpGenerator } from "@/components/forms/dp-generator";

export const metadata: Metadata = {
  title: "Get Your Campaign DP",
  description:
    "Show your support — add your photo and name to the official “I Stand With Lanky” campaign frame and download your personalised display picture.",
};

export default function DpPage() {
  return (
    <>
      <PageHeader
        image="/consituency/1.jpeg"
        eyebrow="Show Your Support"
        title="Get your campaign DP"
        intro="Stand with Olanrewaju Okesooto. Add your photo and name to the official campaign frame and download your personalised display picture to share across your socials."
      />

      <section className="tone-steel px-5 py-20">
        <div className="mx-auto max-w-5xl sm:px-8">
          <Reveal className="rounded-brand border border-border bg-surface/40 p-6 sm:p-10">
            <h2 className="font-heading text-2xl text-text">
              Create your “I Stand With Lanky” DP
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              All fields marked <span className="text-primary">*</span> are required.
            </p>
            <div className="mt-8">
              <DpGenerator />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
