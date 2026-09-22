// The reference number is still generated and stored on every nomination
// (visible to the candidate in their dashboard if it's ever needed), but not
// shown here — surfacing it to the nominee added a code they had no use for
// and only invited confusion.
export function Confirmation() {
  return (
    <div className="mx-auto max-w-lg px-5 py-16 text-center">
      <h1 className="font-heading text-2xl text-text">Submission received</h1>
      <p className="mt-3 text-sm text-text-muted">Thank you — your nomination has been submitted.</p>
    </div>
  );
}
