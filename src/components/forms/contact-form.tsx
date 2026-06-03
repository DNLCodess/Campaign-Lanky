"use client";

import { useActionState } from "react";
import { submitContact } from "@/app/actions";
import type { FormState } from "@/lib/form-state";
import { FormSuccess } from "@/components/forms/form-success";

const initial: FormState = { status: "idle" };

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContact, initial);

  if (state.status === "success") {
    return (
      <div className="rounded-brand border border-border bg-surface/40 p-8">
        <FormSuccess
          title="Message sent!"
          message="Thank you for reaching out — the campaign team will get back to you. For faster conversations, join our WhatsApp community."
        />
      </div>
    );
  }

  return (
    <div className="rounded-brand border border-border bg-surface/40 p-8">
      <h2 className="font-heading text-3xl text-text">Send a message</h2>
      <form action={formAction} className="mt-6 space-y-5">
        <label className="block">
          <span className="text-sm font-medium text-text">Name</span>
          <input
            type="text"
            name="name"
            required
            className="mt-2 w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-text">Email or phone</span>
          <input
            type="text"
            name="contact"
            required
            className="mt-2 w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-text">Message</span>
          <textarea
            name="message"
            rows={5}
            required
            className="mt-2 w-full rounded-brand border border-border bg-bg px-4 py-3 text-sm text-text focus:border-accent focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-brand bg-primary px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send Message"}
        </button>
        {state.status === "error" && (
          <p className="text-sm text-primary">{state.message}</p>
        )}
      </form>
    </div>
  );
}
