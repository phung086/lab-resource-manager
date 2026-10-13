import React from 'react';
import { useLocale } from '../../../providers/LocaleProvider';
import '../../../styles/loyalty-account.css';

type Quote = { baseAmountVnd?: number; discountAmountVnd?: number; amountVnd?: number; discountBps?: number };
export function QuoteDiscountSummary({ quote }: { quote?: Quote | null }) {
  const { tr, locale } = useLocale();
  if (!quote || !Number.isFinite(quote.baseAmountVnd) || !Number.isFinite(quote.discountAmountVnd) || !quote.discountAmountVnd || quote.discountAmountVnd < 0) return null;
  const money = (amount: number) => new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
  return <dl className="booking-discount-summary"><div><dt>{tr('account.loyalty.baseFee')}</dt><dd>{money(quote.baseAmountVnd!)}</dd></div><div><dt>{tr('account.loyalty.appliedDiscount')}</dt><dd>−{money(quote.discountAmountVnd)}</dd></div></dl>;
}
