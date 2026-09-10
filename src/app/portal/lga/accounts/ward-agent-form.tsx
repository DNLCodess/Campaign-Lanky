"use client";

import { CreateSubAccountForm } from "@/app/portal/_components/create-sub-account-form";

export function WardAgentForm({ wards }: { wards: number[] }) {
  return (
    <CreateSubAccountForm
      heading="Add a ward agent"
      intro="Create a sign-in for someone who will oversee the polling units in one ward."
      locationStep="Which ward?"
      locationName="ward"
      locationLabel="Ward"
      locationPlaceholder="Choose a ward"
      options={wards.map((w) => ({ value: String(w), label: `Ward ${w}` }))}
    />
  );
}
