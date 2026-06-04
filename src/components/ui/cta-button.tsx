import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover shadow-[0_8px_30px_-8px_rgba(224,33,43,0.5)]",
  outline:
    "border border-border text-text hover:border-accent hover:text-accent bg-transparent",
  ghost: "text-text-muted hover:text-text bg-transparent",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

export function CtaButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-brand font-medium",
        "transition-all duration-200 ease-out will-change-transform hover:-translate-y-0.5",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}
