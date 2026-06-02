"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

/** Counts up to `value` when scrolled into view. Reduced-motion shows it instantly. */
export function CountUp({
  value,
  suffix = "",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion()) {
        el.textContent = `${value}${suffix}`;
        return;
      }
      const obj = { v: 0 };
      gsap.to(obj, {
        v: value,
        duration: 1.4,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = `${Math.round(obj.v)}${suffix}`;
        },
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      });
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  );
}
