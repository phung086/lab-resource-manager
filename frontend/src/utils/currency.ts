const vndFormatters = {
  vi: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }),
  en: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'VND' }),
};

export function formatVnd(amount: number, locale: keyof typeof vndFormatters) {
  return vndFormatters[locale].format(amount);
}
