export function Confirmation({ referenceId }: { referenceId: string }) {
  return (
    <div className="mx-auto max-w-lg px-5 py-16 text-center">
      <h1 className="font-heading text-2xl text-text">Submission received</h1>
      <p className="mt-3 text-sm text-text-muted">
        Thank you — your nomination has been submitted. Keep this reference number for your records.
      </p>
      <p className="mt-6 font-mono text-2xl tracking-wide text-accent">{referenceId}</p>
    </div>
  );
}
