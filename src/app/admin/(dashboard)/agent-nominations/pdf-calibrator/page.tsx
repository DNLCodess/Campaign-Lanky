import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { PdfCalibrator } from "@/app/admin/(dashboard)/agent-nominations/pdf-calibrator/pdf-calibrator";

export const dynamic = "force-dynamic";

// TEMPORARY DEV TOOL. Delete this whole route (this file + pdf-calibrator.tsx
// + public/dev/pdf-calibrator-template.png + public/dev/fonts/) once PDF
// field calibration is finished — it has no purpose after that and isn't
// linked from anywhere in the admin nav on purpose.
export default async function PdfCalibratorPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="font-heading text-2xl text-text">PDF Field Calibrator</h1>
          <p className="text-sm text-text-muted">
            Dev-only, temporary. Drag fields or edit their coordinates to line them up with the
            template, then copy the config out and hand it back for it to be applied to the real
            generator.
          </p>
        </div>
        <Link
          href="/admin/agent-nominations/candidates"
          className="rounded-brand border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-text"
        >
          ← Candidates
        </Link>
      </header>

      <div className="mt-6">
        <PdfCalibrator />
      </div>
    </div>
  );
}
