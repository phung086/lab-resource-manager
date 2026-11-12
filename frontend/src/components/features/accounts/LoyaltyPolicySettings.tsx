import React, { useEffect, useId, useRef, useState } from 'react';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import { validateLoyaltyPolicy } from '../../../utils/loyaltyPolicyValidation.js';
import '../../../styles/loyalty-account.css';

type Policy = { enabled: boolean; plusThreshold: number; priorityThreshold: number; plusDiscountBps: number; priorityDiscountBps: number; version: number };
export function LoyaltyPolicySettings() {
  const { tr } = useLocale(), id = useId(), formRef = useRef<HTMLFormElement>(null), busyRef = useRef(false);
  const [open, setOpen] = useState(false), [policy, setPolicy] = useState<Policy | null>(null), [loading, setLoading] = useState(false), [retry, setRetry] = useState(0);
  const [draft, setDraft] = useState({ enabled: false, plusThreshold: '', priorityThreshold: '', plusPercent: '', priorityPercent: '' });
  const [errors, setErrors] = useState<Record<string,string>>({}), [error, setError] = useState(''), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!open || policy) return;
    const controller = new AbortController(); setLoading(true); setError('');
    apiRequest('/loyalty/policy', { signal: controller.signal }).then((result: Policy) => {
      if (controller.signal.aborted) return;
      setPolicy(result); setDraft({ enabled: result.enabled, plusThreshold: String(result.plusThreshold), priorityThreshold: String(result.priorityThreshold), plusPercent: String(result.plusDiscountBps / 100), priorityPercent: String(result.priorityDiscountBps / 100) });
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'ui.users.requestFailed'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, policy, retry]);
  const focus = (name: string) => formRef.current?.querySelector<HTMLElement>('[name="' + name + '"]')?.focus();
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!policy || busyRef.current) return;
    const checked = validateLoyaltyPolicy(draft, policy.version); setErrors(checked.errors); setError(''); setSaved(false);
    if (!checked.data) { focus(Object.keys(checked.errors)[0]); return; }
    busyRef.current = true; setBusy(true);
    try { const result = await apiRequest('/loyalty/policy', { method: 'PUT', body: JSON.stringify(checked.data) }); setPolicy(result); setSaved(true); }
    catch (cause: unknown) { setError((cause as { code?: string }).code === 'LOYALTY_POLICY_CHANGED' ? 'account.loyalty.policyConflict' : cause instanceof Error ? cause.message : 'ui.users.requestFailed'); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <details className="loyalty-policy" onToggle={event => setOpen(event.currentTarget.open)}><summary>{tr('account.loyalty.policyTitle')}</summary>
    <p>{tr('account.loyalty.policyHint')}</p>
    {loading && <p role="status">{tr('ui.loading_data_84c68bd5')}</p>}
    {error && <div className="users-error" role="alert">{tr(error)}<button type="button" className="btn btn-secondary" disabled={busy} onClick={() => { setPolicy(null); setRetry(value => value + 1); }}>{tr('account.loyalty.reloadPolicy')}</button></div>}
    {policy && <form ref={formRef} onSubmit={save} noValidate>
      {saved && <p className="users-notice" role="status">{tr('account.loyalty.policySaved')}</p>}
      {Object.keys(errors).length > 0 && <div className="users-error" role="alert"><strong>{tr('ui.account.checkFields')}</strong><ul>{Object.entries(errors).map(([field,key]) => <li key={field}><a href={'#' + id + '-' + field} onClick={event => { event.preventDefault(); focus(field); }}>{tr(key)}</a></li>)}</ul></div>}
      <fieldset disabled={busy}><label className="loyalty-policy-enabled" htmlFor={id + '-enabled'}><input id={id + '-enabled'} type="checkbox" checked={draft.enabled} onChange={event => { setDraft(current => ({ ...current, enabled: event.target.checked })); setSaved(false); }} />{tr('account.loyalty.enable')}</label>
        <div className="users-form">{[{name:'plusThreshold' as const,label:'account.loyalty.plusThreshold',step:1,min:1},{name:'priorityThreshold' as const,label:'account.loyalty.priorityThreshold',step:1,min:1},{name:'plusPercent' as const,label:'account.loyalty.plusDiscount',step:0.01,min:0},{name:'priorityPercent' as const,label:'account.loyalty.priorityDiscount',step:0.01,min:0}].map(field => <label key={field.name} htmlFor={id + '-' + field.name}>{tr(field.label)}<input id={id + '-' + field.name} name={field.name} type="number" min={field.min} max={field.name.endsWith('Percent') ? 50 : 2000000000} step={field.step} value={draft[field.name]} required aria-invalid={!!errors[field.name]} aria-describedby={errors[field.name] ? id + '-error-' + field.name : undefined} onChange={event => { setDraft(current => ({ ...current, [field.name]: event.target.value })); setErrors(current => { const next = { ...current }; delete next[field.name]; return next; }); setSaved(false); }} />{errors[field.name] && <span id={id + '-error-' + field.name} className="users-field-error">{tr(errors[field.name])}</span>}</label>)}</div>
        <button type="submit" className="btn btn-primary">{tr(busy ? 'ui.users.saving' : 'account.loyalty.savePolicy')}</button>
      </fieldset>
    </form>}
  </details>;
}
