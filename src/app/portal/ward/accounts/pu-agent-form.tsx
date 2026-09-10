"use client";

import { CreateSubAccountForm } from "@/app/portal/_components/create-sub-account-form";

export function PuAgentForm({
  pollingUnits,
}: {
  pollingUnits: { pu_code: string; pu_name: string }[];
}) {
  return (
    <CreateSubAccountForm
      heading="Add a polling unit agent"
      intro="Create a sign-in for someone who will submit results from one polling unit on election day."
      locationStep="Which polling unit?"
      locationName="polling_unit"
      locationLabel="Polling unit"
      locationPlaceholder="Choose a polling unit"
      options={pollingUnits.map((pu) => ({
        value: pu.pu_code,
        label: `${pu.pu_name} (${pu.pu_code})`,
      }))}
    />
  );
}
