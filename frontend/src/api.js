import { getActiveLocale, hasMessage } from "./i18n.js";
import { getAccessToken, getAuthUser, removeAuth, saveAuth } from './services/authStorage.js';

function resolveApiBase() {
  const configured = import.meta.env?.VITE_API_BASE_URL;
  const hostname = typeof window === "undefined" ? "localhost" : window.location.hostname;
  if (!configured) return `http://${hostname}:8000`;
  // The local launcher uses localhost. Match the page's loopback hostname so
  // browser requests keep same-site authentication cookies on either local URL.
  const loopback = ["localhost", "127.0.0.1"];
  if (import.meta.env?.DEV && loopback.includes(hostname) && /^https?:\/\//i.test(configured)) {
    const url = new URL(configured);
    if (loopback.includes(url.hostname) && url.protocol === window.location.protocol) {
      url.hostname = hostname;
      return url.href;
    }
  }
  return configured;
}
const configuredApiBase = resolveApiBase();
const API_BASE_URL = `${configuredApiBase.replace(/\/$/, "")}${/\/api$/.test(configuredApiBase) ? "" : "/api"}`;

export class ApiError extends Error {
  constructor(message, status, details, code) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

const rateCooldowns = new Map();
const rateBucket = path => /^\/(support|assistant\/bridge)(\/|$)/.test(path) ? "support" : /^\/(telemetry|resource-care)(\/|$)/.test(path) ? "monitoring" : "api";
export function getApiCooldownUntil() {
  return Math.max(0, ...rateCooldowns.values());
}

export async function apiRequest(path, options = {}) {
  const bucket = rateBucket(path);
  const until = rateCooldowns.get(bucket) || 0;
  if (until > Date.now()) throw new ApiError("api.RATE_LIMITED", 429, { retryAfterSeconds: Math.ceil((until - Date.now()) / 1000) }, "RATE_LIMITED");
  const { signal: externalSignal, timeoutMs = path === "/assistant/chat" ? 65000 : 30000, ...requestOptions } = options;
  const controller = new AbortController();
  const cancel = () => controller.abort(externalSignal.reason);
  if (externalSignal?.aborted) cancel();
  else externalSignal?.addEventListener("abort", cancel, { once: true });
  const milliseconds = Number.isFinite(timeoutMs) ? Math.max(1, Math.min(timeoutMs, 120000)) : 30000;
  const timer = setTimeout(() => controller.abort(), milliseconds);
  const token = getAccessToken();
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
      if (response.status === 429 && error.code === "RATE_LIMITED") {
        const retry = Number(response.headers.get("Retry-After") || error.details?.retryAfterSeconds || 60);
        const seconds = Number.isFinite(retry) ? Math.max(1, Math.min(retry, 3600)) : 60;
        rateCooldowns.set(bucket, Date.now() + seconds * 1000);
        error.details = { ...error.details, retryAfterSeconds: seconds };
        window.dispatchEvent(new CustomEvent("lrm:rate-limited"));
      }
      if (response.status === 401 && !["/auth/login", "/auth/register", "/auth/google"].includes(path) &&
          token === getAccessToken()) {
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
  saveAuth(result);
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
    if (getAccessToken()) {
      await apiRequest("/auth/logout", { method: "POST", timeoutMs: 5000 });
    }
  } finally {
    clearSession();
  }
}

export async function getCurrentUser() {
  return apiRequest("/auth/me");
}

export function hasStoredSession() {
  return Boolean(getAccessToken());
}

export function clearSession() {
  removeAuth();
  window.dispatchEvent(new CustomEvent('lrm:session-changed'));
}

export function getStoredUser() {
  const raw = getAuthUser();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}
