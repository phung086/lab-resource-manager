// Provider signals retain their own messages; only canonical rules are translated.
const knownRules = new Set([
  "NO_ACCEPTED_SAMPLE", "SOURCE_REPORTED_OFFLINE", "SAMPLE_STALE", "TEMPERATURE_THRESHOLD", "TEMPERATURE_WARNING", "TEMPERATURE_CRITICAL",
  "HUMIDITY_THRESHOLD", "HUMIDITY_LOW", "HUMIDITY_HIGH", "SOURCE_OFFLINE", "VERIFIED_WARNING_SIGNAL",
  ...["CPUPERCENT", "GPUPERCENT", "GPUMEMORYPERCENT", "RAMPERCENT", "DISKPERCENT"].flatMap(metric => ["THRESHOLD", "WARNING", "CRITICAL"].map(level => `${metric}_${level}`))
]);
export const monitoringText = (code: string, fallback: string, tr: (key: string) => string) => knownRules.has(code) ? tr(`ui.telemetryDetail.rule.${code}`) : fallback;
