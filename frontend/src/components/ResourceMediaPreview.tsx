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
      <span>{kind === "VIDEO" ? t("ui.video_could_not_be_loaded_cbca53b9") : t("ui.image_could_not_be_loaded_3ca5ed64")}: {alt}.</span>
      <small>{tr("ui.resource_details_and_access_requirements_cc96de10")}</small>
    </span>
  );
  return kind === "VIDEO"
    ? <video controls playsInline preload="metadata" src={url} aria-label={alt} onError={() => setFailed(true)} />
    : <img src={url} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
