import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import { ResourceMediaPreview } from './ResourceMediaPreview';
import '../styles/resource-media.css';
type Media = { id: string; kind: 'IMAGE' | 'VIDEO'; url: string; altText: string; title: string; sourceUrl?: string; credit?: string; license?: string };
export function ResourceGallery({ resourceId, locale = 'vi' }: { resourceId: string; locale?: string }) {
  const [items,setItems] = useState<Media[]>([]), [selected,setSelected] = useState(0), [error,setError] = useState(''), [loading,setLoading] = useState(true), [retry,setRetry] = useState(0);
  const t = useCallback((vi: string,en: string) => locale === 'en' ? en : vi, [locale]);
  useEffect(() => { let active = true; setItems([]); setSelected(0); setError(''); setLoading(true); apiRequest(`/resources/${resourceId}/media`).then((rows: Media[]) => { if (active) setItems(rows); }).catch(() => { if(active) setError(t('Không tải được ảnh và video.', 'Images and videos could not be loaded.')); }).finally(() => { if(active) setLoading(false); }); return () => { active = false; }; }, [resourceId,retry,t]);
  const item = items[selected];
  return <section className="lab-resource-gallery" aria-label={t('Ảnh và video tài nguyên','Resource images and videos')}>
    {loading ? <p role="status">{t('Đang tải tư liệu…','Loading media…')}</p> : error ? <div role="alert"><p>{error}</p><button onClick={() => setRetry(value => value + 1)}>{t('Thử lại','Retry')}</button></div> : !item ? <p>{t('Chưa có ảnh hoặc video của tài nguyên này.','No images or videos for this resource yet.')}</p> : <><figure><ResourceMediaPreview key={item.url} kind={item.kind} url={item.url} alt={item.altText} /><figcaption><strong>{item.title}</strong><span>{item.sourceUrl ? t('Tư liệu tham khảo có ghi nguồn','Attributed reference media') : t('Tư liệu do đơn vị quản lý cung cấp','Media supplied by the managing unit')}</span>{item.credit && <span>{item.credit}{item.license ? ` · ${item.license}` : ''}</span>}{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">{t('Xem nguồn','View source')}</a>}</figcaption></figure>{items.length > 1 && <div className="lab-gallery-choices">{items.map((row,index) => <button key={row.id} type="button" className="secondary-button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{row.kind === 'VIDEO' ? 'Video' : t('Ảnh','Image')} {index+1} · {row.title}</button>)}</div>}</>}
  </section>;
}
