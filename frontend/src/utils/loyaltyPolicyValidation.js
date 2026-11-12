export function validateLoyaltyPolicy(values, version) {
  const errors = {};
  const plusThreshold = Number(values.plusThreshold), priorityThreshold = Number(values.priorityThreshold);
  const plusPercent = Number(values.plusPercent), priorityPercent = Number(values.priorityPercent);
  const validThreshold = (raw, value) => String(raw).trim() !== '' && Number.isSafeInteger(value) && value >= 1 && value <= 2000000000;
  const validPercent = (raw, value) => String(raw).trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 50 && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
  if (!validThreshold(values.plusThreshold, plusThreshold)) errors.plusThreshold = 'account.loyalty.thresholdInvalid';
  if (!validThreshold(values.priorityThreshold, priorityThreshold) || priorityThreshold <= plusThreshold) errors.priorityThreshold = 'account.loyalty.priorityThresholdInvalid';
  if (!validPercent(values.plusPercent, plusPercent)) errors.plusPercent = 'account.loyalty.discountInvalid';
  if (!validPercent(values.priorityPercent, priorityPercent)) errors.priorityPercent = 'account.loyalty.discountInvalid';
  return { errors, data: Object.keys(errors).length ? null : { enabled: Boolean(values.enabled), plusThreshold, priorityThreshold, plusDiscountBps: Math.round(plusPercent * 100), priorityDiscountBps: Math.round(priorityPercent * 100), expectedVersion: version } };
}
