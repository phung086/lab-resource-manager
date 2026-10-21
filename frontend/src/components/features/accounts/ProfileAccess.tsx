import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import { formatVietnamDateTime } from '../../../utils/timezone';
import { workspacePathForTab } from '../../../workspaceRoutes.js';

type Certification = { id: string; name: string; code: string; status: string; issuedAt: string; expiresAt?: string };
const statusLabels: Record<string, string> = { VALID: 'ui.valid_certification_63267c19', EXPIRED: 'ui.expired_c1275ab3', REVOKED: 'ui.account.certificationRevoked' };
export function ProfileAccess({ role, roleLabel, certifications }: { role: string; roleLabel: string; certifications?: Certification[] }) {
  const { tr, locale } = useLocale();
  const valid = certifications?.filter(cert => cert.status === 'VALID').length;
  return <>
    <div className="account-access-summary"><div className="account-access-role"><ShieldCheck size={22} aria-hidden="true" /><div><span>{tr('ui.role_35195dea')}</span><strong>{roleLabel}</strong></div></div>
    <p className="account-access-explanation">{tr('refine.accessExplanation')}</p></div>
    <section className="account-training" aria-labelledby="account-training-title">
      <div className="account-subheading"><h3 id="account-training-title">{tr('ui.account.certifications')}</h3>{valid !== undefined && <span className="account-status" data-tone={valid ? 'success' : 'neutral'}>{tr('ui.profile.validCertificates', { count: new Intl.NumberFormat(locale).format(valid) })}</span>}</div>
      {Boolean(certifications?.length) && <p className="account-hint">{tr('ui.profile.certificationHint')}</p>}
      {!certifications ? <p className="account-warning">{tr('ui.profile.certificationsUnavailable')}</p> : certifications.length ? <ul className="account-certifications">{certifications.map(cert => <li key={cert.id}>
        <div className="account-certification-title"><div><strong>{cert.name}</strong><span>{cert.code}</span></div><span className="account-status" data-tone={cert.status === 'VALID' ? 'success' : cert.status === 'EXPIRED' ? 'warning' : 'neutral'}>{statusLabels[cert.status] ? tr(statusLabels[cert.status]) : cert.status}</span></div>
        <dl><div><dt>{tr('ui.profile.issuedOn')}</dt><dd>{formatVietnamDateTime(cert.issuedAt)}</dd></div><div><dt>{tr('ui.expires_on_a7d00cd0')}</dt><dd>{cert.expiresAt ? formatVietnamDateTime(cert.expiresAt) : tr('ui.no_expiry_e29f043f')}</dd></div></dl>
      </li>)}</ul> : <div className="account-empty"><ShieldCheck size={32} aria-hidden="true" /><h3>{tr('ui.no_safety_certifications_are_recorded_641de470')}</h3><p>{tr('ui.profile.emptyCertificationHint')}</p></div>}
      <a className="account-text-link" href={workspacePathForTab('resources')}>{tr('ui.profile.checkResourceRequirements')}<ArrowRight size={16} aria-hidden="true" /></a>
    </section>
    {role !== 'CUSTOMER' && <div className="account-section-action"><a className="btn btn-secondary" href={workspacePathForTab(role === 'ADMIN' ? 'users' : 'dashboard')}>{tr(role === 'ADMIN' ? 'ui.roleProfile.manageAccess' : 'ui.roleProfile.operations')}<ArrowRight size={16} aria-hidden="true" /></a></div>}
  </>;
}
