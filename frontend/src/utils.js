export function formatDateTime(value, localeCode = "vi-VN") {
  if (!value) return "-";
  return new Intl.DateTimeFormat(localeCode, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatPercent(value) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value)}%`;
}

export function clampPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 0;
  return Math.min(100, Math.max(0, Number(value)));
}

export function toInputDateTime(value) {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function classNames(...items) {
  return items.filter(Boolean).join(" ");
}
