import { formatVnd } from '../../../utils/currency';
import React from 'react';
import { useLocale } from '../../../providers/LocaleProvider';
import '../../../styles/loyalty-account.css';

type Quote = { baseAmountVnd?: number; discountAmountVnd?: number; amountVnd?: number; discountBps?: number };
export function QuoteDiscountSummary({ quote }: { quote?: Quote | null }) {
  const { tr, locale } = useLocale();
  if (!quote || !Number.isFinite(quote.baseAmountVnd) || !Number.isFinite(quote.discountAmountVnd) || !quote.discountAmountVnd || quote.discountAmountVnd < 0) return null;
  return <dl className="booking-discount-summary"><div><dt>{tr('account.loyalty.baseFee')}</dt><dd>{formatVnd(quote.baseAmountVnd!, locale)}</dd></div><div><dt>{tr('account.loyalty.appliedDiscount')}</dt><dd>−{formatVnd(quote.discountAmountVnd, locale)}</dd></div></dl>;
}
