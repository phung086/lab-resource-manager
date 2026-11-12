export type MediaConnection = EventTarget & { saveData?: boolean; effectiveType?: string };
export function shouldConserveMedia(connection?: Pick<MediaConnection, 'saveData' | 'effectiveType'>) {
  return Boolean(connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType || ''));
}
