"use client";

import { useMemo } from "react";
import { SelectField } from "@/components/form";
import type { NominationDraftFields } from "@/lib/agents/draft-storage";
import type { NominationGeoRow } from "@/lib/agents/geo";
import { formatPollingUnitCode } from "@/lib/agents/format";

export function LocationStep({
  draft,
  onChange,
  geo,
}: {
  draft: NominationDraftFields;
  onChange: (patch: Partial<NominationDraftFields>) => void;
  geo: NominationGeoRow[];
}) {
  const lgas = useMemo(() => Array.from(new Set(geo.map((g) => g.lga))), [geo]);
  const wards = useMemo(() => {
    const names = new Map<number, string>();
    for (const g of geo) if (g.lga === draft.lga) names.set(g.ward, g.ward_name);
    return Array.from(names, ([ward, name]) => ({ ward, name })).sort((a, b) => a.ward - b.ward);
  }, [geo, draft.lga]);
  const pollingUnits = useMemo(
    () => geo.filter((g) => g.lga === draft.lga && g.ward === Number(draft.ward)),
    [geo, draft.lga, draft.ward],
  );

  return (
    <div className="space-y-4">
      <SelectField
        name="lga"
        label="LGA"
        value={draft.lga}
        onChange={(v) => onChange({ lga: v, ward: "", pollingUnitCode: "", pollingUnitName: "" })}
        options={lgas.map((lga) => ({ value: lga, label: lga }))}
        placeholder="Select LGA"
      />
      <SelectField
        name="ward"
        label="Ward (Registration Area)"
        value={draft.ward}
        onChange={(v) => onChange({ ward: v, pollingUnitCode: "", pollingUnitName: "" })}
        options={wards.map((w) => ({ value: String(w.ward), label: `Ward ${w.ward} (${w.name})` }))}
        placeholder="Select ward"
        disabledReason={draft.lga ? undefined : "Select an LGA first"}
      />
      <SelectField
        name="polling_unit_code"
        label="Polling Unit"
        value={draft.pollingUnitCode}
        onChange={(v) => {
          const pu = pollingUnits.find((p) => p.pu_code === v);
          onChange({ pollingUnitCode: v, pollingUnitName: pu?.pu_name ?? "" });
        }}
        options={pollingUnits.map((p) => ({
          value: p.pu_code,
          label: `${formatPollingUnitCode(p.pu_code)} (${p.pu_name})`,
        }))}
        placeholder="Select polling unit"
        disabledReason={draft.ward ? undefined : "Select a ward first"}
      />
    </div>
  );
}
