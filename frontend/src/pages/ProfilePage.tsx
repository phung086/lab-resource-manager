import { HelpDisclosure } from "../components/base/HelpDisclosure";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, KeyRound, Save, ShieldCheck } from 'lucide-react';
import { useLocale } from '../providers/LocaleProvider';
import { apiRequest } from '../api.js';
import { VietnamAddressSelector } from '../components/VietnamAddressSelector';
import { formatVietnamDateTime } from '../utils/timezone';
import { CANONICAL_BOOKING_STATUS_LABELS } from '../constants.js';
import { validatePassword, validateProfile } from '../utils/profileValidation';
import { navigateApp, readRouteParams, workspacePathForTab } from '../workspaceRoutes.js';
import '../styles/account-workspace.css';

type Address = { addressLine: string; provinceCode: string; wardCode: string };
const sections = ['contact', 'security', 'access', 'activity'];
const sectionFromRoute = () => { const value = readRouteParams().get('section') || 'contact'; return sections.includes(value) ? value : 'contact'; };
const roles: Record<string,string> = { ADMIN:'ui.administrator_d00831ec', LAB_STAFF:'ui.lab_staff_1b410267', CUSTOMER: 'core.roles.customer' };
const failure = (cause: unknown) => cause instanceof Error ? cause.message : 'ui.account.requestFailed';

