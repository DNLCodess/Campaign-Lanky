/**
 * Brand watermark: the Lanky mark (three squares, top-left one empty) tiled in
 * a brick offset, drawn inline so it stays crisp and costs no image request.
 * Faded out towards the middle so forms and tables sit on a clean field and
 * the pattern only shows around the edges. Render inside a `relative isolate`
 * container; it sits behind the container's content.
 */
const mark = (x: number, y: number) =>
  `<g transform='translate(${x} ${y})'>` +
  `<rect x='22' y='0' width='18' height='18' fill='#2a5677'/>` +
  `<rect x='0' y='22' width='18' height='18' fill='#689cbf'/>` +
  `<rect x='22' y='22' width='18' height='18' fill='#c8151f'/>` +
  `</g>`;

const TILE = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>` +
    `<g opacity='0.09'>${mark(20, 20)}${mark(100, 100)}</g></svg>`,
);

export function BrandWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_50%_40%,transparent_10%,black_80%)]"
      style={{ backgroundImage: `url("data:image/svg+xml,${TILE}")` }}
    />
  );
}
