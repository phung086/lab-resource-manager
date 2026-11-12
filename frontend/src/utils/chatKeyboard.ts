import type { KeyboardEvent } from 'react';

/** Keep browser validation, disabled state and IME composition when sending with Enter. */
export function submitChatOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.nativeEvent.isComposing) return;
  event.preventDefault();
  const form = event.currentTarget.form;
  const submitter = form?.querySelector<HTMLButtonElement>('button[type="submit"]') || form?.querySelector<HTMLButtonElement>('button:not([type])');
  if (form && submitter && !submitter.disabled) form.requestSubmit(submitter);
}
