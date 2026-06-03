import { site } from "@/lib/site";

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
      <path d="M12 2a10 10 0 0 0-8.6 15.07L2 22l5.05-1.32A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3 .78.8-2.92-.2-.31A8.2 8.2 0 1 1 12 20.2Z" />
    </svg>
  );
}

/**
 * Shared post-submission success screen with the WhatsApp community invite.
 * `compact` is used inside tight spots (e.g. the homepage capture band).
 */
export function FormSuccess({
  title = "You're in!",
  message,
  compact = false,
}: {
  title?: string;
  message: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "text-center" : "text-center"}>
      {/* Brand window-pane check */}
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-brand border border-accent/40 bg-surface">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-accent" fill="none" aria-hidden>
          <path
            d="M5 12.5l4.5 4.5L19 7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h3 className={`mt-5 font-heading text-text ${compact ? "text-3xl" : "text-4xl"}`}>
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-md text-text-muted">{message}</p>

      <a
        href={site.whatsappGroup}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-7 inline-flex items-center gap-2.5 rounded-brand bg-primary px-7 py-3.5 text-base font-medium text-white transition-colors hover:bg-primary-hover"
      >
        <WhatsAppGlyph />
        Join our WhatsApp community
      </a>
      <p className="mt-3 text-xs text-text-muted/70">
        Get campaign updates and connect with fellow supporters.
      </p>
    </div>
  );
}
