"use client";

import { TextField, SelectField } from "@/components/form";
import type { NominationDraftFields } from "@/lib/agents/draft-storage";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export function BioStep({
  draft,
  onChange,
}: {
  draft: NominationDraftFields;
  onChange: (patch: Partial<NominationDraftFields>) => void;
}) {
  return (
    <div className="space-y-4">
      <TextField
        name="first_name"
        label="First Name"
        autoFocus
        value={draft.firstName}
        onChange={(v) => onChange({ firstName: v })}
      />
      <TextField
        name="other_names"
        label="Other Name(s)"
        optional
        value={draft.otherNames}
        onChange={(v) => onChange({ otherNames: v })}
      />
      <TextField
        name="surname"
        label="Surname"
        value={draft.surname}
        onChange={(v) => onChange({ surname: v })}
      />
      <SelectField
        name="gender"
        label="Gender"
        value={draft.gender}
        onChange={(v) => onChange({ gender: v as "male" | "female" })}
        options={GENDER_OPTIONS}
        placeholder="Select gender"
      />
    </div>
  );
}
