import { useLocale, type LocaleMessage } from '../providers/LocaleProvider';
import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import { AuthFieldError } from './features/auth/AuthFeedback';
type AddressValue = { addressLine: string; provinceCode: string; wardCode: string };
type Option = { code: string | number; name: string };
export interface VietnamAddressSelectorProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  required?: boolean;
  compact?: boolean;
  className?: string;
  fieldErrors?: Record<string, LocaleMessage>;
}
export function VietnamAddressSelector({ value, onChange, required = false, compact = false, className = '', fieldErrors = {} }: VietnamAddressSelectorProps) {
  const { tr } = useLocale();
  const [provinces, setProvinces] = useState<Option[]>([]);
  const [wardDirectory, setWardDirectory] = useState<{ province: string; options: Option[] }>({ province: '', options: [] });
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [provinceError, setProvinceError] = useState(false);
  const [wardError, setWardError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoadingProvinces(true); setProvinceError(false);
    apiRequest('/address/vietnam/provinces', { signal: controller.signal })
      .then((payload: { provinces: Option[] }) => {
        if (!controller.signal.aborted) {
          if (!payload.provinces?.length) throw new Error('Empty directory');
          setProvinces(payload.provinces);
        }
      })
      .catch(() => { if (!controller.signal.aborted) { setProvinceError(true); setProvinces([]); } })
      .finally(() => { if (!controller.signal.aborted) setLoadingProvinces(false); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    const controller = new AbortController();
    setWardDirectory({ province: '', options: [] }); setWardError(false);
    if (!value.provinceCode) { setLoadingWards(false); return () => controller.abort(); }
    setLoadingWards(true);
    apiRequest(`/address/vietnam/wards?provinceCode=${encodeURIComponent(value.provinceCode)}`, { signal: controller.signal })
      .then((payload: { wards: Option[] }) => {
        if (!controller.signal.aborted) {
          if (!payload.wards?.length) throw new Error('Empty directory');
          setWardDirectory({ province: value.provinceCode, options: payload.wards });
        }
      })
      .catch(() => { if (!controller.signal.aborted) setWardError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoadingWards(false); });
    return () => controller.abort();
  }, [value.provinceCode, retry]);
  const wards = wardDirectory.province === value.provinceCode ? wardDirectory.options : [];
  const mismatch = Boolean(value.wardCode && !loadingWards && !wardError && wardDirectory.province === value.provinceCode && !wards.some(item => String(item.code) === value.wardCode));
  const errors: Record<string, LocaleMessage> = { ...fieldErrors, provinceCode: provinceError ? 'ui.auth_address_unavailable' : fieldErrors.provinceCode, wardCode: wardError ? 'ui.auth_address_unavailable' : mismatch ? 'ui.auth_address_mismatch' : fieldErrors.wardCode };
  const attrs = (field: string) => ({ 'aria-invalid': Boolean(errors[field]), 'aria-describedby': errors[field] ? `address-${field === 'provinceCode' ? 'province' : field === 'wardCode' ? 'ward' : 'line'}-error` : undefined });
  const inputClass = compact ? 'auth-form-input w-full text-xs' : 'profile-input';
  const labelClass = compact ? 'font-mono text-[11px] text-slate-300' : 'profile-label';
  return <div className={`vietnam-address-selector ${className}`.trim()}>
    <div className={compact ? 'grid grid-cols-2 gap-3' : 'profile-form-grid'}>
      <div className="flex flex-col gap-1">
        <label htmlFor="address-province" className={labelClass}>{tr('ui.province_city_9c21469d')}{required ? '*' : ''}</label>
        <select id="address-province" className={inputClass} value={value.provinceCode} disabled={loadingProvinces || provinceError} required={required} {...attrs('provinceCode')}
          onChange={event => onChange({ ...value, provinceCode: event.target.value, wardCode: '' })}>
          <option value="">{loadingProvinces ? tr('ui.loading_148ded83') : tr('ui.choose_province_city_7e798e8f')}</option>
          {provinces.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
        <AuthFieldError id="address-province" error={errors.provinceCode} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="address-ward" className={labelClass}>{tr('ui.ward_commune_a0d567f2')}{required ? '*' : ''}</label>
        <select id="address-ward" className={inputClass} value={mismatch ? '' : value.wardCode} disabled={!value.provinceCode || loadingWards || wardError || !wards.length} required={required} {...attrs('wardCode')}
          onChange={event => onChange({ ...value, wardCode: event.target.value })}>
          <option value="">{loadingWards ? tr('ui.loading_148ded83') : tr('ui.choose_ward_commune_1c0f35a4')}</option>
          {wards.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
        <AuthFieldError id="address-ward" error={errors.wardCode} />
      </div>
    </div>
    <div className="flex flex-col gap-1 mt-3">
      <label htmlFor="address-line" className={labelClass}>{tr('ui.building_street_and_house_number_97bd1e3f')}{required ? '*' : ''}</label>
      <input id="address-line" className={inputClass} value={value.addressLine} required={required} minLength={5} maxLength={300} autoComplete="street-address" {...attrs('addressLine')} onChange={event => onChange({ ...value, addressLine: event.target.value })} />
      <AuthFieldError id="address-line" error={errors.addressLine} />
    </div>
    {(loadingProvinces || loadingWards) && <p role="status" className="auth-password-hint">{tr('ui.loading_148ded83')}</p>}
    {(provinceError || wardError) && <button type="button" className="address-retry" onClick={() => setRetry(count => count + 1)}>{tr('ui.auth_address_retry')}</button>}
  </div>;
}
