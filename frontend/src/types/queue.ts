export interface QueuePagination { page: number; pageSize: number; total: number; totalPages: number }
export interface BookingQueueSummary { total: number; byStatus: Record<string, number>; history: number; overdue: number; asOf: string }
export interface IncidentQueueSummary { total: number; open: number; resolved: number; byStatus: Record<string, number> }
export interface QueuePage<T, S> { items: T[]; pagination: QueuePagination; summary: S }
