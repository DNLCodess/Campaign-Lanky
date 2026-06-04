import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/motion/reveal";
import { VoterRegistrationForm } from "@/components/forms/voter-registration-form";

export const metadata: Metadata = {
  title: "Register Your Voter Card",
  description:
    "Register your voter card with the campaign. Provide your details and our team will help you get your PVC — your vote is your voice.",
};

export default function RegisterPage() {
  return (
    <>
      <PageHeader
        image="/consituency/8.jpeg"
        eyebrow="Your Vote, Your Voice"
        title="Register your voter card"
        intro="Not yet registered, or need to transfer or update your details? Share your information and our team will guide you through getting your Permanent Voter Card (PVC). It only takes a minute."
      />

      <section className="tone-steel px-5 py-20">
        <div className="mx-auto max-w-2xl sm:px-8">
          <Reveal className="rounded-brand border border-border bg-surface/40 p-8 sm:p-10">
            <h2 className="font-heading text-2xl text-text">
              Voter registration details
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              All fields marked <span className="text-primary">*</span> are required.
            </p>
            <div className="mt-6">
              <VoterRegistrationForm />
            </div>
          </Reveal>

          <Reveal
            delay={0.1}
            className="mt-8 rounded-brand border border-border bg-surface/20 p-7"
          >
            <h3 className="font-heading text-xl text-text">Already registered?</h3>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Confirm your polling unit and registration status directly on the INEC
              portal.
            </p>
            <Link
              href="/wards"
              className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent-hover"
            >
              Find your polling unit →
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
