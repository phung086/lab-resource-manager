import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChartNoAxesCombined, Check, ChevronDown, CircleCheck, KeyRound, LockKeyhole, Mail, MapPin, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useLocale } from '../providers/LocaleProvider';
import { apiRequest } from '../api.js';
import { storeAuthUser } from '../services/authStorage.js';
import { VietnamAddressSelector } from '../components/VietnamAddressSelector';
import { validateProfile } from '../utils/profileValidation';
import { PasswordChangeForm } from '../components/features/accounts/PasswordChangeForm';
import { LoyaltySummary } from '../components/features/accounts/LoyaltySummary';
import { ProfileActivity } from '../components/features/accounts/ProfileActivity';
import { ProfileAccess } from '../components/features/accounts/ProfileAccess';
import { SessionSecurity } from '../components/features/accounts/SessionSecurity';
import { navigateApp, readRouteParams, workspacePathForTab } from '../workspaceRoutes.js';
import '../styles/account-workspace.css';

type Address = { addressLine: string; provinceCode: string; wardCode: string };
const sections = ['contact', 'security', 'access', 'activity'];
const sectionFromRoute = (fallback: string) => { const value = readRouteParams().get('section') || fallback; return sections.includes(value) ? value : fallback; };
const roles: Record<string,string> = { ADMIN:'ui.administrator_d00831ec', LAB_STAFF:'ui.lab_staff_1b410267', CUSTOMER: 'core.roles.customer' };
const sectionIcons = { contact: UserRound, security: LockKeyhole, access: ShieldCheck, activity: ChartNoAxesCombined };
const failure = (cause: unknown) => cause instanceof Error ? cause.message : 'ui.account.requestFailed';
const contactFrom = (profile: any) => ({fullName:profile.fullName || '',phone:profile.phone || ''});
const addressFrom = (profile: any): Address => ({addressLine:profile.defaultAddress?.addressLine || '',provinceCode:String(profile.defaultAddress?.provinceCode || ''),wardCode:String(profile.defaultAddress?.wardCode || '')});

