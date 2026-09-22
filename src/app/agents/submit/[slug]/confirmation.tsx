// The reference number is still generated and stored on every nomination
// (visible to the candidate in their dashboard if it's ever needed), but not
// shown here: surfacing it to the nominee added a code they had no use for
// and only invited confusion.
export function Confirmation({ candidateOffice }: { candidateOffice: string }) {
  return (
    <div className="mx-auto max-w-lg px-5 py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-green-400" fill="none" aria-hidden>
          <path
            d="M5 12.5l4.5 4.5L19 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className="mt-6 font-heading text-2xl text-text">Submission received</h1>
      <p className="mt-3 text-sm text-text-muted">
        Thank you. Your nomination as a Polling Unit Agent for {candidateOffice} has been submitted
        successfully.
      </p>

      <div className="mt-8 rounded-brand border border-border bg-surface/40 p-5 text-left text-sm text-text-muted">
        <p className="font-medium text-text">What happens next</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4">
          <li>Your form has been generated with your details, photo, ID, and signature attached.</li>
          <li>No further action is needed from you. The candidate&apos;s team has your submission.</li>
          <li>If any detail was entered incorrectly, contact the person who shared this link with you.</li>
        </ul>
      </div>

      <p className="mt-6 text-xs text-text-muted/70">You may now close this page.</p>
    </div>
  );
}
