import { getDonationTotals } from "@/lib/donations";
import { DonationProgressBar } from "@/components/donation-progress-bar";

export async function DonationProgress({ variant = "full" }: { variant?: "full" | "compact" }) {
  const { total, count } = await getDonationTotals();
  return <DonationProgressBar raised={total} count={count} variant={variant} />;
}
