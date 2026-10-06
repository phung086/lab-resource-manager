import { translate } from "../i18n.js";
import { useLocale } from '../providers/LocaleProvider';
import React, { useEffect, useState } from "react";
import {
  BadgePercent,
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldAlert,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { apiRequest } from "../api.js";
import { VietnamAddressSelector } from "../components/VietnamAddressSelector";
import { formatVietnamDateTime } from "../utils/timezone";
import { CANONICAL_BOOKING_STATUS_LABELS } from "../constants.js";
import "../styles/profile.css";
import "../styles/redesign/profile.css";

type AddressValue = { addressLine: string; provinceCode: string; wardCode: string };

function money(value: number) {
  return translate("ui.vnd_e239b46a", { value0: new Intl.NumberFormat("vi-VN").format(value || 0) });
}

function tierLabel(tier?: string) {
  return ({ LAB_STANDARD: "LAB Standard", LAB_PLUS: "LAB Plus", LAB_PRIORITY: "LAB Priority", LAB_PARTNER: "LAB Partner" } as Record<string, string>)[tier || ""] || tier || "LAB Standard";
}

const CANONICAL_ROLE_LABELS: Record<string, string> = {
  ADMIN: "ui.administrator_admin_f4c6efe0",
  LAB_STAFF: "ui.lab_staff_lab_staff_bd8c87d9",
  LECTURER: "ui.lecturer_lecturer_62bdf7c0",
  STUDENT: "ui.student_user_student_e7f5a647"
};

export function ProfilePage({ user, onUserUpdated }: { user: any; onUserUpdated: (user: any) => void }) {
  const { tr } = useLocale();
  const [section, setSection] = useState("contact");
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
      .catch((cause: any) => { if (active) setError(cause?.message || "ui.could_not_load_profile_8b6760f5"); })
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
      setSuccess("ui.contact_information_and_address_updated_f70717db");
    } catch (cause: any) {
      setError(cause?.message || "ui.could_not_update_profile_07393170");
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
      setPasswordError("ui.enter_your_current_password_840cc081");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("ui.your_new_password_must_have_b32509a2");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("ui.new_passwords_do_not_match_c6f3eeb4");
      return;
    }

    setPasswordBusy(true);
    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setPasswordSuccess(tr("ui.new_password_saved_f9b9598f"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // Update local profile state
      const updated = { ...profile, passwordResetRequired: false };
      setProfile(updated);
      localStorage.setItem("lrm_user", JSON.stringify(updated));
      onUserUpdated(updated);
    } catch (cause: any) {
      setPasswordError(cause?.message || "ui.could_not_update_password_f06947fb");
    } finally {
      setPasswordBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-page lrm-profile-redesign">
        <p role="status"><Loader2 className="spin" size={18} /> {tr("ui.loading_profile_6e226af8")}</p>
      </div>
    );
  }

  const roleName = tr(CANONICAL_ROLE_LABELS[profile?.role]) || profile?.role || "STUDENT";
  const isTemporaryPassword = Boolean(profile?.passwordResetRequired);

  return (
    <section className="profile-page lrm-profile-redesign" aria-labelledby="profile-title">
      <div className="profile-hero">
        <div>
          <h1 id="profile-title">{tr("refine.account")}</h1>
        </div>
      </div>

      {error && <div className="profile-alert danger" role="alert">{tr(error)}</div>}
      {success && <div className="profile-alert success" role="status"><CheckCircle2 size={16} />{translate(success)}</div>}

      <div className="profile-identity-summary">
        <span className="profile-initial" aria-hidden="true">{(profile?.fullName || profile?.email || "").trim().slice(0, 1).toUpperCase()}</span>
        <div className="profile-identity-copy">
          <div className="profile-identity-heading">
            <h2>{profile?.fullName}</h2>
            <span className="role-badge">{roleName}</span>
          </div>
          <div className="profile-identity-meta">
            <span><Mail size={15} aria-hidden="true" />{profile?.email}</span>
            {profile?.phone && <span><Phone size={15} aria-hidden="true" />{profile.phone}</span>}
            {profile?.organization && <span><Building2 size={15} aria-hidden="true" />{profile.organization}</span>}
          </div>
        </div>
      </div>
      {isTemporaryPassword && section !== "security" && <button className="secondary-button profile-security-shortcut" onClick={() => setSection("security")}>{tr("ui.password_change_required_e4691737")}</button>}
      <nav className="refine-section-nav profile-section-nav" aria-label={tr("refine.accountSections")}>
        {["contact", "security", "access", "activity"].map((value, index) => (
          <button key={value} type="button" aria-pressed={section === value} onClick={() => setSection(value)}>
            <span className="profile-nav-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span>{tr(`refine.${value}`)}</span>
          </button>
        ))}
      </nav>
      {/* 2. ACCOUNT / SECURITY */}
      <article hidden={section !== "security"} className="profile-card profile-section-security" aria-labelledby="section-security-title">
        <div className="profile-card-title">
          <div>
            <h2 id="section-security-title">{tr("ui.2_account_security_8c130463")}</h2>
            <p>{tr("ui.account_status_and_password_settings_56c3576f")}</p>
          </div>
        </div>

        <div className="security-status-row">
          <div>
            <span className="profile-label">{tr("ui.account_status_00a4b83c")}</span>
            <span className={`status-badge ${profile?.isActive !== false ? "active" : "inactive"}`}>
              {profile?.isActive !== false ? tr("ui.active_ebe65b34") : tr("ui.account_suspended_e99d8854")}
            </span>
          </div>
          <div>
            <span className="profile-label">{tr("ui.password_reset_requirement_9026bfc9")}</span>
            <span className={`status-badge ${isTemporaryPassword ? "warning" : "ok"}`}>
              {isTemporaryPassword ? tr("ui.password_change_required_e4691737") : tr("ui.password_setup_complete_6805895a")}
            </span>
          </div>
        </div>

        {isTemporaryPassword && (
          <div className="profile-alert warning" role="alert">
            <ShieldAlert size={18} />
            <div>
              <strong>{tr("ui.your_account_uses_a_temporary_1ae2a5d7")}</strong>
              <p>{tr("ui.your_temporary_password_is_the_c2cf7b9c")}</p>
            </div>
          </div>
        )}

        {passwordError && <div className="profile-alert danger" role="alert">{translate(passwordError)}</div>}
        {passwordSuccess && <div className="profile-alert success" role="status"><CheckCircle2 size={16} />{passwordSuccess}</div>}

        <form onSubmit={handlePasswordChange} className="password-change-form">
          <h3 className="sub-heading"><KeyRound size={16} /> {tr("ui.change_password_4598a666")}</h3>
          <div className="password-inputs-grid">
            <label>
              <span className="profile-label">{tr("ui.current_password_7f06b3a5")}</span>
              <input
                type="password"
                className="profile-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={isTemporaryPassword ? tr("ui.phone_number_used_for_booking_9dbbeafd") : tr("ui.enter_current_password_60f70758")}
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              <span className="profile-label">{tr("ui.new_password_at_least_8_73426eef")}</span>
              <input
                type="password"
                className="profile-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={tr("ui.enter_new_password_ab4479c1")}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label>
              <span className="profile-label">{tr("ui.confirm_new_password_7a0fe0f4")}</span>
              <input
                type="password"
                className="profile-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={tr("ui.repeat_new_password_df8e638b")}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
          </div>
          <button type="submit" className="profile-button-secondary" disabled={passwordBusy}>
            {passwordBusy ? <Loader2 className="spin" size={16} /> : <KeyRound size={16} />}
            {tr("ui.update_password_a9f9616f")}</button>
        </form>
      </article>

      {/* 3. ACCESS / CUSTOMER CLASSIFICATION */}
      <article hidden={section !== "access"} className="profile-card profile-section-access" aria-labelledby="section-access-title">
        <div className="profile-card-title">
          <div>
            <h2 id="section-access-title">{tr("ui.3_user_classification_access_rules_88c093ba")}</h2>
            <p>{tr("ui.self_declared_classification_and_access_29a705f2")}</p>
          </div>
        </div>

        <div className="customer-classification-card">
          <div className="classification-header">
            <div>
              <span className="profile-label">{tr("ui.self_declared_user_classification_ebebf177")}</span>
              <strong>{customerType === "INTERNAL" ? tr("ui.institution_member_internal_24446cca") : tr("ui.external_visitor_partner_external_cc813018")}</strong>
            </div>
          </div>
          <p className="profile-access-note">{tr("refine.accessNote")}</p>
          <details><summary>{tr("refine.accessMore")}</summary><p>{tr("refine.accessExplanation")}</p>
          </details>
        </div>
      </article>

      {/* 4. TRAINING / CERTIFICATIONS */}
      <article hidden={section !== "access"} className="profile-card profile-section-training" aria-labelledby="section-training-title">
        <div className="profile-card-title">
          <div>
            <h2 id="section-training-title">{tr("ui.4_training_safety_certification_ab2b8bab")}</h2>
            <p>{tr("ui.certifications_required_to_use_specialist_8a51f0ef")}</p>
          </div>
        </div>

        {profile?.certifications && profile.certifications.length > 0 ? (
          <div className="certifications-table-wrapper">
            <table className="certifications-table">
              <thead>
                <tr>
                  <th scope="col">{tr("ui.course_code_8fb3d641")}</th>
                  <th scope="col">{tr("ui.training_course_8c81d890")}</th>
                  <th scope="col">{tr("ui.status_cb31de81")}</th>
                  <th scope="col">{tr("ui.issued_on_834bf76c")}</th>
                  <th scope="col">{tr("ui.expires_on_a7d00cd0")}</th>
                </tr>
              </thead>
              <tbody>
                {profile.certifications.map((cert: any) => (
                  <tr key={cert.id}>
                    <td><code>{cert.code}</code></td>
                    <td><strong>{cert.name}</strong></td>
                    <td>
                      <span className={`cert-badge cert-${cert.status.toLowerCase()}`}>
                        {cert.status === "VALID" ? tr("ui.valid_certification_63267c19") : cert.status === "EXPIRED" ? tr("ui.expired_c1275ab3") : cert.status}
                      </span>
                    </td>
                    <td>{formatVietnamDateTime(cert.issuedAt)}</td>
                    <td>{cert.expiresAt ? formatVietnamDateTime(cert.expiresAt) : tr("ui.no_expiry_e29f043f")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-cert-notice">
            <p>{tr("ui.no_safety_certifications_are_recorded_641de470")}</p>
            <small>{tr("ui.for_equipment_requiring_certification_the_b9c56c97")}</small>
          </div>
        )}
      </article>

      {/* 5. CONTACT & ADDRESS */}
      <form hidden={section !== "contact"} className="profile-card profile-section-contact" onSubmit={saveContactInfo} aria-labelledby="section-contact-title">
        <div className="profile-card-title">
          <div>
            <h2 id="section-contact-title">{tr("ui.5_contact_information_address_1cb1b94e")}</h2>
            <p>{tr("ui.contact_details_for_handover_coordination_aaf95d98")}</p>
          </div>
        </div>

        <div className="profile-form-grid">
          <label>
            <span className="profile-label">{tr("ui.full_name_03de764f")}</span>
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
            <span className="profile-label">{tr("ui.contact_phone_3b6da57f")}</span>
            <input
              className="profile-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
              autoComplete="tel"
            />
          </label>
          <label>
            <span className="profile-label">{tr("ui.department_organization_e30b494a")}</span>
            <input
              className="profile-input"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              maxLength={160}
              autoComplete="organization"
            />
          </label>
          <label>
            <span className="profile-label">{tr("ui.self_declared_user_group_753919d6")}</span>
            <select
              className="profile-input"
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
            >
              <option value="INTERNAL">{tr("ui.institution_member_self_declared_unverified_41cbfa62")}</option>
              <option value="EXTERNAL">{tr("ui.external_organization_visitor_38c915d8")}</option>
            </select>
          </label>
        </div>

        <div className="address-section-block">
          <span className="profile-label">{tr("ui.default_address_adc739e0")}</span>
          <VietnamAddressSelector value={address} onChange={setAddress} required />
        </div>

        <button className="profile-save" type="submit" disabled={saving}>
          {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
          {tr("ui.save_contact_information_226431d2")}</button>
      </form>

      {/* 6. BOOKING SUMMARY */}
      <article hidden={section !== "activity"} className="profile-card profile-section-booking" aria-labelledby="section-booking-title">
        <div className="profile-card-title">
          <div>
            <h2 id="section-booking-title">{tr("ui.6_booking_summary_b37a89e1")}</h2>
            <p>{tr("ui.overview_of_your_resource_bookings_f59eaa62")}</p>
          </div>
        </div>

        <div className="profile-stats-grid">
          <div className="stat-card">
            <span>{tr("ui.completed_sessions_0bcef6c3")}</span>
            <strong>{profile?.bookingSummary?.completed || 0}</strong>
            <small>{tr("ui.returned_and_completed_752f06e1")}</small>
          </div>
          <div className="stat-card">
            <span>{tr("ui.active_bookings_dc59721f")}</span>
            <strong>{profile?.bookingSummary?.active || 0}</strong>
            <small>{tr("ui.pending_confirmed_or_in_use_fbb49eba")}</small>
          </div>
          <div className="stat-card">
            <span>{tr("ui.total_bookings_1f94eda9")}</span>
            <strong>{profile?.bookingSummary?.total || 0}</strong>
            <small>{tr("ui.all_statuses_included_735dbe96")}</small>
          </div>
        </div>

        {profile?.bookingSummary?.byStatus && (
          <div className="booking-status-breakdown">
            {Object.entries(profile.bookingSummary.byStatus).map(([statusKey, count]: [string, any]) => (
              <span key={statusKey} className="status-count-chip">
                {tr(CANONICAL_BOOKING_STATUS_LABELS[statusKey]) || statusKey}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        )}
      </article>

      {/* 7. LOYALTY & COMMERCIAL INFORMATION (LAST) */}
      <article hidden={section !== "activity"} className="profile-card profile-section-loyalty" aria-labelledby="section-loyalty-title">
        <div className="profile-card-title">
          <div>
            <h2 id="section-loyalty-title">{tr("ui.7_lab_priority_points_reference_b6cf06b0")}</h2>
            <p>{tr("ui.tiers_and_points_support_administration_38bfe6cc")}</p>
          </div>
        </div>

        <div className="loyalty-grid">
          <div className="profile-tier-card">
            <span className="tier-kicker">{tr("ui.account_tier_0d8dbf74")}</span>
            <strong>{tierLabel(profile?.loyalty?.tier)}</strong>
            <span>{profile?.loyalty?.points || 0} {tr("ui.lab_points_54b2bf0e")}</span>
            <small>{tr("profile.loyaltyBasis")}</small>
          </div>

          <div className="profile-stats-grid">
            <div className="stat-card">
              <span><WalletCards size={16} /> {tr("ui.total_charges_f3aa0a19")}</span>
              <strong>{money(profile?.spending?.totalSpendVnd || 0)}</strong>
              <small>{profile?.spending?.successfulPayments || 0} {tr("ui.successful_transactions_8a78b428")}</small>
            </div>
            <div className="stat-card">
              <span><BadgePercent size={16} /> {tr("ui.discount_161ccd26")}</span>
              <strong>{((profile?.loyalty?.discountBps || 0) / 100).toFixed(1)}%</strong>
              <small>{tr("ui.subject_to_administrative_policy_fbecbd8e")}</small>
            </div>
            <div className="stat-card">
              <span><TrendingUp size={16} /> {tr("ui.scheduling_priority_score_89c8f69c")}</span>
              <strong>+{profile?.loyalty?.priorityBoost || 0}</strong>
              <small>{tr("ui.advisory_only_does_not_bypass_eb8b2ff8")}</small>
            </div>
          </div>
        </div>

        <p className="commercial-disclaimer">
          {tr("ui.points_and_tiers_are_advisory_4987a090")}</p>
      </article>
    </section>
  );
}
