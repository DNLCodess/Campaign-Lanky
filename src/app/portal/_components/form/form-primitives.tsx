"use client";

/**
 * Shared building blocks for portal forms. The portal is used by campaign
 * volunteers who may not be comfortable with software, so these lean hard on
 * plain labels, visible helper text, and telling people *why* a control is
 * disabled rather than just greying it out.
 */

import { useId, useState, type ReactNode } from "react";

const inputClass =
  "w-full rounded-brand border border-border bg-bg px-3.5 py-2.5 text-sm text-text " +
  "placeholder:text-text-muted/60 focus:border-accent focus:outline-none disabled:opacity-60";

/** A numbered step in a form. Steps are a genuine sequence here (person -> role -> place). */
export function FieldSection({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
          {step}
        </span>
        <div>
          <h3 className="font-heading text-base text-text">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
        </div>
      </div>
      <div className="space-y-4 pl-9">{children}</div>
    </section>
  );
}

/** Label + optional helper text + error around any control. */
export function Field({
  label,
  htmlFor,
  optional,
  helper,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  helper?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text">
        {label}
        {optional && <span className="ml-1.5 font-normal text-text-muted">(optional)</span>}
      </label>
      {helper && !error && <p className="text-xs text-text-muted">{helper}</p>}
      {children}
      {error && <p className="text-xs text-primary">{error}</p>}
    </div>
  );
}

/** Field + text input, the common case. */
export function TextField({
  name,
  label,
  type = "text",
  optional,
  helper,
  error,
  autoFocus,
  autoComplete,
  inputMode,
  value,
  onChange,
}: {
  name: string;
  label: string;
  type?: "text" | "email" | "tel";
  optional?: boolean;
  helper?: string;
  error?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel";
  value?: string;
  onChange?: (value: string) => void;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} optional={optional} helper={helper} error={error}>
      <input
        id={id}
        name={name}
        type={type}
        required={!optional}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={onChange ? (value ?? "") : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={inputClass}
      />
    </Field>
  );
}

export type SelectOption = { value: string; label: string };

/**
 * Field + native select. When `disabledReason` is set the control is disabled
 * and shows that sentence in place of the options, so the person knows what to
 * do first instead of staring at a dead dropdown.
 */
export function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabledReason,
  optional,
  helper,
  error,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  disabledReason?: string;
  optional?: boolean;
  helper?: string;
  error?: string;
}) {
  const id = useId();
  const disabled = Boolean(disabledReason);
  return (
    <Field label={label} htmlFor={id} optional={optional} helper={helper} error={error}>
      <select
        id={id}
        name={name}
        required={!optional}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="" disabled>
          {disabledReason ?? placeholder}
        </option>
        {!disabled &&
          options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
      </select>
    </Field>
  );
}

export type RadioCardOption = { value: string; label: string; description: string };

/** A set of large, always-visible choices with a plain-English line on each. */
export function RadioCardGroup({
  name,
  legend,
  value,
  onChange,
  options,
}: {
  name: string;
  legend: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioCardOption[];
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <label
            key={o.value}
            className={`flex cursor-pointer gap-3 rounded-brand border p-3.5 transition-colors ${
              selected ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={selected}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                selected ? "border-accent" : "border-border"
              }`}
            >
              {selected && <span className="h-2 w-2 rounded-full bg-accent" />}
            </span>
            <span>
              <span className="block text-sm font-medium text-text">{o.label}</span>
              <span className="mt-0.5 block text-sm text-text-muted">{o.description}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

/** Top-of-form message. Errors say what to fix, in the interface's voice. */
export function FormBanner({ tone, children }: { tone: "error" | "info"; children: ReactNode }) {
  const styles =
    tone === "error"
      ? "border-primary/40 bg-primary/10 text-text"
      : "border-border bg-surface-2 text-text";
  return (
    <p className={`rounded-brand border px-3.5 py-2.5 text-sm ${styles}`} role={tone === "error" ? "alert" : undefined}>
      {children}
    </p>
  );
}

export function SubmitButton({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-brand bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/**
 * Shown after an account is created: the new person's sign-in details with a
 * one-tap copy, and a way back to add another. Reused by every account form.
 */
export function CredentialHandoff({
  name,
  email,
  password,
  onReset,
}: {
  name: string;
  email: string;
  password: string;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = `Portal sign-in for ${name}\nEmail: ${email}\nTemporary password: ${password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4 rounded-brand border border-accent/40 bg-accent/5 p-5">
      <div>
        <h3 className="font-heading text-base text-text">Account created for {name}</h3>
        <p className="mt-1 text-sm text-text-muted">
          Send these details to {name.split(" ")[0]} privately. They&apos;ll set their own password
          the first time they sign in.
        </p>
      </div>

      <dl className="space-y-2 rounded-brand border border-border bg-bg p-3.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-text-muted">Email</dt>
          <dd className="text-text">{email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-muted">Temporary password</dt>
          <dd className="font-mono text-text">{password}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="rounded-brand bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          {copied ? "Copied" : "Copy sign-in details"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          Add another person
        </button>
      </div>
    </div>
  );
}
