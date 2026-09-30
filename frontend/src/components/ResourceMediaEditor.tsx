import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useEffect, useRef, useState } from "react";
import { apiRequest } from "../api.js";
import "../styles/resource-media.css";

type Resource = { id: string; code: string; name: string };
type Media = { id: string; title: string; kind: string; url: string; credit?: string };
export function ResourceMediaEditor({ resources }: { resources: Resource[] }) {
  const { tr } = useLocale();
  const [resourceId, setResourceId] = useState("");
  const [items, setItems] = useState<Media[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
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
    setFile(null); setTitle(''); setAltText(''); setExternalUrl(''); setSourceUrl(''); setCredit(''); setLicense(''); setKind('IMAGE'); setLoading(false);
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
        if (!file) throw new Error(tr("ui.choose_an_image_or_video_f9742b99"));
        const allowed = kind === "IMAGE" ? ["image/jpeg", "image/png", "image/webp"] : ["video/mp4", "video/webm"];
        const maxBytes = (kind === "IMAGE" ? 10 : 100) * 1024 * 1024;
        if (!allowed.includes(file.type) || file.size < 1 || file.size > maxBytes) throw new Error(tr("ui.invalid_image_video_format_or_d76cd0a3"));
        const ticket = await apiRequest(`/resources/${resourceId}/media/upload`, { method: "POST", body: JSON.stringify({ contentType: file.type, size: file.size }) });
        const response = await fetch(ticket.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!response.ok) throw new Error(tr("ui.upload_failed_ask_your_administrator_352d81a6"));
        await apiRequest(`/resources/${resourceId}/media/complete`, { method: "POST", body: JSON.stringify({ ...details, key: ticket.key }) });
      } else {
        await apiRequest(`/resources/${resourceId}/media/external`, { method: "POST", body: JSON.stringify({ ...details, url: externalUrl, sourceUrl }) });
      }
      setItems(await apiRequest(`/resources/${resourceId}/media`));
      if (fileInput.current) fileInput.current.value = "";
      setFile(null); setTitle(""); setAltText(""); setExternalUrl(""); setSourceUrl("");
      setNotice("ui.media_saved_attribution_is_displayed_8d177098");
    } catch (cause: any) { setError(cause.message || "ui.could_not_save_media_3c861144"); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (busy) return;
    setError(""); setBusy(true);
    try { await apiRequest(`/resources/${resourceId}/media/${id}`, { method: "DELETE" }); setItems(rows => rows.filter(row => row.id !== id)); setRemoveId(''); }
    catch (cause: any) { setError(cause.message || "ui.could_not_remove_media_31a58a0c"); }
    finally { setBusy(false); }
  }
  return <details className="panel resource-media-editor"><summary>{tr("ui.resource_images_videos_cdc27d63")}</summary>
    <p>{tr("ui.add_room_photos_equipment_labels_74a4e05a")}</p>
    <label>{tr("ui.resource_9a35ef53")}<select disabled={busy} value={resourceId} onChange={event => setResourceId(event.target.value)}><option value="">{tr("ui.select_a_resource_8849f4e1")}</option>{resources.map(row => <option key={row.id} value={row.id}>{row.code} — {row.name}</option>)}</select></label>
    {loading && <p role="status">{tr("ui.loading_media_and_checking_upload_2272bb9a")}</p>}
    {configuration && !configuration.uploadConfigured && <p role="status">{tr("ui.upload_storage_is_not_connected_ef3ae86f")}{configuration.externalHosts.join(', ')}{tr("ui.contact_your_administrator_to_connect_e40be433")}</p>}
    {error && <p className="alert danger" role="alert">{translate(error)}</p>}{notice && <p className="alert success" role="status">{translate(notice)}</p>}
    {resourceId && !loading && <><div className="resource-media-list">{items.map(item => <div key={item.id}><span>{item.kind === "VIDEO" ? "Video" : tr("ui.image_20a36f62")} · {item.title}{item.credit && ` · ${item.credit}`}</span>{removeId === item.id ? <><span>{tr("ui.remove_this_media_from_the_62db61d6")}</span><button type="button" disabled={busy} onClick={() => void remove(item.id)}>{tr("ui.confirm_removal_80920dda")}</button><button type="button" disabled={busy} onClick={() => setRemoveId('')}>{tr("ui.keep_3c3ba2db")}</button></> : <button type="button" disabled={busy} onClick={() => setRemoveId(item.id)}>{tr("ui.remove_f3243c30")}{item.title}</button>}</div>)}</div>
      <form onSubmit={save}><fieldset disabled={busy || !configuration} className="resource-media-form resource-edit-fields">
        <fieldset disabled={busy}><legend>{tr("ui.media_source_e4f166d2")}</legend><label><input type="radio" disabled={!configuration?.uploadConfigured} checked={mode === "upload"} onChange={() => setMode("upload")} /> {tr("ui.upload_your_organization_s_media_bb5d0b4e")}</label><label><input type="radio" checked={mode === "external"} onChange={() => setMode("external")} /> {tr("ui.link_attributed_reference_media_1217c819")}</label></fieldset>
        <label>{tr("ui.type_3bfbf923")}<select value={kind} onChange={event => { setKind(event.target.value); setFile(null); }}><option value="IMAGE">{tr("ui.image_20a36f62")}</option><option value="VIDEO">{translate("ui.video_d534be82")}</option></select></label>
        {mode === "upload" ? <label>{tr("ui.file_b3ed274a")}{kind === "IMAGE" ? tr("ui.image_jpeg_png_webp_up_8d798d1f") : tr("ui.video_mp4_webm_up_to_f4efa1f2")}<input key={`${resourceId}:${kind}`} ref={fileInput} type="file" accept={kind === "IMAGE" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/webm"} onChange={event => setFile(event.target.files?.[0] || null)} required /></label>
          : <><label>{tr("ui.https_media_url_1fdd92ea")}<input type="url" required value={externalUrl} onChange={event => setExternalUrl(event.target.value)} placeholder={translate("ui.https_upload_wikimedia_org_c155ed0f")} /></label><label>{tr("ui.source_page_207af498")}<input type="url" required value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} /></label></>}
        <label>{tr("ui.title_df5a0009")}<input required minLength={2} maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label>{tr("ui.accessible_media_description_3bd381eb")}<input required minLength={3} maxLength={300} value={altText} onChange={event => setAltText(event.target.value)} /></label>
        <label>{tr("ui.creator_attribution_a58aeb88")}<input required={mode === "external"} value={credit} onChange={event => setCredit(event.target.value)} /></label>
        <label>{tr("ui.license_b609ade1")}<input required={mode === "external"} value={license} onChange={event => setLicense(event.target.value)} placeholder={translate("ui.cc_by_4_0_cc_0f4ee1ba")} /></label>
        <button className="primary-button" disabled={busy || !configuration}>{busy ? tr("ui.saving_18c4cf71") : tr("ui.add_media_51752c64")}</button>
      </fieldset></form></>}
  </details>;
}
