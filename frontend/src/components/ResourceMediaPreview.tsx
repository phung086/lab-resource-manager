import { useLocale } from '../providers/LocaleProvider';
import React, { useState } from "react";
import { ImageOff } from "lucide-react";

/** Mount with the media URL as key so a replacement asset gets a fresh load state. */
export function ResourceMediaPreview({ kind, url, alt }: { kind: "IMAGE" | "VIDEO"; url: string; alt: string }) {
  const { tr, t } = useLocale();
  const [failed, setFailed] = useState(false);
  if (failed) return (
    <span className="catalog-media-failure" role="status">
      <ImageOff size={28} aria-hidden="true" />
      <span>{kind === "VIDEO" ? t("Không tải được video", "Video could not be loaded") : t("Không tải được ảnh", "Image could not be loaded")}: {alt}.</span>
      <small>{tr("Bạn vẫn có thể xem thông tin và điều kiện sử dụng.")}</small>
    </span>
  );
  return kind === "VIDEO"
    ? <video controls playsInline preload="metadata" src={url} aria-label={alt} onError={() => setFailed(true)} />
    : <img src={url} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
