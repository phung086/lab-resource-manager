import { useLocale } from '../providers/LocaleProvider';
import React, { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import "../styles/resource-media.css";

type Resource = { id: string; code: string; name: string };
type Media = { id: string; title: string; kind: string; url: string; credit?: string };
export function ResourceMediaEditor({ resources }: { resources: Resource[] }) {
  const { tr } = useLocale();
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
  const [configuration, setConfiguration] = useState<{ uploadConfigured: boolean; externalHosts: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [removeId, setRemoveId] = useState('');
  useEffect(() => {
    let active = true; setItems([]); setError(''); setNotice(''); setConfiguration(null); setRemoveId('');
    setFile(null); setTitle(''); setAltText(''); setExternalUrl(''); setSourceUrl('');
    if (!resourceId) return;
    setLoading(true);
    Promise.all([apiRequest(`/resources/${resourceId}/media`), apiRequest(`/resources/${resourceId}/media/config`)])
      .then(([rows, config]) => { if (active) { setItems(rows); setConfiguration(config); if (!config.uploadConfigured) setMode('external'); } })
      .catch((cause: Error) => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [resourceId]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!resourceId || busy || loading) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const details = { kind, title, altText, credit, license, sortOrder: items.length };
      if (mode === "upload") {
        if (!file) throw new Error(tr("Chọn ảnh hoặc video để tải lên."));
        const ticket = await apiRequest(`/resources/${resourceId}/media/upload`, { method: "POST", body: JSON.stringify({ contentType: file.type, size: file.size }) });
        const response = await fetch(ticket.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!response.ok) throw new Error(tr("Tải lên kho media thất bại. Kiểm tra CORS của bucket R2/S3 và thử lại."));
        await apiRequest(`/resources/${resourceId}/media/complete`, { method: "POST", body: JSON.stringify({ ...details, key: ticket.key }) });
      } else {
        await apiRequest(`/resources/${resourceId}/media/external`, { method: "POST", body: JSON.stringify({ ...details, url: externalUrl, sourceUrl }) });
      }
      setItems(await apiRequest(`/resources/${resourceId}/media`));
      setFile(null); setTitle(""); setAltText(""); setExternalUrl(""); setSourceUrl("");
      setNotice(tr("Đã lưu tư liệu. Trang công khai sẽ hiển thị nguồn và nhãn minh họa."));
    } catch (cause: any) { setError(cause.message || tr("Không lưu được tư liệu.")); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (busy) return;
    setError(""); setBusy(true);
    try { await apiRequest(`/resources/${resourceId}/media/${id}`, { method: "DELETE" }); setItems(rows => rows.filter(row => row.id !== id)); setRemoveId(''); }
    catch (cause: any) { setError(cause.message || tr("Không gỡ được tư liệu.")); }
    finally { setBusy(false); }
  }
  return <details className="panel resource-media-editor"><summary>{tr("Ảnh & video của tài nguyên")}</summary>
    <p>{tr("Thêm ảnh tổng thể, ảnh nhãn thiết bị hoặc video hướng dẫn. Chỉ sử dụng tư liệu được phép công bố; ghi rõ nguồn và giấy phép khi dùng ảnh tham khảo.")}</p>
    <label>{tr("Tài nguyên")}<select disabled={busy} value={resourceId} onChange={event => setResourceId(event.target.value)}><option value="">{tr("Chọn tài nguyên")}</option>{resources.map(row => <option key={row.id} value={row.id}>{row.code} — {row.name}</option>)}</select></label>
    {loading && <p role="status">{tr("Đang tải tư liệu và kiểm tra khả năng tải tệp…")}</p>}
    {configuration && !configuration.uploadConfigured && <p role="status">{tr("Kho tải tệp chưa được kết nối. Hiện có thể thêm tư liệu HTTPS từ:")}{configuration.externalHosts.join(', ')}{tr(". Liên hệ quản trị viên để kết nối kho ảnh/video của đơn vị.")}</p>}
    {error && <p className="alert danger" role="alert">{error}</p>}{notice && <p className="alert success" role="status">{notice}</p>}
    {resourceId && !loading && <><div className="resource-media-list">{items.map(item => <div key={item.id}><span>{item.kind === "VIDEO" ? "Video" : tr("Ảnh")} · {item.title}{item.credit && ` · ${item.credit}`}</span>{removeId === item.id ? <><span>{tr("Gỡ tư liệu này khỏi tài nguyên?")}</span><button type="button" disabled={busy} onClick={() => void remove(item.id)}>{tr("Xác nhận gỡ")}</button><button type="button" disabled={busy} onClick={() => setRemoveId('')}>{tr("Giữ lại")}</button></> : <button type="button" disabled={busy} onClick={() => setRemoveId(item.id)}>{tr("Gỡ")}{item.title}</button>}</div>)}</div>
      <form className="resource-media-form" onSubmit={save}>
        <fieldset disabled={busy}><legend>{tr("Cách thêm tư liệu")}</legend><label><input type="radio" disabled={!configuration?.uploadConfigured} checked={mode === "upload"} onChange={() => setMode("upload")} /> {tr("Tải ảnh/video của đơn vị")}</label><label><input type="radio" checked={mode === "external"} onChange={() => setMode("external")} /> {tr("Liên kết tư liệu có nguồn")}</label></fieldset>
        <label>{tr("Loại")}<select value={kind} onChange={event => setKind(event.target.value)}><option value="IMAGE">{tr("Ảnh")}</option><option value="VIDEO">Video</option></select></label>
        {mode === "upload" ? <label>{tr("Tệp")}{kind === "IMAGE" ? tr("ảnh (JPEG/PNG/WebP, tối đa 10 MB)") : tr("video (MP4/WebM, tối đa 100 MB)")}<input type="file" accept={kind === "IMAGE" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/webm"} onChange={event => setFile(event.target.files?.[0] || null)} required /></label>
          : <><label>{tr("URL ảnh/video HTTPS")}<input type="url" required value={externalUrl} onChange={event => setExternalUrl(event.target.value)} placeholder="https://upload.wikimedia.org/..." /></label><label>{tr("Trang nguồn")}<input type="url" required value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} /></label></>}
        <label>{tr("Tiêu đề")}<input required minLength={2} maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label>{tr("Mô tả ảnh/video cho trợ năng")}<input required minLength={3} maxLength={300} value={altText} onChange={event => setAltText(event.target.value)} /></label>
        <label>{tr("Tác giả / nguồn ghi công")}<input required={mode === "external"} value={credit} onChange={event => setCredit(event.target.value)} /></label>
        <label>{tr("Giấy phép")}<input required={mode === "external"} value={license} onChange={event => setLicense(event.target.value)} placeholder="CC BY 4.0 / CC BY-SA 4.0 / Public domain" /></label>
        <button className="primary-button" disabled={busy}>{busy ? tr("Đang lưu…") : tr("Thêm tư liệu")}</button>
      </form></>}
  </details>;
}
