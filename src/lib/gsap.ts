/**
 * Central GSAP entry. Registers plugins once (client-side) and exposes
 * helpers for our motion guardrails:
 *   - prefersReducedMotion(): honor the OS "reduce motion" setting
 *   - isDesktop(): gate cinematic / pinned effects to wide screens
 * Cinematic effects use transform/opacity only for performance on mid-range
 * Android devices (our primary audience).
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export const DESKTOP_QUERY = "(min-width: 1024px)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(DESKTOP_QUERY).matches;
}

export { gsap, ScrollTrigger };
