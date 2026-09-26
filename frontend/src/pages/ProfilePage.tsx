import React, { useEffect, useState } from "react";
import {
  Award,
  BadgePercent,
  CalendarCheck,
  CheckCircle2,
  KeyRound,
  Loader2,
  MapPinned,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  User,
  WalletCards
} from "lucide-react";
import { apiRequest } from "../api.js";
import { VietnamAddressSelector } from "../components/VietnamAddressSelector";
import { formatVietnamDateTime } from "../utils/timezone";
import { CANONICAL_BOOKING_STATUS_LABELS } from "../constants.js";
import "../styles/profile.css";

type AddressValue = { addressLine: string; provinceCode: string; wardCode: string };

function money(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value || 0)} đ`;
}

function tierLabel(tier?: string) {
  return ({ LAB_STANDARD: "LAB Standard", LAB_PLUS: "LAB Plus", LAB_PRIORITY: "LAB Priority", LAB_PARTNER: "LAB Partner" } as Record<string, string>)[tier || ""] || tier || "LAB Standard";
}

const CANONICAL_ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên (ADMIN)",
  LAB_STAFF: "Cán bộ phòng LAB (LAB_STAFF)",
  LECTURER: "Giảng viên (LECTURER)",
  STUDENT: "Sinh viên / Người dùng (STUDENT)"
};

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

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

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

  async function saveContactInfo(event: React.FormEvent) {
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
      setSuccess("Thông tin liên hệ và địa chỉ đã được cập nhật thành công.");
    } catch (cause: any) {
      setError(cause?.message || "Không cập nhật được hồ sơ.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(event: React.FormEvent) {
    event.preventDefault();
    if (passwordBusy) return;
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Xác nhận mật khẩu mới không khớp.");
      return;
    }

    setPasswordBusy(true);
    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setPasswordSuccess("Đã cập nhật mật khẩu mới thành công.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // Update local profile state
      const updated = { ...profile, passwordResetRequired: false };
      setProfile(updated);
      localStorage.setItem("lrm_user", JSON.stringify(updated));
      onUserUpdated(updated);
    } catch (cause: any) {
      setPasswordError(cause?.message || "Không thể cập nhật mật khẩu.");
    } finally {
      setPasswordBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <p role="status"><Loader2 className="spin" size={18} /> Đang tải hồ sơ…</p>
      </div>
    );
  }

  const roleName = CANONICAL_ROLE_LABELS[profile?.role] || profile?.role || "STUDENT";
  const isTemporaryPassword = Boolean(profile?.passwordResetRequired);

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <div className="profile-hero">
        <div>
          <span className="profile-kicker">HỒ SƠ TRUY CẬP VÀ VẬN HÀNH</span>
          <h1 id="profile-title">Hồ sơ người dùng & Quyền hạn LAB</h1>
          <p>
            Quản lý thông tin định danh, bảo mật tài khoản, phân loại đối tượng sử dụng, chứng chỉ an toàn phòng lab và thông tin liên hệ.
          </p>
        </div>
      </div>

      {error && <div className="profile-alert danger" role="alert">{error}</div>}
      {success && <div className="profile-alert success" role="status"><CheckCircle2 size={16} />{success}</div>}

      {/* 1. IDENTITY */}
      <article className="profile-card profile-section-identity" aria-labelledby="section-identity-title">
        <div className="profile-card-title">
          <User size={20} />
          <div>
            <h2 id="section-identity-title">1. Thông tin danh tính</h2>
            <p>Thông tin định danh người dùng trong hệ thống Open LAB.</p>
          </div>
        </div>
        <div className="profile-identity-grid">
          <div className="identity-item">
            <span className="profile-label">Họ và tên</span>
            <strong>{profile?.fullName || "—"}</strong>
          </div>
          <div className="identity-item">
            <span className="profile-label">Email tài khoản</span>
            <strong>{profile?.email || "—"}</strong>
          </div>
          <div className="identity-item">
            <span className="profile-label">Vai trò hệ thống (RBAC)</span>
            <span className="role-badge">{roleName}</span>
          </div>
          <div className="identity-item">
            <span className="profile-label">Mã định danh hệ thống</span>
            <code>{profile?.id}</code>
          </div>
          {profile?.createdAt && (
            <div className="identity-item">
              <span className="profile-label">Thời gian khởi tạo</span>
              <span>{formatVietnamDateTime(profile.createdAt)}</span>
            </div>
          )}
        </div>
      </article>

      {/* 2. ACCOUNT / SECURITY */}
      <article className="profile-card profile-section-security" aria-labelledby="section-security-title">
        <div className="profile-card-title">
          <Shield size={20} />
          <div>
            <h2 id="section-security-title">2. Tài khoản & Bảo mật</h2>
            <p>Trạng thái tài khoản và đổi mật khẩu truy cập.</p>
          </div>
        </div>

        <div className="security-status-row">
          <div>
            <span className="profile-label">Trạng thái tài khoản</span>
            <span className={`status-badge ${profile?.isActive !== false ? "active" : "inactive"}`}>
              {profile?.isActive !== false ? "Hoạt động bình thường" : "Tài khoản bị tạm khóa"}
            </span>
          </div>
          <div>
            <span className="profile-label">Yêu cầu đổi mật khẩu</span>
            <span className={`status-badge ${isTemporaryPassword ? "warning" : "ok"}`}>
              {isTemporaryPassword ? "Bắt buộc đổi mật khẩu" : "Mật khẩu an toàn"}
            </span>
          </div>
        </div>

        {isTemporaryPassword && (
          <div className="profile-alert warning" role="alert">
            <ShieldAlert size={18} />
            <div>
              <strong>Tài khoản đang dùng mật khẩu tạm thời</strong>
              <p>Mật khẩu hiện tại là số điện thoại đăng ký đặt lịch nhanh. Bạn cần thiết lập mật khẩu mới ngay để bảo vệ tài khoản.</p>
            </div>
          </div>
        )}

        {passwordError && <div className="profile-alert danger" role="alert">{passwordError}</div>}
        {passwordSuccess && <div className="profile-alert success" role="status"><CheckCircle2 size={16} />{passwordSuccess}</div>}

        <form onSubmit={handlePasswordChange} className="password-change-form">
          <h3 className="sub-heading"><KeyRound size={16} /> Đổi mật khẩu</h3>
          <div className="password-inputs-grid">
            <label>
              <span className="profile-label">Mật khẩu hiện tại</span>
              <input
                type="password"
                className="profile-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={isTemporaryPassword ? "Số điện thoại đã đặt lịch" : "Nhập mật khẩu hiện tại"}
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              <span className="profile-label">Mật khẩu mới (tối thiểu 8 ký tự)</span>
              <input
                type="password"
                className="profile-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label>
              <span className="profile-label">Xác nhận mật khẩu mới</span>
              <input
                type="password"
                className="profile-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
          </div>
          <button type="submit" className="profile-button-secondary" disabled={passwordBusy}>
            {passwordBusy ? <Loader2 className="spin" size={16} /> : <KeyRound size={16} />}
            Cập nhật mật khẩu
          </button>
        </form>
      </article>

      {/* 3. ACCESS / CUSTOMER CLASSIFICATION */}
      <article className="profile-card profile-section-access" aria-labelledby="section-access-title">
        <div className="profile-card-title">
          <ShieldCheck size={20} />
          <div>
            <h2 id="section-access-title">3. Phân loại đối tượng & Nguyên tắc truy cập</h2>
            <p>Khai báo đối tượng sử dụng và phạm vi hiệu lực phân quyền.</p>
          </div>
        </div>

        <div className="customer-classification-card">
          <div className="classification-header">
            <div>
              <span className="profile-label">Phân loại khách hàng tự khai</span>
              <strong>{customerType === "INTERNAL" ? "Nội bộ trường (INTERNAL)" : "Khách ngoài / Đối tác (EXTERNAL)"}</strong>
            </div>
            <div className="semantics-tag">
              <code>customerTypeSemantics = SELF_DECLARED_UNVERIFIED</code>
            </div>
          </div>

          <div className="disclaimer-box">
            <strong>Nguyên tắc thẩm quyền Open LAB:</strong>
            <p>
              Phân loại nhóm sử dụng là thông tin <strong>tự khai báo (SELF_DECLARED_UNVERIFIED)</strong> nhằm hỗ trợ thu thập hồ sơ liên hệ.
              Thông tin này <strong>KHÔNG</strong> cấp thẩm quyền tổ chức được xác minh, <strong>KHÔNG</strong> thay thế vai trò RBAC của hệ thống,
              <strong>KHÔNG</strong> tự động thay đổi giá dịch vụ, và <strong>KHÔNG</strong> miễn trừ bất kỳ điều kiện đào tạo an toàn bắt buộc nào.
            </p>
          </div>
        </div>
      </article>

      {/* 4. TRAINING / CERTIFICATIONS */}
      <article className="profile-card profile-section-training" aria-labelledby="section-training-title">
        <div className="profile-card-title">
          <Award size={20} />
          <div>
            <h2 id="section-training-title">4. Đào tạo & Chứng nhận an toàn phòng LAB</h2>
            <p>Chứng chỉ hoàn thành khóa đào tạo bắt buộc để sử dụng máy móc và phòng lab chuyên dụng.</p>
          </div>
        </div>

        {profile?.certifications && profile.certifications.length > 0 ? (
          <div className="certifications-table-wrapper">
            <table className="certifications-table">
              <thead>
                <tr>
                  <th scope="col">Mã khóa</th>
                  <th scope="col">Tên khóa đào tạo</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ngày cấp</th>
                  <th scope="col">Hạn chứng nhận</th>
                </tr>
              </thead>
              <tbody>
                {profile.certifications.map((cert: any) => (
                  <tr key={cert.id}>
                    <td><code>{cert.code}</code></td>
                    <td><strong>{cert.name}</strong></td>
                    <td>
                      <span className={`cert-badge cert-${cert.status.toLowerCase()}`}>
                        {cert.status === "VALID" ? "Đủ điều kiện (VALID)" : cert.status === "EXPIRED" ? "Hết hạn (EXPIRED)" : cert.status}
                      </span>
                    </td>
                    <td>{formatVietnamDateTime(cert.issuedAt)}</td>
                    <td>{cert.expiresAt ? formatVietnamDateTime(cert.expiresAt) : "Vô thời hạn"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-cert-notice">
            <p>Chưa có chứng nhận an toàn phòng lab nào được ghi nhận cho tài khoản này.</p>
            <small>Khi đặt các thiết bị yêu cầu chứng chỉ (ví dụ: máy phay CNC, máy laser, hóa chất), hệ thống sẽ kiểm tra và yêu cầu hoàn thành khóa đào tạo tương ứng.</small>
          </div>
        )}
      </article>

      {/* 5. CONTACT & ADDRESS */}
      <form className="profile-card profile-section-contact" onSubmit={saveContactInfo} aria-labelledby="section-contact-title">
        <div className="profile-card-title">
          <MapPinned size={20} />
          <div>
            <h2 id="section-contact-title">5. Thông tin liên hệ & Địa chỉ mặc định</h2>
            <p>Thông tin phục vụ liên lạc bàn giao thiết bị, gửi thông báo và xác nhận đặt lịch.</p>
          </div>
        </div>

        <div className="profile-form-grid">
          <label>
            <span className="profile-label">Họ và tên</span>
            <input
              className="profile-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={2}
              maxLength={255}
            />
          </label>
          <label>
            <span className="profile-label">Số điện thoại liên hệ</span>
            <input
              className="profile-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
              autoComplete="tel"
            />
          </label>
          <label>
            <span className="profile-label">Đơn vị / Khoa / Tổ chức</span>
            <input
              className="profile-input"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              maxLength={160}
              autoComplete="organization"
            />
          </label>
          <label>
            <span className="profile-label">Nhóm sử dụng tự khai</span>
            <select
              className="profile-input"
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
            >
              <option value="INTERNAL">Nội bộ trường (tự khai, chưa xác minh)</option>
              <option value="EXTERNAL">Đơn vị / Khách ngoài trường</option>
            </select>
          </label>
        </div>

        <div className="address-section-block">
          <span className="profile-label">Địa chỉ mặc định</span>
          <VietnamAddressSelector value={address} onChange={setAddress} required />
        </div>

        <button className="profile-save" type="submit" disabled={saving}>
          {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
          Lưu thông tin liên hệ
        </button>
      </form>

      {/* 6. BOOKING SUMMARY */}
      <article className="profile-card profile-section-booking" aria-labelledby="section-booking-title">
        <div className="profile-card-title">
          <CalendarCheck size={20} />
          <div>
            <h2 id="section-booking-title">6. Tổng hợp lịch đặt LAB</h2>
            <p>Tổng quan tiến trình các lịch đặt tài nguyên đã thực hiện.</p>
          </div>
        </div>

        <div className="profile-stats-grid">
          <div className="stat-card">
            <span>Hoàn tất sử dụng</span>
            <strong>{profile?.bookingSummary?.completed || 0}</strong>
            <small>Đã hoàn trả và nghiệm thu</small>
          </div>
          <div className="stat-card">
            <span>Lịch đang hoạt động</span>
            <strong>{profile?.bookingSummary?.active || 0}</strong>
            <small>Chờ duyệt, đã duyệt hoặc đang sử dụng</small>
          </div>
          <div className="stat-card">
            <span>Tổng số lịch</span>
            <strong>{profile?.bookingSummary?.total || 0}</strong>
            <small>Bao gồm mọi trạng thái</small>
          </div>
        </div>

        {profile?.bookingSummary?.byStatus && (
          <div className="booking-status-breakdown">
            {Object.entries(profile.bookingSummary.byStatus).map(([statusKey, count]: [string, any]) => (
              <span key={statusKey} className="status-count-chip">
                {CANONICAL_BOOKING_STATUS_LABELS[statusKey] || statusKey}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        )}
      </article>

      {/* 7. LOYALTY & COMMERCIAL INFORMATION (LAST) */}
      <article className="profile-card profile-section-loyalty" aria-labelledby="section-loyalty-title">
        <div className="profile-card-title">
          <WalletCards size={20} />
          <div>
            <h2 id="section-loyalty-title">7. Thông tin ưu tiên & Tích lũy LAB (Thông tin tham khảo)</h2>
            <p>Hạng và điểm tích lũy phục vụ hỗ trợ vận hành. Không thay thế thẩm quyền phê duyệt an toàn.</p>
          </div>
        </div>

        <div className="loyalty-grid">
          <div className="profile-tier-card">
            <span className="tier-kicker">Hạng tài khoản</span>
            <strong>{tierLabel(profile?.loyalty?.tier)}</strong>
            <span>{profile?.loyalty?.points || 0} điểm LAB</span>
            <small>{profile?.loyalty?.basis}</small>
          </div>

          <div className="profile-stats-grid">
            <div className="stat-card">
              <span><WalletCards size={16} /> Tổng chi phí</span>
              <strong>{money(profile?.spending?.totalSpendVnd || 0)}</strong>
              <small>{profile?.spending?.successfulPayments || 0} giao dịch thành công</small>
            </div>
            <div className="stat-card">
              <span><BadgePercent size={16} /> Discount hỗ trợ</span>
              <strong>{((profile?.loyalty?.discountBps || 0) / 100).toFixed(1)}%</strong>
              <small>Áp dụng theo chính sách quản trị</small>
            </div>
            <div className="stat-card">
              <span><TrendingUp size={16} /> Điểm ưu tiên điều phối</span>
              <strong>+{profile?.loyalty?.priorityBoost || 0}</strong>
              <small>Tín hiệu tham khảo, không vượt quyền duyệt</small>
            </div>
          </div>
        </div>

        <p className="commercial-disclaimer">
          * Điểm tích lũy và xếp hạng chỉ mang tính tham khảo hỗ trợ quản trị, không được dùng để thay thế quy trình kiểm tra an toàn hoặc bỏ qua phê duyệt của cán bộ phòng lab.
        </p>
      </article>
    </section>
  );
}