export function ProfilePage({ user, onUserUpdated }: { user: any; onUserUpdated: (user: any) => void }) {
 const { tr, locale } = useLocale(), busyRef = useRef(false), contactRef = useRef<HTMLFormElement>(null);
 const role = user.role === 'ADMIN' ? 'ADMIN' : user.role === 'LAB_STAFF' ? 'LAB_STAFF' : 'CUSTOMER';
 const orderedSections = role === 'ADMIN' ? ['security','access','contact','activity'] : role === 'LAB_STAFF' ? ['access','contact','security','activity'] : sections;
 const defaultSection = orderedSections[0];
 const [section,setSection] = useState(() => sectionFromRoute(defaultSection)), [profile,setProfile] = useState<any>(null), [loading,setLoading] = useState(true), [readError,setReadError] = useState(''), [retry,setRetry] = useState(0);
 const [contact,setContact] = useState({fullName:'',phone:''});
 const [address,setAddress] = useState<Address>({addressLine:'',provinceCode:'',wardCode:''});
 const [addressOpen,setAddressOpen] = useState(false);
 const [contactErrors,setContactErrors] = useState<Record<string,string>>({});
 const [busy,setBusy] = useState(''), [error,setError] = useState(''), [success,setSuccess] = useState('');
 useEffect(() => {
   const controller = new AbortController(); setLoading(true); setReadError(''); setProfile(null);
   apiRequest('/users/me',{signal:controller.signal}).then(payload => {
     if(controller.signal.aborted) return;
     setProfile(payload); setContact(contactFrom(payload)); setAddress(addressFrom(payload));
     setAddressOpen(Boolean(payload.defaultAddress?.addressLine || payload.defaultAddress?.provinceCode || payload.defaultAddress?.wardCode));
   }).catch((cause: unknown) => { if(!controller.signal.aborted) setReadError(failure(cause)); }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
   return()=>controller.abort();
 },[user?.id,retry]);
 useEffect(()=>{const sync=()=>setSection(sectionFromRoute(defaultSection)); window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[defaultSection]);
 function chooseSection(next: string) { setSection(next); const params=readRouteParams(); params.set('section',next); navigateApp(workspacePathForTab('profile',params),{notify:false}); }
 const focusField = useCallback((ref: React.RefObject<HTMLFormElement | null>, name: string) => { const id = ['addressLine','provinceCode','wardCode'].includes(name) ? ({addressLine:'address-line',provinceCode:'address-province',wardCode:'address-ward'} as Record<string,string>)[name] : 'account-'+name; const field=ref.current?.querySelector<HTMLElement>('[id="' + id + '"]'); const details=field?.closest('details'); if(details) details.open=true; field?.focus(); },[]);
 function updateContact(field: string,value: string) { setContact(current=>({...current,[field]:value})); setSuccess(''); setContactErrors(current=>{const next={...current};delete next[field];return next;}); }
 async function saveContact(event: React.FormEvent) {
  event.preventDefault(); if(busyRef.current || !profile) return;
  const result=validateProfile({...contact,address});setContactErrors(result.errors);setError('');setSuccess('');
  if(!result.data){focusField(contactRef,Object.keys(result.errors)[0]);return;}
  busyRef.current=true;setBusy('contact');
  try { const payload=await apiRequest('/users/me',{method:'PATCH',body:JSON.stringify(result.data)});setProfile(payload);setContact(contactFrom(payload));setAddress(addressFrom(payload));storeAuthUser(payload);onUserUpdated(payload);setSuccess('ui.contact_information_and_address_updated_f70717db'); }
  catch(cause: unknown){setError(failure(cause));}finally{busyRef.current=false;setBusy('');}
 }
 function summary(errors: Record<string,string>,ref: React.RefObject<HTMLFormElement | null>) {
  return Object.keys(errors).length ? <div className="account-error account-error-summary" role="alert"><strong>{tr('ui.account.checkFields')}</strong><ul>{Object.entries(errors).map(([field,key])=><li key={field}><a href={'#account-'+field} onClick={event=>{event.preventDefault();focusField(ref,field);}}>{tr(key)}</a></li>)}</ul></div> : null;
 }
 if(loading || !profile) return <section className="account-workspace" aria-busy={loading}><h1>{tr('refine.account')}</h1>{loading ? <><p role="status">{tr('ui.loading_profile_6e226af8')}</p><div className="account-loading" aria-hidden="true"><div /><div /><div /></div></> : <div className="account-error" role="alert"><p>{tr(readError || 'ui.could_not_load_profile_8b6760f5')}</p><button type="button" className="btn btn-secondary" onClick={()=>setRetry(value=>value+1)}>{tr('ui.users.retry')}</button></div>}</section>;
 const contactChanged = JSON.stringify(contact)!==JSON.stringify(contactFrom(profile)) || JSON.stringify(address)!==JSON.stringify(addressFrom(profile));
 const joinedAt = profile.createdAt && !Number.isNaN(Date.parse(profile.createdAt)) ? new Intl.DateTimeFormat(locale==='en'?'en-GB':'vi-VN',{dateStyle:'medium',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(profile.createdAt)) : null;
 return <section className="account-workspace" data-role={role} aria-labelledby="account-title">
  <header className="account-heading"><h1 id="account-title">{tr('ui.roleProfile.'+role+'.title')}</h1><p>{tr('ui.roleProfile.'+role+'.hint')}</p></header>
  <div className="account-identity">
   <span className="account-initial" aria-hidden="true">{profile.fullName?.trim().slice(0,1).toUpperCase() || <UserRound size={28} />}</span>
   <div className="account-identity-name"><div><h2>{profile.fullName || profile.email}</h2><span className="account-role">{tr(roles[profile.role] || 'ui.users.roleRequired')}</span></div><p><Mail size={15} aria-hidden="true" />{profile.email}</p></div>
   <div className="account-identity-meta"><span className="account-status" data-tone={profile.isActive?'success':'neutral'}><CircleCheck size={15} aria-hidden="true" />{tr(profile.isActive?'ui.active_767d67bb':'ui.inactive_50157a4c')}</span>{joinedAt && <small>{tr('ui.profile.joinedAt',{date:joinedAt})}</small>}</div>
  </div>
  {profile.passwordResetRequired && <button type="button" className="account-security-notice" onClick={()=>chooseSection('security')}><KeyRound size={18} aria-hidden="true" /><span>{tr('ui.password_change_required_e4691737')}</span><ArrowRight size={16} aria-hidden="true" /></button>}
  <nav className="account-navigation" aria-label={tr('refine.accountSections')}>{orderedSections.map(value=>{const Icon=sectionIcons[value as keyof typeof sectionIcons];return <button type="button" key={value} aria-pressed={section===value} aria-controls={'account-'+value+'-panel'} onClick={()=>chooseSection(value)}><Icon size={18} aria-hidden="true" />{tr('refine.'+value)}</button>;})}</nav>
  <div className="account-layout">
   <div className="account-content">
    <section id="account-contact-panel" hidden={section!=='contact'} aria-labelledby="account-contact-title"><header><h2 id="account-contact-title">{tr('refine.contact')}</h2><p>{tr('ui.account.contactHint')}</p></header>
     <form ref={contactRef} onSubmit={saveContact} noValidate>{summary(contactErrors,contactRef)}{error && <p className="account-error" role="alert">{tr(error)}</p>}{success && <p className="account-success" role="status"><Check size={18} aria-hidden="true" />{tr(success)}</p>}
      <fieldset disabled={!!busy}><div className="account-form-grid">
       {[{name:'fullName',label:'ui.full_name_03de764f',max:255,type:'text',autocomplete:'name'},{name:'phone',label:'ui.contact_phone_3b6da57f',max:20,type:'tel',autocomplete:'tel'}].map(field=><div className="account-field" key={field.name}><label htmlFor={'account-'+field.name}>{tr(field.label)}<span className="account-field-requirement">{tr(field.name==='fullName'?'ui.profile.required':'ui.optional_2e85bddf')}</span></label><input id={'account-'+field.name} name={field.name} type={field.type} value={contact[field.name as keyof typeof contact]} maxLength={field.max} autoComplete={field.autocomplete} required={field.name==='fullName'} aria-invalid={!!contactErrors[field.name]} aria-describedby={contactErrors[field.name]?'account-'+field.name+'-error':undefined} onChange={event=>updateContact(field.name,event.target.value)} />{contactErrors[field.name] && <span id={'account-'+field.name+'-error'} className="account-field-error">{tr(contactErrors[field.name])}</span>}</div>)}
      </div><details className="account-address" open={addressOpen} onToggle={event=>setAddressOpen(event.currentTarget.open)}><summary><MapPin size={19} aria-hidden="true" /><span>{tr('ui.default_address_adc739e0')}<small>{tr('ui.optional_2e85bddf')}</small></span><ChevronDown size={18} aria-hidden="true" /></summary><div className="account-address-fields"><p>{tr('ui.account.addressHint')}</p><VietnamAddressSelector value={address} onChange={value=>{setAddress(value);setSuccess('');setContactErrors(current=>{const next={...current};delete next.addressLine;delete next.provinceCode;delete next.wardCode;return next;});}} fieldErrors={contactErrors} /></div></details>
      <div className="account-contact-actions"><button type="submit" className="btn btn-primary" disabled={!contactChanged}><Save size={16} aria-hidden="true" />{tr(busy==='contact'?'ui.users.saving':'ui.save_contact_information_226431d2')}</button><span className="account-save-state" role="status">{tr(contactChanged?'ui.profile.unsavedChanges':'ui.profile.upToDate')}</span></div></fieldset>
     </form>
    </section>
    <section id="account-security-panel" hidden={section!=='security'} aria-labelledby="account-security-title"><header><h2 id="account-security-title">{tr('refine.security')}</h2><p>{tr('ui.profile.securityHint')}</p></header>
     <dl className="account-assurance"><div><dt>{tr('ui.account_status_00a4b83c')}</dt><dd><span className="account-status" data-tone={profile.isActive?'success':'neutral'}>{tr(profile.isActive?'ui.active_767d67bb':'ui.inactive_50157a4c')}</span></dd></div><div><dt>{tr('ui.profile.passwordState')}</dt><dd><span className="account-status" data-tone={profile.passwordResetRequired?'warning':'success'}>{tr(profile.passwordResetRequired?'ui.password_change_required_e4691737':'ui.password_setup_complete_6805895a')}</span></dd></div></dl>
     {profile.passwordResetRequired && <p className="account-warning" role="status">{tr('ui.your_temporary_password_is_the_c2cf7b9c')}</p>}
     <SessionSecurity />
     <h3 className="account-password-title"><KeyRound size={19} aria-hidden="true" />{tr('ui.profile.changePassword')}</h3>
     <PasswordChangeForm email={profile.email} showSteps onBusyChange={value => { busyRef.current=value; setBusy(value?'security':''); }} onSuccess={result => { const next={...profile,...(result as {user?: object}).user}; setProfile(next); onUserUpdated(next); }} />
    </section>
    <section id="account-access-panel" hidden={section!=='access'} aria-labelledby="account-access-title"><header><h2 id="account-access-title">{tr('refine.access')}</h2><p>{tr('refine.accessNote')}</p></header><ProfileAccess role={role} roleLabel={tr(roles[profile.role])} certifications={profile.certifications} /></section>
    <section id="account-activity-panel" hidden={section!=='activity'} aria-labelledby="account-activity-title"><header><h2 id="account-activity-title">{tr('ui.profile.activityTitle')}</h2><p>{tr('ui.profile.activityHint')}</p></header><ProfileActivity summary={profile.bookingSummary} spending={profile.spending} /></section>
   </div>
   <aside className="account-context" aria-label={tr('ui.profile.contextLabel')}>
    {profile.role==='CUSTOMER' && <LoyaltySummary loyalty={profile.loyalty} />}
    <section className="account-context-note"><h2>{tr('ui.profile.context.'+section+'Title')}</h2><p>{tr('ui.profile.context.'+section+'Hint')}</p>{section==='security' && <p className="account-context-email"><Mail size={16} aria-hidden="true" />{profile.email}</p>}{section==='access' && <a href={workspacePathForTab('resources')}>{tr('ui.profile.exploreResources')}<ArrowRight size={15} aria-hidden="true" /></a>}</section>
   </aside>
  </div>
 </section>;
}
