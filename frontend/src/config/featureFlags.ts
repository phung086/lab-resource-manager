import { WORKSPACE_ROUTES } from "../workspaceRoutes.js";

export const PAYMENT_FEATURES_ENABLED = import.meta.env.VITE_ENABLE_PAYMENT_FEATURES === "true";
export const TELEMETRY_FEATURES_ENABLED = import.meta.env.VITE_ENABLE_TELEMETRY_FEATURES === "true";
export const AI_ASSISTANT_ENABLED = import.meta.env.VITE_ENABLE_AI_ASSISTANT === "true";

export function isTabEnabled(tabId: string) {
  if (tabId === "monitoring") return TELEMETRY_FEATURES_ENABLED;
  if (tabId === "payments") return PAYMENT_FEATURES_ENABLED;
  return Object.hasOwn(WORKSPACE_ROUTES, tabId);
}
