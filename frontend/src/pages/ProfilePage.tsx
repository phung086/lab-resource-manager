import React, { useEffect, useState } from "react";
import { BadgePercent, CalendarCheck, CheckCircle2, Loader2, MapPinned, Save, TrendingUp, WalletCards } from "lucide-react";
import { apiRequest } from "../api.js";
import { VietnamAddressSelector } from "../components/VietnamAddressSelector";
import "../styles/profile.css";

type AddressValue = { addressLine: string; provinceCode: string; wardCode: string };

function money(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value || 0)} đ`;
}

function tierLabel(tier?: string) {
  return ({ LAB_STANDARD: "LAB Standard", LAB_PLUS: "LAB Plus", LAB_PRIORITY: "LAB Priority", LAB_PARTNER: "LAB Partner" } as Record<string, string>)[tier || ""] || tier || "LAB Standard";
}

export function ProfilePage({ user, onUserUpdated }: { user: any; onUserUpdated: (user: any) => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [organization, setOrganization] = useState(user?.organization || "");
  const [customerType, setCustomerType] = useState(user?.customerType || "INTERNAL");
  const [address, setAddress] = useState<AddressValue>({ addressLine: "", provinceCode: "", wardCode: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRequest("/users/me")
      .then((payload: any) => {
        if (!active) return;
        setProfile(payload);
        setFullName(payload.fullName || "");
        setPhone(payload.phone || "");
        setOrganization(payload.organization || "");
        setCustomerType(payload.customerType || "INTERNAL");
        setAddress({
          addressLine: payload.defaultAddress?.addressLine || "",
          provinceCode: payload.defaultAddress?.provinceCode || "",
          wardCode: payload.defaultAddress?.wardCode || ""
        });
      })
      .catch((cause: any) => { if (active) setError(cause?.message || "Không tải được hồ sơ."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = await apiRequest("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ fullName, phone, organization, customerType, address })
      });
      setProfile(payload);
      localStorage.setItem("lrm_user", JSON.stringify(payload));
      onUserUpdated(payload);
      setSuccess("Hồ sơ đã được cập nhật.");
    } catch (cause: any) {
      setError(cause?.message || "Không cập nhật được hồ sơ.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="profile-page"><p role="status"><Loader2 className="spin" size={18} /> Đang tải hồ sơ…</p></div>;

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <div className="profile-hero">
        <div>
          <span className="profile-kicker">HỒ SƠ OPEN LAB</span>
          <h1 id="profile-title">Hồ sơ, chi tiêu và ưu tiên đặt lịch</h1>
          <p>Thông tin này phục vụ đặt lịch phòng LAB, thu phí theo chính sách, ưu tiên lịch hợp tác và chuẩn bị cho nghiệp vụ mượn thiết bị có giao nhận sau này.</p>
        </div>
        <div className="profile-tier-card">
          <strong>{tierLabel(profile?.loyalty?.tier)}</strong>
          <span>{profile?.loyalty?.points || 0} điểm LAB</span>
          <small>{profile?.loyalty?.basis}</small>
        </div>
      </div>

      {error && <div className="profile-alert danger" role="alert">{error}</div>}
      {success && <div className="profile-alert success" role="status"><CheckCircle2 size={16} />{success}</div>}

      <div className="profile-stats-grid">
        <article><WalletCards /><span>Tổng chi tiêu</span><strong>{money(profile?.spending?.totalSpendVnd || 0)}</strong><small>{profile?.spending?.successfulPayments || 0} giao dịch thành công</small></article>
        <article><CalendarCheck /><span>Booking hoàn tất</span><strong>{profile?.bookingSummary?.completed || 0}</strong><small>{profile?.bookingSummary?.active || 0} lịch đang theo dõi</small></article>
        <article><BadgePercent /><span>Discount LAB</span><strong>{((profile?.loyalty?.discountBps || 0) / 100).toFixed(1)}%</strong><small>Áp dụng theo chính sách quản trị</small></article>
        <article><TrendingUp /><span>Ưu tiên đặt trước</span><strong>+{profile?.loyalty?.priorityBoost || 0}</strong><small>Chỉ là tín hiệu nghiệp vụ LAB, không vượt quyền duyệt</small></article>
      </div>

      <form className="profile-card" onSubmit={saveProfile}>
        <div className="profile-card-title"><MapPinned /><div><h2>Thông tin liên hệ và địa chỉ mặc định</h2><p>Dùng cho quick booking, hóa đơn nội bộ và luồng mượn thiết bị có giao nhận trong các pass sau.</p></div></div>
        <div className="profile-form-grid">
          <label><span className="profile-label">Họ tên</span><input className="profile-input" value={fullName} onChange={e => setFullName(e.target.value)} required minLength={2} maxLength={255} /></label>
          <label><span className="profile-label">Số điện thoại</span><input className="profile-input" value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} autoComplete="tel" /></label>
          <label><span className="profile-label">Đơn vị / khoa / tổ chức</span><input className="profile-input" value={organization} onChange={e => setOrganization(e.target.value)} maxLength={160} autoComplete="organization" /></label>
          <label><span className="profile-label">Nhóm sử dụng</span><select className="profile-input" value={customerType} onChange={e => setCustomerType(e.target.value)}><option value="INTERNAL">Nội bộ trường</option><option value="EXTERNAL">Đơn vị / khách ngoài trường</option></select></label>
        </div>
        <VietnamAddressSelector value={address} onChange={setAddress} required />
        <button className="profile-save" type="submit" disabled={saving}>{saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />} Lưu hồ sơ</button>
      </form>
    </section>
  );
}
