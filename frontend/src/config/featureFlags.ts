export const RESEARCH_FEATURES_ENABLED =
  import.meta.env.VITE_ENABLE_RESEARCH_FEATURES === "true";

export const RESEARCH_TAB_IDS = new Set([
  "ai_analytics",
  "ai_advisor",
  "conflict_queue",
  "quota_fairness",
  "chargeback",
  "policy_config",
  "allocations",
  "pareto",
  "timeline",
  "digital_twin",
  "what_if",
  "concurrency",
  "ga_solver",
  "ai_rca",
  "assistant",
  "optimization",
  "training",
  "logs"
]);

export function isResearchTab(tabId: string) {
  return RESEARCH_TAB_IDS.has(tabId);
}

export function isTabEnabled(tabId: string) {
  return RESEARCH_FEATURES_ENABLED || !isResearchTab(tabId);
}
