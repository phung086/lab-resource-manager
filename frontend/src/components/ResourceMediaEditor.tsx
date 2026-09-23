import React, { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import "../styles/resource-media.css";

type Resource = { id: string; code: string; name: string };
type Media = { id: string; title: string; kind: string; url: string; credit?: string };
export function ResourceMediaEditor({ resources }: { resources: Resource[] }) {
  const [resourceId, setResourceId] = useState("");
  const [items, setItems] = useState<Media[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState("IMAGE");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [credit, setCredit] = useState("");
  const [license, setLicense] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [mode, setMode] = useState<"upload" | "external">("upload");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!resourceId) { setItems([]); return; } apiRequest(`/resources/${resourceId}/media`).then(setItems).catch((cause: Error) => setError(cause.message)); }, [resourceId]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!resourceId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const details = { kind, title, altText, credit, license, sortOrder: items.length };
      if (mode === "upload") {
        if (!file) throw new Error("Chọn ảnh hoặc video để tải lên.");
        const ticket = await apiRequest(`/resources/${resourceId}/media/upload`, { method: "POST", body: JSON.stringify({ contentType: file.type, size: file.size }) });
        const response = await fetch(ticket.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!response.ok) throw new Error("Tải lên kho media thất bại. Kiểm tra CORS của bucket R2/S3 và thử lại.");
        await apiRequest(`/resources/${resourceId}/media/complete`, { method: "POST", body: JSON.stringify({ ...details, key: ticket.key }) });
      } else {
        await apiRequest(`/resources/${resourceId}/media/external`, { method: "POST", body: JSON.stringify({ ...details, url: externalUrl, sourceUrl }) });
      }
      setItems(await apiRequest(`/resources/${resourceId}/media`));
      setFile(null); setTitle(""); setAltText(""); setExternalUrl(""); setSourceUrl("");
      setNotice("Đã lưu tư liệu. Trang công khai sẽ hiển thị nguồn và nhãn minh họa.");
    } catch (cause: any) { setError(cause.message || "Không lưu được tư liệu."); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    setError("");
    try { await apiRequest(`/resources/${resourceId}/media/${id}`, { method: "DELETE" }); setItems(items.filter(row => row.id !== id)); }
    catch (cause: any) { setError(cause.message || "Không gỡ được tư liệu."); }
  }
  return <details className="panel resource-media-editor"><summary>Ảnh & video của tài nguyên</summary>
    <p>Ảnh/video tải lên được lưu ở bucket S3-compatible/R2; database chỉ giữ metadata và URL CDN. Tư liệu bên ngoài phải có nguồn, tác giả và giấy phép.</p>
    <label>Tài nguyên <select value={resourceId} onChange={event => setResourceId(event.target.value)}><option value="">Chọn tài nguyên</option>{resources.map(row => <option key={row.id} value={row.id}>{row.code} — {row.name}</option>)}</select></label>
    {error && <p className="alert danger" role="alert">{error}</p>}{notice && <p className="alert success" role="status">{notice}</p>}
    {resourceId && <><div className="resource-media-list">{items.map(item => <div key={item.id}><span>{item.kind === "VIDEO" ? "Video" : "Ảnh"} · {item.title}{item.credit && ` · ${item.credit}`}</span><button type="button" onClick={() => void remove(item.id)}>Gỡ</button></div>)}</div>
      <form className="resource-media-form" onSubmit={save}>
        <fieldset><legend>Cách thêm tư liệu</legend><label><input type="radio" checked={mode === "upload"} onChange={() => setMode("upload")} /> Tải lên R2/S3</label><label><input type="radio" checked={mode === "external"} onChange={() => setMode("external")} /> URL nguồn mở</label></fieldset>
        <label>Loại <select value={kind} onChange={event => setKind(event.target.value)}><option value="IMAGE">Ảnh</option><option value="VIDEO">Video</option></select></label>
        {mode === "upload" ? <label>Tệp {kind === "IMAGE" ? "ảnh (JPEG/PNG/WebP, tối đa 10 MB)" : "video (MP4/WebM, tối đa 100 MB)"}<input type="file" accept={kind === "IMAGE" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/webm"} onChange={event => setFile(event.target.files?.[0] || null)} required /></label>
          : <><label>URL ảnh/video HTTPS<input type="url" required value={externalUrl} onChange={event => setExternalUrl(event.target.value)} placeholder="https://upload.wikimedia.org/..." /></label><label>Trang nguồn<input type="url" required value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} /></label></>}
        <label>Tiêu đề<input required minLength={2} maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label>Mô tả ảnh/video cho trợ năng<input required minLength={3} maxLength={300} value={altText} onChange={event => setAltText(event.target.value)} /></label>
        <label>Tác giả / nguồn ghi công<input required={mode === "external"} value={credit} onChange={event => setCredit(event.target.value)} /></label>
        <label>Giấy phép<input required={mode === "external"} value={license} onChange={event => setLicense(event.target.value)} placeholder="CC BY 4.0 / CC BY-SA 4.0 / Public domain" /></label>
        <button className="primary-button" disabled={busy}>{busy ? "Đang lưu…" : "Thêm tư liệu"}</button>
      </form></>}
  </details>;
}
