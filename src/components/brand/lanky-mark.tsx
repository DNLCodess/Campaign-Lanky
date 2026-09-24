/**
 * The Lanky mark rebuilt as vector: a 2x2 grid with the top-left square
 * missing (navy top-right, light blue bottom-left, red bottom-right).
 * Geometry is measured from the original artwork: squares of 94 units with a
 * 5 unit gutter on a 193 unit canvas.
 */
const SIZE = 94;
const STEP = 99;

export const MARK_COLORS = { navy: "#0f3349", blue: "#689cbd", red: "#c6151f" } as const;

// Grid slots in clockwise order: top-left, top-right, bottom-right, bottom-left.
const SLOTS = [
  [0, 0],
  [STEP, 0],
  [STEP, STEP],
  [0, STEP],
] as const;

export function LankyMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 193 193"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <rect x={STEP} y={0} width={SIZE} height={SIZE} fill={MARK_COLORS.navy} />
      <rect x={0} y={STEP} width={SIZE} height={SIZE} fill={MARK_COLORS.blue} />
      <rect x={STEP} y={STEP} width={SIZE} height={SIZE} fill={MARK_COLORS.red} />
    </svg>
  );
}

/**
 * Loading animation: the three squares slide around the empty slot like a
 * sliding puzzle, one move at a time, each piece travelling the full
 * clockwise loop. Twelve moves make one seamless cycle. Falls back to the
 * still mark when reduced motion is requested.
 */
const MOVES = 12;
const MOVE_SHARE = 0.72; // fraction of each move-slot spent sliding; the rest is a beat of rest
const pct = (n: number) => `${+n.toFixed(3)}%`;

function keyframes(name: string, startSlot: number, firstMove: number): string {
  const stops: string[] = [];
  const at = (slot: number) => `translate(${SLOTS[slot % 4][0]}px, ${SLOTS[slot % 4][1]}px)`;
  const ease = "animation-timing-function: cubic-bezier(.65,0,.35,1);";
  stops.push(`0% { transform: ${at(startSlot)}; ${ease} }`);
  for (let j = 0; j < 4; j++) {
    const move = firstMove + j * 3;
    const from = (100 * move) / MOVES;
    const to = from + (100 / MOVES) * MOVE_SHARE;
    // Clockwise: each move goes to the next slot in SLOTS order.
    if (from > 0) stops.push(`${pct(from)} { transform: ${at(startSlot + j)}; ${ease} }`);
    stops.push(`${pct(to)} { transform: ${at(startSlot + j + 1)}; }`);
  }
  stops.push(`100% { transform: ${at(startSlot + 4)}; }`);
  return `@keyframes ${name} { ${stops.join(" ")} }`;
}

// Blue starts bottom-left (slot 3), red bottom-right (2), navy top-right (1).
// Moves alternate blue, red, navy — each one steps into the slot just vacated.
const CSS =
  keyframes("lm-blue", 3, 0) +
  keyframes("lm-red", 2, 1) +
  keyframes("lm-navy", 1, 2) +
  `.lm-p { animation: 4.8s infinite; }
   .lm-blue { animation-name: lm-blue; }
   .lm-red { animation-name: lm-red; }
   .lm-navy { animation-name: lm-navy; }
   @media (prefers-reduced-motion: reduce) { .lm-p { animation: none; } }`;

export function LankyLoader({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 193 193" className={className} aria-hidden focusable="false">
      <style>{CSS}</style>
      <rect className="lm-p lm-blue" width={SIZE} height={SIZE} fill={MARK_COLORS.blue} style={{ transform: `translate(0px, ${STEP}px)` }} />
      <rect className="lm-p lm-red" width={SIZE} height={SIZE} fill={MARK_COLORS.red} style={{ transform: `translate(${STEP}px, ${STEP}px)` }} />
      <rect className="lm-p lm-navy" width={SIZE} height={SIZE} fill={MARK_COLORS.navy} style={{ transform: `translate(${STEP}px, 0px)` }} />
    </svg>
  );
}

/** Centered loader for route transitions. Fades in after a beat so quick loads never flash it. */
export function LoadingScreen({ fullScreen }: { fullScreen?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center ${fullScreen ? "min-h-screen" : "min-h-[50vh]"}`}
    >
      <div className="flex flex-col items-center gap-4 opacity-0 [animation:lm-fade_0.3s_ease-out_0.2s_forwards]">
        <style>{"@keyframes lm-fade { to { opacity: 1; } }"}</style>
        <LankyLoader className="h-12 w-12" />
        <span className="text-xs text-text-muted">Loading…</span>
      </div>
    </div>
  );
}
