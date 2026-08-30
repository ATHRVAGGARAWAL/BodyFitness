export function normalizeAggregatedSteps(value: number | null | undefined) {
  if (!Number.isFinite(value) || value === undefined || value === null) return 0;
  return Math.max(0, Math.round(value));
}