export function ProfilePage({ user, onUserUpdated }: { user: any; onUserUpdated: (user: any) => void }) {
 const { tr, locale } = useLocale(), busyRef = useRef(false), contactRef = useRef<HTMLFormElement>(null), passwordRef = useRef<HTMLFormElement>(null);
 const [section,setSection] = useState(sectionFromRoute), [profile,setProfile] = useState<any>(null), [loading,setLoading] = useState(true), [readError,setReadError] = useState(''), [retry,setRetry] = useState(0);
 const [contact,setContact] = useState({fullName:'',phone:'',organization:'',customerType:'INTERNAL'});
 const [address,setAddress] = useState<Address>({addressLine:'',provinceCode:'',wardCode:''});
 const [password,setPassword] = useState({currentPassword:'',newPassword:'',confirmPassword:''});
 const [contactErrors,setContactErrors] = useState<Record<string,string>>({}), [passwordErrors,setPasswordErrors] = useState<Record<string,string>>({});
 const [busy,setBusy] = useState(''), [error,setError] = useState(''), [success,setSuccess] = useState('');
 const [passwordError,setPasswordError] = useState(''), [passwordSuccess,setPasswordSuccess] = useState('');
 useEffect(() => {
   const controller = new AbortController(); setLoading(true); setReadError(''); setProfile(null);
   apiRequest('/users/me',{signal:controller.signal}).then(payload => {
     if(controller.signal.aborted) return;
     setProfile(payload); setContact({fullName:payload.fullName || '',phone:payload.phone || '',organization:payload.organization || '',customerType:payload.customerType || 'INTERNAL'});
     setAddress({addressLine:payload.defaultAddress?.addressLine || '',provinceCode:String(payload.defaultAddress?.provinceCode || ''),wardCode:String(payload.defaultAddress?.wardCode || '')});
   }).catch((cause: unknown) => { if(!controller.signal.aborted) setReadError(failure(cause)); }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
   return()=>controller.abort();
 },[user?.id,retry]);
 useEffect(()=>{const sync=()=>setSection(sectionFromRoute()); window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[]);
 function chooseSection(next: string) { setSection(next); const params=readRouteParams(); params.set('section',next); navigateApp(workspacePathForTab('profile',params),{notify:false}); }
 const focusField = useCallback((ref: React.RefObject<HTMLFormElement | null>, name: string) => { const id = ['addressLine','provinceCode','wardCode'].includes(name) ? ({addressLine:'address-line',provinceCode:'address-province',wardCode:'address-ward'} as Record<string,string>)[name] : 'account-'+name; ref.current?.querySelector<HTMLElement>('[id="' + id + '"]')?.focus(); },[]);
 function updateContact(field: string,value: string) { setContact(current=>({...current,[field]:value})); setContactErrors(current=>{const next={...current};delete next[field];return next;}); }
 function updatePassword(field: string,value: string) { setPassword(current=>({...current,[field]:value})); setPasswordErrors(current=>{const next={...current};delete next[field];return next;}); }
 async function saveContact(event: React.FormEvent) {
  event.preventDefault(); if(busyRef.current || !profile) return;
  const result=validateProfile({...contact,address});setContactErrors(result.errors);setError('');setSuccess('');
  if(!result.data){focusField(contactRef,Object.keys(result.errors)[0]);return;}
  busyRef.current=true;setBusy('contact');
  try { const payload=await apiRequest('/users/me',{method:'PATCH',body:JSON.stringify(result.data)});setProfile(payload);localStorage.setItem('lrm_user',JSON.stringify(payload));onUserUpdated(payload);setSuccess('ui.contact_information_and_address_updated_f70717db'); }
  catch(cause: unknown){setError(failure(cause));}finally{busyRef.current=false;setBusy('');}
 }
 async function savePassword(event: React.FormEvent) {
  event.preventDefault();if(busyRef.current || !profile)return;
  const result=validatePassword(password);setPasswordErrors(result.errors);setPasswordError('');setPasswordSuccess('');
  if(!result.data){focusField(passwordRef,Object.keys(result.errors)[0]);return;}
  busyRef.current=true;setBusy('security');
  try{await apiRequest('/auth/change-password',{method:'POST',body:JSON.stringify(result.data)});setPassword({currentPassword:'',newPassword:'',confirmPassword:''});setPasswordSuccess('ui.new_password_saved_f9b9598f');const next={...profile,passwordResetRequired:false};setProfile(next);localStorage.setItem('lrm_user',JSON.stringify(next));onUserUpdated(next);}
  catch(cause: unknown){const error = cause as { code?: string }; if(error.code==='CURRENT_PASSWORD_INVALID'){setPasswordErrors({currentPassword:'ui.customer.currentPasswordInvalid'});focusField(passwordRef,'currentPassword');}else setPasswordError(failure(cause));}finally{busyRef.current=false;setBusy('');}
 }
 function summary(errors: Record<string,string>,ref: React.RefObject<HTMLFormElement | null>) {
  return Object.keys(errors).length ? <div className="account-error account-error-summary" role="alert"><strong>{tr('ui.account.checkFields')}</strong><ul>{Object.entries(errors).map(([field,key])=><li key={field}><a href={'#account-'+field} onClick={event=>{event.preventDefault();focusField(ref,field);}}>{tr(key)}</a></li>)}</ul></div> : null;
 }
 const money = (amount: number) => new Intl.NumberFormat(locale==='en'?'en-GB':'vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(amount);
 if(loading || !profile) return <section className="account-workspace" aria-busy={loading}><h1>{tr('refine.account')}</h1>{loading ? <p role="status">{tr('ui.loading_profile_6e226af8')}</p> : <div className="account-error" role="alert"><p>{tr(readError || 'ui.could_not_load_profile_8b6760f5')}</p><button type="button" className="btn btn-secondary" onClick={()=>setRetry(value=>value+1)}>{tr('ui.users.retry')}</button></div>}</section>;
 return <section className="account-workspace" aria-labelledby="account-title">
  <header className="account-heading"><h1 id="account-title">{tr('refine.account')}</h1><HelpDisclosure>{tr('ui.account.subtitle')}</HelpDisclosure></header>
  <div className="account-layout">
   <aside className="account-rail"><div className="account-identity"><span className="account-initial" aria-hidden="true">{profile.fullName?.trim().slice(0,1).toUpperCase()}</span><h2>{profile.fullName || profile.email}</h2><p>{profile.email}</p><span className="account-role">{tr(roles[profile.role] || 'ui.users.roleRequired')}</span></div>
    <nav aria-label={tr('refine.accountSections')}>{sections.map(value=><button type="button" key={value} aria-pressed={section===value} onClick={()=>chooseSection(value)}>{tr('refine.'+value)}<ArrowRight size={15} aria-hidden="true" /></button>)}</nav>
    {profile.passwordResetRequired && <button type="button" className="account-security-notice" onClick={()=>chooseSection('security')}><KeyRound size={16} />{tr('ui.password_change_required_e4691737')}</button>}
   </aside>
   <div className="account-content">
    <section hidden={section!=='contact'} aria-labelledby="account-contact-title"><header><h2 id="account-contact-title">{tr('refine.contact')}</h2><HelpDisclosure>{tr('ui.contact_details_for_handover_coordination_aaf95d98')}</HelpDisclosure></header>
     <form ref={contactRef} onSubmit={saveContact} noValidate>{summary(contactErrors,contactRef)}{error && <p className="account-error" role="alert">{tr(error)}</p>}{success && <p className="account-success" role="status">{tr(success)}</p>}
      <fieldset disabled={!!busy}><div className="account-form-grid">
       {[{name:'fullName',label:'ui.full_name_03de764f',max:255,type:'text',autocomplete:'name'},{name:'phone',label:'ui.contact_phone_3b6da57f',max:20,type:'tel',autocomplete:'tel'},{name:'organization',label:'ui.department_organization_e30b494a',max:160,type:'text',autocomplete:'organization'}].map(field=><label key={field.name} htmlFor={'account-'+field.name}>{tr(field.label)}<input id={'account-'+field.name} name={field.name} type={field.type} value={contact[field.name as keyof typeof contact]} maxLength={field.max} autoComplete={field.autocomplete} required={field.name==='fullName'} aria-invalid={!!contactErrors[field.name]} aria-describedby={contactErrors[field.name]?'account-'+field.name+'-error':undefined} onChange={event=>updateContact(field.name,event.target.value)} />{contactErrors[field.name] && <span id={'account-'+field.name+'-error'} className="account-field-error">{tr(contactErrors[field.name])}</span>}</label>)}
       <label htmlFor="account-customerType">{tr('ui.self_declared_user_group_753919d6')}<select id="account-customerType" value={contact.customerType} onChange={event=>updateContact('customerType',event.target.value)}><option value="INTERNAL">{tr('ui.institution_member_self_declared_unverified_41cbfa62')}</option><option value="EXTERNAL">{tr('ui.external_organization_visitor_38c915d8')}</option></select></label>
      </div><div className="account-address"><h3>{tr('ui.default_address_adc739e0')}</h3><p>{tr('ui.account.addressHint')}</p><VietnamAddressSelector value={address} onChange={value=>{setAddress(value);setContactErrors(current=>{const next={...current};delete next.addressLine;delete next.provinceCode;delete next.wardCode;return next;});}} fieldErrors={contactErrors} /></div>
      <button type="submit" className="btn btn-primary"><Save size={16} />{tr(busy==='contact'?'ui.users.saving':'ui.save_contact_information_226431d2')}</button></fieldset>
     </form>
    </section>
    <section hidden={section!=='security'} aria-labelledby="account-security-title"><header><h2 id="account-security-title">{tr('refine.security')}</h2></header>
     <dl className="account-facts"><div><dt>{tr('ui.account_status_00a4b83c')}</dt><dd>{tr(profile.isActive?'ui.active_767d67bb':'ui.inactive_50157a4c')}</dd></div><div><dt>{tr('ui.password_reset_requirement_9026bfc9')}</dt><dd>{tr(profile.passwordResetRequired?'ui.password_change_required_e4691737':'ui.password_setup_complete_6805895a')}</dd></div></dl>
     {profile.passwordResetRequired && <p className="account-warning" role="status">{tr('ui.your_temporary_password_is_the_c2cf7b9c')}</p>}
     <form ref={passwordRef} onSubmit={savePassword} noValidate><h3>{tr('ui.change_password_4598a666')}</h3><p className="account-hint">{tr('ui.account.passwordHint')}</p>{summary(passwordErrors,passwordRef)}{passwordError && <p className="account-error" role="alert">{tr(passwordError)}</p>}{passwordSuccess && <p className="account-success" role="status">{tr(passwordSuccess)}</p>}
      <fieldset disabled={!!busy}><div className="account-password-fields">{[{name:'currentPassword',label:'ui.current_password_7f06b3a5'},{name:'newPassword',label:'ui.new_password_at_least_8_73426eef'},{name:'confirmPassword',label:'ui.confirm_new_password_7a0fe0f4'}].map(field=><label key={field.name} htmlFor={'account-'+field.name}>{tr(field.label)}<input id={'account-'+field.name} name={field.name} type="password" required minLength={8} maxLength={128} autoComplete={field.name==='currentPassword'?'current-password':'new-password'} value={password[field.name as keyof typeof password]} aria-invalid={!!passwordErrors[field.name]} aria-describedby={passwordErrors[field.name]?'account-'+field.name+'-error':undefined} onChange={event=>updatePassword(field.name,event.target.value)} />{passwordErrors[field.name] && <span id={'account-'+field.name+'-error'} className="account-field-error">{tr(passwordErrors[field.name])}</span>}</label>)}</div><button type="submit" className="btn btn-primary"><KeyRound size={16} />{tr(busy==='security'?'ui.users.saving':'ui.update_password_a9f9616f')}</button></fieldset>
     </form>
    </section>
    <section hidden={section!=='access'} aria-labelledby="account-access-title"><header><h2 id="account-access-title">{tr('refine.access')}</h2><p>{tr('refine.accessNote')}</p></header><dl className="account-facts"><div><dt>{tr('ui.role_35195dea')}</dt><dd>{tr(roles[profile.role])}</dd></div><div><dt>{tr('ui.self_declared_user_classification_ebebf177')}</dt><dd>{tr(profile.customerType==='EXTERNAL'?'ui.external_visitor_partner_external_cc813018':'ui.institution_member_internal_24446cca')}</dd></div></dl><details><summary>{tr('refine.accessMore')}</summary><p>{tr('refine.accessExplanation')}</p></details>
     <div className="account-training"><h3><ShieldCheck size={18} />{tr('ui.account.certifications')}</h3><HelpDisclosure>{tr('ui.certifications_required_to_use_specialist_8a51f0ef')}</HelpDisclosure>
      {profile.certifications?.length ? <div className="account-table table-wrap"><table><caption className="sr-only">{tr('ui.account.certifications')}</caption><thead><tr><th>{tr('ui.training_course_8c81d890')}</th><th>{tr('ui.status_cb31de81')}</th><th>{tr('ui.expires_on_a7d00cd0')}</th></tr></thead><tbody>{profile.certifications.map((cert: any)=><tr key={cert.id}><td><strong>{cert.name}</strong><small>{cert.code} · {formatVietnamDateTime(cert.issuedAt)}</small></td><td>{tr(cert.status==='VALID'?'ui.valid_certification_63267c19':cert.status==='EXPIRED'?'ui.expired_c1275ab3':'ui.account.certificationRevoked')}</td><td>{cert.expiresAt?formatVietnamDateTime(cert.expiresAt):tr('ui.no_expiry_e29f043f')}</td></tr>)}</tbody></table></div> : <div className="account-empty"><p>{tr('ui.no_safety_certifications_are_recorded_641de470')}</p><small>{tr('ui.for_equipment_requiring_certification_the_b9c56c97')}</small></div>}
     </div>
    </section>
    <section hidden={section!=='activity'} aria-labelledby="account-activity-title"><header><h2 id="account-activity-title">{tr('refine.activity')}</h2></header>
     <dl className="account-facts"><div><dt>{tr('ui.total_bookings_1f94eda9')}</dt><dd>{profile.bookingSummary?.total ?? '—'}</dd></div><div><dt>{tr('ui.active_bookings_dc59721f')}</dt><dd>{profile.bookingSummary?.active ?? '—'}</dd></div><div><dt>{tr('ui.completed_sessions_0bcef6c3')}</dt><dd>{profile.bookingSummary?.completed ?? '—'}</dd></div></dl>
     {Object.keys(profile.bookingSummary?.byStatus || {}).length > 0 && <div className="account-table table-wrap"><table><caption className="sr-only">{tr('ui.account.bookingBreakdown')}</caption><thead><tr><th>{tr('ui.status_cb31de81')}</th><th>{tr('ui.account.count')}</th></tr></thead><tbody>{Object.entries(profile.bookingSummary.byStatus).map(([status,count])=><tr key={status}><td>{tr(CANONICAL_BOOKING_STATUS_LABELS[status]) || status}</td><td>{String(count)}</td></tr>)}</tbody></table></div>}
     <a className="btn btn-secondary" href={workspacePathForTab('bookings')}>{tr('ui.open_bookings_a9348073')}<ArrowRight size={16} /></a>
     <details className="account-commercial"><summary>{tr('ui.account.commercialReference')}</summary><p>{tr('ui.points_and_tiers_are_advisory_4987a090')}</p><dl className="account-facts"><div><dt>{tr('ui.account_tier_0d8dbf74')}</dt><dd>{String(profile.loyalty?.tier || '—').replaceAll('_',' ')}</dd></div><div><dt>{tr('ui.lab_points_54b2bf0e')}</dt><dd>{profile.loyalty?.points ?? '—'}</dd></div><div><dt>{tr('ui.total_charges_f3aa0a19')}</dt><dd>{money(profile.spending?.totalSpendVnd || 0)}</dd></div><div><dt>{tr('ui.successful_transactions_8a78b428')}</dt><dd>{profile.spending?.successfulPayments ?? '—'}</dd></div><div><dt>{tr('ui.discount_161ccd26')}</dt><dd>{((profile.loyalty?.discountBps || 0)/100).toFixed(1)}%</dd></div><div><dt>{tr('ui.scheduling_priority_score_89c8f69c')}</dt><dd>{profile.loyalty?.priorityBoost ?? '—'}</dd></div></dl><small>{tr('profile.loyaltyBasis')}</small></details>
    </section>
   </div>
  </div>
 </section>;
}
