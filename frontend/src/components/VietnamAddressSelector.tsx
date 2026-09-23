import React, { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api.js";

type AddressValue = {
  addressLine: string;
  provinceCode: string;
  wardCode: string;
};

type Province = { code: string | number; name: string };
type Ward = { code: string | number; name: string };

export interface VietnamAddressSelectorProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  required?: boolean;
  compact?: boolean;
  className?: string;
}

export function VietnamAddressSelector({ value, onChange, required = false, compact = false, className = "" }: VietnamAddressSelectorProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoadingProvinces(true);
    setError("");
    apiRequest("/address/vietnam/provinces")
      .then((payload: { provinces: Province[] }) => { if (active) setProvinces(payload.provinces || []); })
      .catch((cause: Error) => { if (active) setError(cause.message || "Không tải được danh mục tỉnh/thành."); })
      .finally(() => { if (active) setLoadingProvinces(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!value.provinceCode) {
      setWards([]);
      return () => { active = false; };
    }
    setLoadingWards(true);
    setError("");
    apiRequest(`/address/vietnam/wards?provinceCode=${encodeURIComponent(value.provinceCode)}`)
      .then((payload: { wards: Ward[] }) => { if (active) setWards(payload.wards || []); })
      .catch((cause: Error) => { if (active) setError(cause.message || "Không tải được danh mục phường/xã."); })
      .finally(() => { if (active) setLoadingWards(false); });
    return () => { active = false; };
  }, [value.provinceCode]);

  const provinceOptions = useMemo(() => provinces.map(item => ({ code: String(item.code), name: item.name })), [provinces]);
  const wardOptions = useMemo(() => wards.map(item => ({ code: String(item.code), name: item.name })), [wards]);
  const inputClass = compact ? "auth-form-input w-full text-xs" : "profile-input";

  return (
    <div className={`vietnam-address-selector ${className}`.trim()}>
      <div className={compact ? "grid grid-cols-2 gap-3" : "profile-form-grid"}>
        <div className="flex flex-col gap-1">
          <label htmlFor="address-province" className={compact ? "font-mono text-[11px] text-slate-300" : "profile-label"}>Tỉnh / thành phố {required ? "*" : ""}</label>
          <select
            id="address-province"
            className={inputClass}
            value={value.provinceCode}
            disabled={loadingProvinces}
            required={required}
            onChange={(event) => onChange({ ...value, provinceCode: event.target.value, wardCode: "" })}
          >
            <option value="">{loadingProvinces ? "Đang tải..." : "Chọn tỉnh/thành"}</option>
            {provinceOptions.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="address-ward" className={compact ? "font-mono text-[11px] text-slate-300" : "profile-label"}>Phường / xã {required ? "*" : ""}</label>
          <select
            id="address-ward"
            className={inputClass}
            value={value.wardCode}
            disabled={!value.provinceCode || loadingWards}
            required={required}
            onChange={(event) => onChange({ ...value, wardCode: event.target.value })}
          >
            <option value="">{loadingWards ? "Đang tải..." : "Chọn phường/xã"}</option>
            {wardOptions.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1 mt-3">
        <label htmlFor="address-line" className={compact ? "font-mono text-[11px] text-slate-300" : "profile-label"}>Số nhà, đường, tòa nhà {required ? "*" : ""}</label>
        <input
          id="address-line"
          className={inputClass}
          value={value.addressLine}
          required={required}
          minLength={5}
          maxLength={300}
          autoComplete="street-address"
          placeholder="VD: Tòa A, số 1 Đại Cồ Việt"
          onChange={(event) => onChange({ ...value, addressLine: event.target.value })}
        />
      </div>
      {error && <p className={compact ? "text-xs text-rose-300 mt-2" : "profile-error"} role="alert">{error}</p>}
    </div>
  );
}
