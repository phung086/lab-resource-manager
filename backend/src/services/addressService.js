import { HttpError } from "../middleware/errors.js";

const SOURCE_URL = "https://provinces.open-api.vn/api/v2";
const SOURCE_NAME = "provinces.open-api.vn";
const SOURCE_VERSION = "v2-post-2025-07";
const cache = new Map();
const TTL_MS = 12 * 60 * 60 * 1000;

function fromCache(key) {
  const item = cache.get(key);
  if (item && item.expiresAt > Date.now()) return item.value;
  cache.delete(key);
  return null;
}

function setCache(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}

async function fetchJson(path) {
  const url = `${SOURCE_URL}${path}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Address source returned ${response.status}`);
  return response.json();
}

function source() {
  return { name: SOURCE_NAME, version: SOURCE_VERSION, url: SOURCE_URL };
}

export async function listVietnamProvinces() {
  const cached = fromCache("provinces");
  if (cached) return cached;
  try {
    const rows = await fetchJson("/");
    return setCache("provinces", {
      source: source(),
      provinces: rows.map(row => ({
        code: String(row.code),
        name: row.name,
        divisionType: row.division_type,
        codename: row.codename
      }))
    });
  } catch (error) {
    throw new HttpError(503, "Không tải được danh mục tỉnh/thành Việt Nam.", undefined, "ADDRESS_SOURCE_UNAVAILABLE");
  }
}

export async function listVietnamWards(provinceCode) {
  const normalized = String(provinceCode || "").trim();
  if (!/^\d+$/.test(normalized)) {
    throw new HttpError(400, "Mã tỉnh/thành không hợp lệ.", { field: "provinceCode" }, "VALIDATION_ERROR");
  }
  const cached = fromCache(`wards:${normalized}`);
  if (cached) return cached;
  try {
    const row = await fetchJson(`/p/${encodeURIComponent(normalized)}?depth=2`);
    const value = {
      source: source(),
      province: {
        code: String(row.code),
        name: row.name,
        divisionType: row.division_type,
        codename: row.codename
      },
      wards: (row.wards || []).map(ward => ({
        code: String(ward.code),
        name: ward.name,
        divisionType: ward.division_type,
        codename: ward.codename,
        provinceCode: String(ward.province_code)
      }))
    };
    return setCache(`wards:${normalized}`, value);
  } catch (error) {
    throw new HttpError(503, "Không tải được danh mục phường/xã Việt Nam.", undefined, "ADDRESS_SOURCE_UNAVAILABLE");
  }
}

export async function validateVietnamAddress(input) {
  const detail = String(input?.addressLine || "").trim();
  const provinceCode = String(input?.provinceCode || "").trim();
  const wardCode = String(input?.wardCode || "").trim();
  if (detail.length < 5 || detail.length > 300) {
    throw new HttpError(400, "Vui lòng nhập số nhà, tên đường hoặc địa chỉ chi tiết.", { field: "addressLine" }, "VALIDATION_ERROR");
  }
  const { province, wards, source: addressSource } = await listVietnamWards(provinceCode);
  const ward = wards.find(item => item.code === wardCode);
  if (!ward) {
    throw new HttpError(400, "Phường/xã không thuộc tỉnh/thành đã chọn.", { field: "wardCode" }, "VALIDATION_ERROR");
  }
  return {
    addressLine: detail,
    provinceCode: province.code,
    provinceName: province.name,
    wardCode: ward.code,
    wardName: ward.name,
    source: addressSource.name,
    version: addressSource.version,
    fullAddress: `${detail}, ${ward.name}, ${province.name}`
  };
}
