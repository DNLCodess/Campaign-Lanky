/**
 * Polling unit codes are stored and matched hyphen-separated (e.g.
 * "30-08-07-007", matching constituency_geo.pu_code), but the official
 * Notice's own example format uses slashes ("**\/**\/**\/***"). This is
 * display-only — never apply it to the value used for lookups, matching, or
 * storage.
 */
export function formatPollingUnitCode(code: string): string {
  return code.replaceAll("-", "/");
}
