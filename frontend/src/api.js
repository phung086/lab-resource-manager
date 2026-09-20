const configuredApiBase = import.meta.env.VITE_API_BASE_URL || `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:8000`;
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
  const token = localStorage.getItem("lrm_token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const error = body?.error || {};
    if (response.status === 401 && !["/auth/login", "/auth/register"].includes(path)) {
      clearSession();
      window.dispatchEvent(new CustomEvent("lrm:session-invalid"));
    }
    throw new ApiError(error.message || "API request failed", response.status, error.details, error.code);
  }

  return body;
}

export async function login(email, password) {
  const result = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  localStorage.setItem("lrm_token", result.accessToken);
  localStorage.setItem("lrm_user", JSON.stringify(result.user));
  return result;
}

export async function register(userData) {
  const result = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData)
  });
  localStorage.setItem("lrm_token", result.accessToken);
  localStorage.setItem("lrm_user", JSON.stringify(result.user));
  return result;
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
