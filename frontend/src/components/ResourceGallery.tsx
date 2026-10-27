import { ResourceCategoryArt } from "./ResourceCategoryArt";
import { resourceImageProps } from "../utils/resourceImage";
import React, { useEffect, useState } from 'react';
import { Image, Images, Play, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiRequest } from '../api.js';
import { useLocale } from '../providers/LocaleProvider';
import { ResourceMediaPreview } from './ResourceMediaPreview';
import '../styles/resource-media.css';
export type ResourceMedia = { id: string; kind: 'IMAGE' | 'VIDEO'; url: string; altText: string; title: string; sourceUrl?: string; credit?: string; license?: string };

// The detail endpoint already includes media. Fetch only when no projection was supplied.
// Key this component by resource ID to reset selection when changing equipment.
export function ResourceGallery({ resourceId, initialItems, category, studio = false }: { resourceId: string; initialItems?: ResourceMedia[]; category?: string; studio?: boolean }) {
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
  return <section className="lab-resource-gallery" aria-label={t("ui.resource_images_and_videos_e4cf9212")}>
    <div className="lab-gallery-heading"><span><Images size={18} aria-hidden="true" />{t("ui.resourceDiscovery.media")}</span>{items.length > 0 && <small>{selectedIndex + 1} / {items.length}</small>}</div>
    {initialItems === undefined && loading ? <div className="lab-gallery-empty" role="status">{t("ui.loading_media_f6e94cb1")}</div>
      : failed && initialItems === undefined ? <div className="lab-gallery-empty" role="alert"><p>{t("ui.images_and_videos_could_not_ca30476d")}</p><button className="secondary-button" onClick={() => setRetry(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />{t("ui.retry_c58d068c")}</button></div>
      : !item ? <div className="lab-gallery-empty">{studio ? <ResourceCategoryArt category={category} /> : <Images size={36} aria-hidden="true" />}<p>{t("ui.no_images_or_videos_for_c49c7b69")}</p></div>
      : <>
        <figure key={item.id} className="gallery-frame">
          <ResourceMediaPreview key={`${item.kind}:${item.url}`} kind={item.kind} url={item.url} alt={item.altText || item.title} />
          {(item.credit || item.sourceUrl) && <figcaption><details><summary>{t("ui.rental.imageCredit")}</summary>{item.credit && <span>{item.credit}{item.license ? ` · ${item.license}` : ''}</span>}{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{t("ui.view_source_c593dcfc")}</a>}</details></figcaption>}
        </figure>
        {studio && items.length > 1 && <div className="gallery-stepper"><button type="button" aria-label={t("ui.experience.previousImage")} onClick={() => setSelectedId(items[(selectedIndex - 1 + items.length) % items.length].id)}><ChevronLeft size={20} /></button><span aria-live="polite">{selectedIndex + 1} / {items.length}</span><button type="button" aria-label={t("ui.experience.nextImage")} onClick={() => setSelectedId(items[(selectedIndex + 1) % items.length].id)}><ChevronRight size={20} /></button></div>}
        {items.length > 1 && <div className="lab-gallery-choices" role="group" aria-label={t("ui.choose_an_image_or_video_09ba2fa8")}>{items.map(row => <button key={row.id} type="button" aria-pressed={item.id === row.id} onClick={() => setSelectedId(row.id)}>{studio && row.kind === 'IMAGE' && <img {...resourceImageProps(row.url, 'card')} alt="" onError={event => { event.currentTarget.hidden = true; }} />}{row.kind === 'VIDEO' ? <Play size={18} aria-hidden="true" /> : <Image size={18} aria-hidden="true" />}<span><small>{row.kind === 'VIDEO' ? 'Video' : t("ui.image_20a36f62")}</small>{row.title}</span></button>)}</div>}
      </>}
  </section>;
}
