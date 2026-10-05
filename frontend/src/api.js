import { getActiveLocale, hasMessage } from "./i18n.js";

const configuredApiBase = import.meta.env?.VITE_API_BASE_URL || `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:8000`;
const API_BASE_URL = `${configuredApiBase.replace(/\/$/, "")}${/\/api$/.test(configuredApiBase) ? "" : "/api"}`;

export class ApiError extends Error {
  constructor(message, status, details, code) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

export async function apiRequest(path, options = {}) {
  const { signal: externalSignal, timeoutMs = path === "/assistant/chat" ? 65000 : 30000, ...requestOptions } = options;
  const controller = new AbortController();
  const cancel = () => controller.abort(externalSignal.reason);
  if (externalSignal?.aborted) cancel();
  else externalSignal?.addEventListener("abort", cancel, { once: true });
  const milliseconds = Number.isFinite(timeoutMs) ? Math.max(1, Math.min(timeoutMs, 120000)) : 30000;
  const timer = setTimeout(() => controller.abort(), milliseconds);
  const token = localStorage.getItem("lrm_token");
  const headers = {
    "Content-Type": "application/json",
    "Accept-Language": getActiveLocale(),
    "X-LRM-Locale": getActiveLocale(),
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...requestOptions, signal: controller.signal, headers });
    const isJson = response.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const error = body?.error || {};
      if (response.status === 401 && !["/auth/login", "/auth/register"].includes(path)) {
        clearSession();
        window.dispatchEvent(new CustomEvent("lrm:session-invalid"));
      }
      const key = error.messageKey || `api.${error.code || "API_REQUEST_FAILED"}`;
      const message = hasMessage(key) ? key : "api.API_REQUEST_FAILED";
      throw new ApiError(message, response.status, error.details, error.code);
    }
    return body;
  } catch (error) {
    if (externalSignal?.aborted) throw externalSignal.reason || error;
    if (controller.signal.aborted) throw new ApiError("api.REQUEST_TIMEOUT", 0, undefined, "REQUEST_TIMEOUT");
    if (error instanceof ApiError || error.name === "AbortError") throw error;
    throw new ApiError("api.NETWORK_UNAVAILABLE", 0, undefined, "NETWORK_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", cancel);
  }
}

export function storeAuthResult(result) {
  localStorage.setItem("lrm_token", result.accessToken);
  localStorage.setItem("lrm_user", JSON.stringify(result.user));
  return result;
}

export async function login(email, password) {
  const result = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return storeAuthResult(result);
}

export async function register(userData) {
  const result = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData)
  });
  return storeAuthResult(result);
}

export async function logout() {
  try {
    if (localStorage.getItem("lrm_token")) {
      await apiRequest("/auth/logout", { method: "POST" });
    }
  } finally {
    clearSession();
  }
}

export async function getCurrentUser() {
  return apiRequest("/auth/me");
}

export function hasStoredSession() {
  return Boolean(localStorage.getItem("lrm_token"));
}

export function clearSession() {
  localStorage.removeItem("lrm_token");
  localStorage.removeItem("lrm_user");
}

export function getStoredUser() {
  const raw = localStorage.getItem("lrm_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}
