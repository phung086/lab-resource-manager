import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { apiRequest, storeAuthResult } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import '../../../styles/google-sign-in.css';

type GoogleId = { initialize: (options: { client_id:string; nonce:string; auto_select:boolean; callback:(result:{credential:string})=>void })=>void; renderButton:(node:HTMLElement, options:Record<string,unknown>)=>void; cancel:()=>void };
declare global { interface Window { google?: { accounts:{ id:GoogleId } } } }
let sdkPromise: Promise<GoogleId> | null = null;
function loadGoogleSdk() {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement('script'); script.src='https://accounts.google.com/gsi/client'; script.async=true;
    const fail = () => { clearTimeout(timer); script.remove(); sdkPromise=null; reject(new Error('api.GOOGLE_UNAVAILABLE')); };
    const timer = window.setTimeout(fail, 10000);
    script.onerror=fail;
    script.onload=()=>{ clearTimeout(timer); if(window.google?.accounts.id)resolve(window.google.accounts.id);else fail(); };
    document.head.appendChild(script);
  });
  return sdkPromise;
}
function GoogleMark() {
  return <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285f4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4 6v5h6.5c3.8-3.5 6.1-8.6 6.1-14.7Z"/><path fill="#34a853" d="M24 44c5.4 0 9.9-1.8 13.2-4.8l-6.5-5c-1.8 1.2-4.1 1.9-6.7 1.9-5.2 0-9.7-3.5-11.3-8.2H6v5.2C9.3 39.6 16.1 44 24 44Z"/><path fill="#fbbc05" d="M12.7 27.9a12 12 0 0 1 0-7.8v-5.2H6a20 20 0 0 0 0 18.2Z"/><path fill="#ea4335" d="M24 11.9c2.9 0 5.4 1 7.4 2.9l5.6-5.6A19 19 0 0 0 24 4C16.1 4 9.3 8.4 6 14.9l6.7 5.2A12 12 0 0 1 24 11.9Z"/></svg>;
}

export function GoogleSignIn({ mode = 'login', onAuthenticated, disabled = false, busyRef, onBusyChange }: {
  mode?:'login'|'register'; onAuthenticated:(user:unknown)=>void; disabled?:boolean;
  busyRef:{current:boolean}; onBusyChange:(busy:boolean)=>void;
}) {
  const { tr, locale } = useLocale(), passwordId = useId();
  const container=useRef<HTMLDivElement>(null), mounted=useRef(true), callbacks=useRef({onAuthenticated,onBusyChange});
  callbacks.current={onAuthenticated,onBusyChange};
  const [state,setState]=useState<'loading'|'ready'|'unavailable'|'error'>('loading');
  const [error,setError]=useState(''), [revision,setRevision]=useState(0), [busy,setBusy]=useState(false);
  const [pending,setPending]=useState<{credential:string;nonce:string}|null>(null), [password,setPassword]=useState('');
  const errorRef=useRef<HTMLParagraphElement>(null), passwordRef=useRef<HTMLInputElement>(null);
  const authenticateRef=useRef(authenticate); authenticateRef.current=authenticate;
  useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
  useEffect(()=>{
    if(pending && !busy) passwordRef.current?.focus();
  },[pending,busy]);
  useEffect(()=>{
    mounted.current=true; const controller=new AbortController(); let active=true;
    const node=container.current; setState('loading');setError('');setPending(null);setPassword('');
    async function initialize() {
      try {
        const config=await apiRequest('/auth/google/config',{signal:controller.signal});
        if(!active)return;
        if(config.enabled!==true||!config.clientId){setState('unavailable');return;}
        const [sdk,challenge]=await Promise.all([loadGoogleSdk(),apiRequest('/auth/google/challenge',{signal:controller.signal,credentials:'include'})]);
        if(!active||!node)return;
        sdk.initialize({client_id:config.clientId,nonce:challenge.nonce,auto_select:false,callback:result=>{if(active)void authenticateRef.current({credential:result.credential,nonce:challenge.nonce});}});
        node.replaceChildren();
        sdk.renderButton(node,{type:'standard',theme:'outline',size:'large',shape:'rectangular',text:mode==='register'?'signup_with':'signin_with',locale,width:Math.min(400,node.parentElement?.clientWidth || 300)});
        setState('ready');
      } catch { if(active){setState('error');setError('api.GOOGLE_UNAVAILABLE');} }
    }
    void initialize();
    return()=>{active=false;mounted.current=false;controller.abort();node?.replaceChildren();};
  },[locale,mode,revision]);

  async function authenticate(identity:{credential:string;nonce:string}, passwordProof?:string) {
    if(!mounted.current||busyRef.current)return;
    busyRef.current=true;setBusy(true);setError('');callbacks.current.onBusyChange(true);
    try {
      const result=await apiRequest('/auth/google',{method:'POST',credentials:'include',body:JSON.stringify({...identity,...(passwordProof?{password:passwordProof}:{})})});
      if(!mounted.current)return;
      storeAuthResult(result);setPending(null);setPassword('');callbacks.current.onAuthenticated(result.user);
    } catch(cause:unknown) {
      if(!mounted.current)return;
      if((cause as {code?:string}).code==='GOOGLE_LINK_REQUIRED'){setPending(identity);}
      else {setPending(null);setPassword('');setState('error');setError((cause as Error).message||'api.GOOGLE_UNAVAILABLE');}
    } finally { busyRef.current=false; if(mounted.current){setBusy(false);callbacks.current.onBusyChange(false);} }
  }
  function link(event:FormEvent){event.preventDefault();if(pending&&password.length>=8)void authenticate(pending,password);}
  return <section className="auth-google" aria-label={tr('ui.google.continue')}>
    <div className="auth-google-divider"><span>{tr('ui.google.or')}</span></div>
    <div ref={container} className="auth-google-provider" hidden={state!=='ready'||Boolean(pending)} inert={disabled||busy} />
    {(state==='loading'||state==='unavailable'||state==='error')&&<button type="button" className="auth-google-placeholder" disabled={state!=='error'||disabled||busy} onClick={()=>setRevision(value=>value+1)}><GoogleMark/>{tr(state==='error'?'ui.google.retry':'ui.google.continue')}</button>}
    {state==='unavailable'&&<p className="auth-google-hint">{tr('ui.google.unavailable')}</p>}
    {busy&&<p role="status" className="auth-google-hint">{tr('ui.google.checking')}</p>}
    {error&&<p ref={errorRef} tabIndex={-1} role="alert" className="auth-google-error">{tr(error)}</p>}
    {pending&&<form className="auth-google-link" onSubmit={link}><p>{tr('ui.google.linkHint')}</p><label htmlFor={passwordId}>{tr('ui.current_password_7f06b3a5')}</label><input ref={passwordRef} id={passwordId} type="password" autoComplete="current-password" minLength={8} maxLength={128} required value={password} onChange={event=>setPassword(event.target.value)} disabled={busy}/><button type="submit" className="auth-submit-button" disabled={busy||password.length<8}>{tr('ui.google.link')}</button><button type="button" className="auth-switch-link" disabled={busy} onClick={()=>setRevision(value=>value+1)}>{tr('ui.cancel_74fcd352')}</button></form>}
  </section>;
}
