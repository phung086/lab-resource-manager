import React, { useEffect, useState } from 'react';
import { Image, Images, Play, RefreshCw } from 'lucide-react';
import { apiRequest } from '../api.js';
import { useLocale } from '../providers/LocaleProvider';
import { ResourceMediaPreview } from './ResourceMediaPreview';
import '../styles/resource-media.css';
export type ResourceMedia = { id: string; kind: 'IMAGE' | 'VIDEO'; url: string; altText: string; title: string; sourceUrl?: string; credit?: string; license?: string };

// The detail endpoint already includes media. Fetch only when no projection was supplied.
// Key this component by resource ID to reset selection when changing equipment.
export function ResourceGallery({ resourceId, initialItems }: { resourceId: string; initialItems?: ResourceMedia[] }) {
  const { t } = useLocale();
  const [loadedItems, setLoadedItems] = useState<ResourceMedia[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(initialItems === undefined);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (initialItems !== undefined) return;
    const controller = new AbortController();
    setLoading(true); setFailed(false);
    apiRequest(`/resources/${encodeURIComponent(resourceId)}/media`, { signal: controller.signal })
      .then((rows: ResourceMedia[]) => { if (!controller.signal.aborted) setLoadedItems(rows); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [resourceId, initialItems, retry]);
  const items = initialItems ?? loadedItems;
  const item = items.find(row => row.id === selectedId) || items[0];
  const selectedIndex = item ? items.indexOf(item) : 0;
  return <section className="lab-resource-gallery" aria-label={t('Ảnh và video tài nguyên', 'Resource images and videos')}>
    <div className="lab-gallery-heading"><span><Images size={18} aria-hidden="true" />{t('Khám phá thiết bị', 'Explore this resource')}</span>{items.length > 0 && <small>{selectedIndex + 1} / {items.length}</small>}</div>
    {initialItems === undefined && loading ? <div className="lab-gallery-empty" role="status">{t('Đang tải tư liệu…', 'Loading media…')}</div>
      : failed && initialItems === undefined ? <div className="lab-gallery-empty" role="alert"><p>{t('Không tải được ảnh và video.', 'Images and videos could not be loaded.')}</p><button className="secondary-button" onClick={() => setRetry(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />{t('Thử lại', 'Retry')}</button></div>
      : !item ? <div className="lab-gallery-empty"><Images size={36} aria-hidden="true" /><p>{t('Chưa có ảnh hoặc video của tài nguyên này.', 'No images or videos for this resource yet.')}</p></div>
      : <>
        <figure>
          <ResourceMediaPreview key={`${item.kind}:${item.url}`} kind={item.kind} url={item.url} alt={item.altText || item.title} />
          <figcaption><strong>{item.title}</strong><span>{item.sourceUrl ? t('Tư liệu tham khảo có ghi nguồn', 'Attributed reference media') : t('Tư liệu do đơn vị quản lý cung cấp', 'Media supplied by the managing unit')}</span>{item.credit && <span>{item.credit}{item.license ? ` · ${item.license}` : ''}</span>}{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{t('Xem nguồn', 'View source')}</a>}</figcaption>
        </figure>
        {items.length > 1 && <div className="lab-gallery-choices" role="group" aria-label={t('Chọn ảnh hoặc video', 'Choose an image or video')}>{items.map(row => <button key={row.id} type="button" aria-pressed={item.id === row.id} onClick={() => setSelectedId(row.id)}>{row.kind === 'VIDEO' ? <Play size={18} aria-hidden="true" /> : <Image size={18} aria-hidden="true" />}<span><small>{row.kind === 'VIDEO' ? 'Video' : t('Ảnh', 'Image')}</small>{row.title}</span></button>)}</div>}
      </>}
  </section>;
}
