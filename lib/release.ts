export const DEFAULT_UNLOCK_AT = "2026-10-01T00:00:00+05:30";
export function releaseTime(value: string | undefined): number {
  const time = Date.parse(value || DEFAULT_UNLOCK_AT);
  return Number.isFinite(time) ? time : Infinity; // invalid configuration fails closed
}
export function isReleased(now: number, value?: string): boolean {
  return now >= releaseTime(value);
}
export function previewAllowed(mode?: string, enabled?: string): boolean {
  return mode === "development" && enabled === "true";
}
