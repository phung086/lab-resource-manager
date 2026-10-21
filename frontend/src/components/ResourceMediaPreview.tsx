import { useLocale } from '../providers/LocaleProvider';
import React, { useEffect, useRef, useState } from "react";
import { ImageOff, Play } from "lucide-react";
import { resourceImageProps } from '../utils/resourceImage';

/** Mount with the media URL as key so a replacement asset gets a fresh load state. */
export function ResourceMediaPreview({ kind, url, alt, size = 'detail' }: { kind: "IMAGE" | "VIDEO"; url: string; alt: string; size?: 'card' | 'detail' }) {
  const { tr, t } = useLocale();
  const [failed, setFailed] = useState(false);
  const [requested, setRequested] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !requested) return;
    const pauseHidden = () => { if (document.hidden) video.pause(); };
    const observer = new IntersectionObserver(([entry]) => { if (!entry?.isIntersecting) video.pause(); }, { threshold: 0.01 });
    observer.observe(video);
    document.addEventListener('visibilitychange', pauseHidden);
    // Called after the explicit play action mounts the source. No automatic retry.
    void video.play().catch(error => { if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') setFailed(true); });
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', pauseHidden); video.pause(); };
  }, [requested]);
  if (failed) return (
    <span className="catalog-media-failure" role="status">
      <ImageOff size={28} aria-hidden="true" />
      <span>{kind === "VIDEO" ? t("ui.video_could_not_be_loaded_cbca53b9") : t("ui.image_could_not_be_loaded_3ca5ed64")}: {alt}.</span>
      <small>{tr("ui.resource_details_and_access_requirements_cc96de10")}</small>
    </span>
  );
  return kind === "VIDEO"
    ? requested ? <video ref={videoRef} controls playsInline preload="none" src={url} aria-label={alt} onError={() => setFailed(true)} />
      : <button type="button" className="resource-video-start" onClick={() => setRequested(true)}><Play size={32} aria-hidden="true" /><strong>{tr('ui.media.playVideo')}</strong><span>{alt}</span><small>{tr('ui.media.videoOnDemand')}</small></button>
    : <img {...resourceImageProps(url, size)} alt={alt} onError={() => setFailed(true)} />;
}
