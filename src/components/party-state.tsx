import Image from "next/image";
import { site } from "@/lib/site";
import { cn } from "@/lib/cn";

/**
 * Labour Party + Oyo State identity lockup. Used in the header strip, hero,
 * and footer so the party and state are unmistakable at a glance.
 * The party logo is a placeholder until the official mark is provided.
 */
export function PartyState({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? 36 : 24;
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src={site.partyLogo}
        alt="Labour Party"
        width={dim}
        height={dim}
        className={size === "lg" ? "h-9 w-9" : "h-6 w-6"}
      />
      <span className="flex items-center gap-2 whitespace-nowrap">
        <span className={size === "lg" ? "font-medium text-text" : "font-medium"}>
          {site.party}
        </span>
        <span className="h-1 w-1 rounded-full bg-primary" />
        <span>{site.state}</span>
      </span>
    </div>
  );
}
