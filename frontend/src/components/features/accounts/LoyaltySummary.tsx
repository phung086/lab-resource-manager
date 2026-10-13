import React from 'react';
import { useLocale } from '../../../providers/LocaleProvider';
import '../../../styles/loyalty-account.css';

export type Loyalty = { tier: string; points: number; discountBps: number; totalSpendVnd: number; completedBookings: number; basis: string; progress: number; nextTier: string | null; nextThreshold: number | null; remainingToNext: number; policyVersion: number };
const tierKeys: Record<string,string> = { LAB_STANDARD: 'account.loyalty.standard', LAB_PLUS: 'account.loyalty.plus', LAB_PRIORITY: 'account.loyalty.priority' };
export function LoyaltySummary({ loyalty }: { loyalty?: Loyalty | null }) {
  const { tr, locale } = useLocale();
  const money = (amount: number) => new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
  if (!loyalty || !Number.isFinite(loyalty.totalSpendVnd) || !Number.isFinite(loyalty.progress)) return <section className="account-loyalty"><h3>{tr('account.loyalty.title')}</h3><p>{tr('account.loyalty.unavailable')}</p></section>;
  return <section className="account-loyalty" aria-label={tr('account.loyalty.title')}>
    <div className="account-loyalty-tier"><strong>{tr(tierKeys[loyalty.tier] || 'account.loyalty.title')}</strong><span>{tr('account.loyalty.discount', { percent: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(loyalty.discountBps / 100) })}</span></div>
    <p>{tr('account.loyalty.verifiedSpend', { amount: money(loyalty.totalSpendVnd) })}</p>
    <progress value={Math.max(0, Math.min(100, loyalty.progress))} max={100} aria-label={tr('account.loyalty.progress')} />
    <p>{loyalty.nextTier && loyalty.nextThreshold ? tr('account.loyalty.remaining', { amount: money(loyalty.remainingToNext), tier: tr(tierKeys[loyalty.nextTier] || 'account.loyalty.title') }) : tr('account.loyalty.highestTier')}</p>
    <small>{tr('account.loyalty.bookingQuote')}</small>
  </section>;
}
