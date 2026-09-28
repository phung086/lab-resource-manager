import React, { useState } from "react";
import { ImageOff } from "lucide-react";

/** Mount with the media URL as key so a replacement asset gets a fresh load state. */
export function ResourceMediaPreview({ kind, url, alt }: { kind: "IMAGE" | "VIDEO"; url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return (
    <span className="catalog-media-failure" role="status">
      <ImageOff size={28} aria-hidden="true" />
      <span>Không tải được {kind === "VIDEO" ? "video" : "ảnh"}: {alt}.</span>
      <small>Bạn vẫn có thể xem thông tin và điều kiện sử dụng.</small>
    </span>
  );
  return kind === "VIDEO"
    ? <video controls playsInline preload="metadata" src={url} aria-label={alt} onError={() => setFailed(true)} />
    : <img src={url} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
