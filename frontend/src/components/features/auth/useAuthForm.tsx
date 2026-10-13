import React, { useEffect, useRef, useState } from 'react';
import { type LocaleMessage } from '../../../providers/LocaleProvider';
import { authFailure, serverAuthFields, validateAuth } from './authValidation.js';
import '../../../styles/auth-feedback.css';

type Errors = Record<string, LocaleMessage>;
// In-memory only: passwords never enter persistent browser storage.
const drafts = new Map<string, Record<string, unknown>>();
const savedFeedback = new Map<string, { errors: Errors; summary: LocaleMessage }>();
export function useAuthDraft<T>(mode: string, initial: T) {
  const [draft, setDraft] = useState<T>(() => (drafts.get(mode) as T) || initial);
  const update = (value: T) => { drafts.set(mode, value as Record<string, unknown>); setDraft(value); };
  return [draft, update, () => { drafts.clear(); savedFeedback.clear(); }] as const;
}
export function useAuthForm(mode: 'login' | 'register', values: Record<string, unknown>, ids: Record<string, string>) {
  const [errors, setErrors] = useState<Errors>(() => savedFeedback.get(mode)?.errors || {});
  const [summary, setSummary] = useState<LocaleMessage>(() => savedFeedback.get(mode)?.summary || '');
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const focusTarget = useRef<string | null>(null);
  const focusRequested = useRef(false);
  const busy = useRef(false);
  useEffect(() => {
    savedFeedback.set(mode, { errors, summary });
    if (!focusRequested.current) return;
    focusRequested.current = false;
    if (focusTarget.current) {
      const id = ids[focusTarget.current];
      const element = formRef.current?.querySelector<HTMLInputElement>(`[id="${id}"]`);
      if (element && !element.disabled) element.focus();
      else summaryRef.current?.focus();
      focusTarget.current = null;
    } else if (summary) summaryRef.current?.focus();
  }, [errors, summary, ids, mode]);
  const check = (submittedValues = values) => {
    const next = validateAuth(submittedValues, mode);
    setErrors(next);
    const first = Object.keys(ids).find(field => next[field]);
    setSummary(first ? 'ui.auth_fix_fields' : '');
    focusTarget.current = first || null;
    focusRequested.current = Boolean(first);
    return !first;
  };
  const feedback = (event: React.FocusEvent<HTMLFormElement> | React.FormEvent<HTMLFormElement>) => {
    // A blur must not move a button between pointer-down and pointer-up.
    const nextFocus = (event as React.FocusEvent).relatedTarget;
    if (event.type === 'blur' && nextFocus instanceof HTMLElement && nextFocus.closest('button, a')) return;
    const field = Object.keys(ids).find(key => ids[key] === (event.target as HTMLElement).id);
    if (!field || (event.type !== 'blur' && !errors[field])) return;
    const value = (event.target as HTMLInputElement).value;
    const updated = ['provinceCode', 'wardCode', 'addressLine'].includes(field)
      ? { ...values, address: { ...(values.address as object), [field]: value } }
      : { ...values, [field]: value };
    const next = validateAuth(updated, mode)[field];
    setErrors(previous => { const updated = { ...previous }; if (next) updated[field] = next; else delete updated[field]; return updated; });
  };
  const failure = (cause: unknown) => {
    const fields = serverAuthFields(cause, mode);
    setErrors(fields); setSummary(authFailure(cause, mode)); focusTarget.current = Object.keys(ids).find(field => fields[field]) || null; focusRequested.current = true;
  };
  const attrs = (field: string, extra?: string) => ({ 'aria-invalid': Boolean(errors[field]), 'aria-describedby': [errors[field] ? `${ids[field]}-error` : '', extra].filter(Boolean).join(' ') || undefined });
  return { errors, summary, summaryRef, formRef, busy, check, failure, attrs, feedback };
}
