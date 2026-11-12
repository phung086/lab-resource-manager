import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import type { QueuePage } from "../types/queue";

export function useQueuePage<T, S>(path: string, filter: string, actorKey: string, pageSize = 20, recordId?: string | null) {
  const key = `${path}:${filter}:${actorKey}:${pageSize}:${recordId || ""}`;
  const [position, setPosition] = useState({ key, page: 1 });
  const [{ revision, quiet }, setRefresh] = useState({ revision: 0, quiet: false });
  const refresh = useCallback(() => setRefresh(previous => ({ revision: previous.revision + 1, quiet: false })), []);
  const refreshQuietly = useCallback(() => setRefresh(previous => ({ revision: previous.revision + 1, quiet: true })), []);
  const page = position.key === key ? position.page : 1;
  // Reset stored position as well, so returning to an earlier filter starts at page one.
  if (position.key !== key) setPosition({ key, page: 1 });
  const pageKey = `${key}:${page}`;
  const requestKey = `${pageKey}:${revision}`;
  const [state, setState] = useState<{ key: string; scopeKey?: string; data?: QueuePage<T, S>; error?: string }>({ key: "" });
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), filter });
    const load = async () => {
      try {
        const [data, record] = await Promise.all([
          apiRequest(`${path}?${query}`, { signal: controller.signal }) as Promise<QueuePage<T, S>>,
          recordId ? apiRequest(`${path}/${encodeURIComponent(recordId)}`, { signal: controller.signal }) as Promise<T> : Promise.resolve(undefined)
        ]);
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, data.pagination.totalPages);
        if (!recordId && page > lastPage) { setPosition({ key, page: lastPage }); return; }
        setState({ key: requestKey, scopeKey: key, data: record ? { ...data, items: [record] } : data });
      } catch (error: unknown) {
        if (!controller.signal.aborted) setState({ key: requestKey, error: error instanceof Error ? error.message : "api.API_REQUEST_FAILED" });
      }
    };
    // Strict Mode immediately cleans up its first effect; skip that cancelled read.
    queueMicrotask(() => { if (!controller.signal.aborted) void load(); });
    return () => controller.abort();
  }, [path, filter, actorKey, pageSize, recordId, key, page, requestKey]);
  const current = state.key === requestKey || (quiet && state.key.startsWith(`${pageKey}:`) && state.data) ? state : undefined;
  return {
    data: current?.data, items: current?.data?.items || [],
    pagination: current?.data?.pagination || (!current && state.scopeKey === key ? state.data?.pagination : undefined),
    loading: !current, error: current?.error || "", page,
    setPage: (value: number) => setPosition({ key, page: value }),
    refresh, refreshQuietly
  };
}
