import { HelpDisclosure } from "./base/HelpDisclosure";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, ArrowRight } from 'lucide-react';
import { apiRequest } from '../api.js';
import { useLocale } from '../providers/LocaleProvider';
import { navigateApp, readRouteParams, workspacePathForTab } from '../workspaceRoutes.js';
import { USER_ROLES, managedUserServerFields, validateManagedUser } from '../utils/userValidation';
import type { UserRole } from '../utils/userValidation';
import { BaseModal2026 } from './BaseModal2026';
import { ManagedUserEditForm } from './features/accounts/ManagedUserEditForm';
import { PasswordChangeForm } from './features/accounts/PasswordChangeForm';
import { LoyaltyPolicySettings } from './features/accounts/LoyaltyPolicySettings';
import { UserDirectoryList } from './features/accounts/UserDirectoryList';
import { AccountDetailPanel } from './features/accounts/AccountDetailPanel';
import { AccountAccessPanel, type AccountChange } from './features/accounts/AccountAccessPanel';
import { UserCreatePanel } from './features/accounts/UserCreatePanel';
import type { DirectoryUser, Laboratory, Assignment } from './features/accounts/accountDirectory.contract';
import { roleLabels } from './features/accounts/accountDirectory.contract';
import '../styles/users-workspace.css';

type Change = { user: DirectoryUser; type: 'role' | 'active' | 'assign' | 'remove' | 'delete'; role?: UserRole; laboratory?: Laboratory };
const failure = (error: unknown) => error instanceof Error ? error.message : 'ui.users.requestFailed';
const initialForm = { fullName: '', email: '', password: '', phone: '', organization: '', role: 'CUSTOMER' as UserRole };
const initialRole = () => { const role = readRouteParams().get('role'); return USER_ROLES.includes(role as UserRole) ? role || '' : ''; };

export function AccessUserManagement({ actorRole, actorId }: { actorRole: string; actorId: string }) {
  const { tr } = useLocale(), createRef = useRef<HTMLFormElement>(null), dossierRef = useRef<HTMLElement>(null);
  const isAdmin = actorRole === 'ADMIN', allowedRoles = isAdmin ? USER_ROLES : ['CUSTOMER'] as const;
  const loadAbort = useRef<AbortController | null>(null), busyRef = useRef(false);
  const [users, setUsers] = useState<DirectoryUser[]>([]), [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [search, setSearch] = useState(''), [roleFilter, setRoleFilter] = useState(initialRole), [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(() => readRouteParams().get('user') || '');
  const [roles, setRoles] = useState<Record<string, UserRole>>({}), [labChoices, setLabChoices] = useState<Record<string, string>>({});
  const [assignmentRead, setAssignmentRead] = useState<{ userId: string; rows: Assignment[]; loading: boolean; error: string }>({ userId: '', rows: [], loading: false, error: '' });
  const [assignmentRevision, setAssignmentRevision] = useState(0);
  const [showCreate, setShowCreate] = useState(false), [createForm, setCreateForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}), [createError, setCreateError] = useState('');
  const [change, setChange] = useState<Change | null>(null), [busy, setBusy] = useState(false), [actionError, setActionError] = useState(''), [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false), [resetTarget, setResetTarget] = useState<DirectoryUser | null>(null), [reason, setReason] = useState('');
  const reasonRef = useRef<HTMLInputElement>(null);
  const user = !loading && !error ? users.find(item => item.id === selected) : undefined, isStaff = isAdmin && user?.role === 'LAB_STAFF';
  const assignments = assignmentRead.userId === selected ? assignmentRead.rows : [];
  const assignmentsLoading = isStaff && (assignmentRead.userId !== selected || assignmentRead.loading);
  const assignmentsError = assignmentRead.userId === selected ? assignmentRead.error : '';
  const visible = loading || error ? [] : users.filter(item => (!isAdmin ? item.role === 'CUSTOMER' : !roleFilter || item.role === roleFilter) && (!statusFilter || String(item.isActive) === statusFilter) && (item.fullName + ' ' + item.email).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  const load = useCallback(async () => {
    loadAbort.current?.abort(); const controller = new AbortController(); loadAbort.current = controller;
    setLoading(true); setError('');
    try {
      const [nextUsers, nextLabs] = await Promise.all([apiRequest('/users', { signal: controller.signal }), isAdmin ? apiRequest('/users/laboratories', { signal: controller.signal }) : Promise.resolve([])]);
      if (!controller.signal.aborted) { setUsers(nextUsers); setLaboratories(nextLabs); }
    } catch (cause: unknown) { if (!controller.signal.aborted) setError(failure(cause)); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [isAdmin]);
  useEffect(() => { void load(); return () => loadAbort.current?.abort(); }, [load]);
  useEffect(() => {
    const sync = () => { setSelected(readRouteParams().get('user') || ''); setRoleFilter(initialRole()); setActionError(''); setNotice(''); };
    window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync);
  }, []);
  useEffect(() => {
    if (!selected || !isStaff) return;
    const controller = new AbortController();
    setAssignmentRead({ userId: selected, rows: [], loading: true, error: '' });
    apiRequest('/users/' + selected + '/lab-assignments', { signal: controller.signal })
      .then(rows => { if (!controller.signal.aborted) setAssignmentRead({ userId: selected, rows, loading: false, error: '' }); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setAssignmentRead({ userId: selected, rows: [], loading: false, error: failure(cause) }); });
    return () => controller.abort();
  }, [selected, isStaff, assignmentRevision]);
  function choose(id: string) {
    if (busyRef.current) return;
    setSelected(id); setEditing(false); setActionError(''); setNotice('');
    const params = readRouteParams(); if (id) params.set('user', id); else params.delete('user');
    navigateApp(workspacePathForTab('users', params), { notify: false });
    if (id && window.matchMedia('(max-width: 1050px)').matches) requestAnimationFrame(() => { dossierRef.current?.scrollIntoView({ block: 'start' }); dossierRef.current?.focus({ preventScroll: true }); });
  }
  function filterRole(role: string) {
    setRoleFilter(role); const params = readRouteParams(); if (role) params.set('role', role); else params.delete('role');
    navigateApp(workspacePathForTab('users', params), { notify: false });
  }
  function propose(next: Change) { if (!busyRef.current) { setChange(next); setReason(''); setActionError(''); setNotice(''); } }
  async function applyChange() {
    if (!change || busyRef.current) return;
    if (change.type === 'delete' && (reason.trim().length < 5 || reason.trim().length > 500)) { setActionError('account.security.reasonInvalid'); reasonRef.current?.focus(); return; }
    busyRef.current = true; setBusy(true); setActionError(''); setNotice('');
    const target = change;
    try {
      const prefix = '/users/' + target.user.id;
      if (target.type === 'role') await apiRequest(prefix + '/role', { method: 'PATCH', body: JSON.stringify({ role: target.role }) });
      if (target.type === 'active') await apiRequest(prefix + '/active', { method: 'PATCH', body: JSON.stringify({ isActive: !target.user.isActive }) });
      if (target.type === 'assign') await apiRequest(prefix + '/lab-assignments', { method: 'POST', body: JSON.stringify({ laboratoryId: target.laboratory?.id }) });
      if (target.type === 'remove') await apiRequest(prefix + '/lab-assignments/' + target.laboratory?.id, { method: 'DELETE' });
      if (target.type === 'delete') await apiRequest(prefix, { method: 'DELETE', body: JSON.stringify({ reason: reason.trim() }) });
      setChange(null); setNotice(target.type === 'delete' ? 'account.users.deleted' : 'ui.users.saved');
      setRoles(current => { const next = { ...current }; delete next[target.user.id]; return next; });
      setLabChoices(current => ({ ...current, [target.user.id]: '' })); setAssignmentRevision(value => value + 1);
      await load();
    } catch (cause: unknown) { setActionError(failure(cause)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault(); if (busyRef.current) return;
    const result = validateManagedUser(createForm, actorRole); setFieldErrors(result.errors); setCreateError('');
    if (!result.data) { createRef.current?.querySelector<HTMLElement>('[name="' + Object.keys(result.errors)[0] + '"]')?.focus(); return; }
    busyRef.current = true; setBusy(true); setNotice('');
    try {
      const created = await apiRequest('/users', { method: 'POST', body: JSON.stringify(result.data) });
      setCreateForm(initialForm); setShowCreate(false); setNotice('ui.users.created'); await load(); setSelected(created.id); const params = readRouteParams(); params.set('user', created.id); navigateApp(workspacePathForTab('users', params), { notify: false });
     } catch (cause: unknown) {
      const fields = managedUserServerFields(cause as Parameters<typeof managedUserServerFields>[0]);
      if (Object.keys(fields).length) {setFieldErrors(fields);createRef.current?.querySelector<HTMLElement>('[name="' + Object.keys(fields)[0] + '"]')?.focus();}
      else setCreateError(failure(cause));
    }
    finally { busyRef.current = false; setBusy(false); }
  }
  function onProposeFromPanel(next: AccountChange) {
    if (!user) return;
    setRoles(current => ({ ...current, [user.id]: next.role ?? user.role }));
    propose({ user, type: next.type, role: next.role });
  }
  function onAssignLab(lab: Laboratory) {
    if (!user) return;
    setLabChoices(current => ({ ...current, [user.id]: lab.id }));
    propose({ user, type: 'assign', laboratory: lab });
  }
  function onRemoveLab(assignment: { laboratoryId: string; laboratory: Laboratory }) {
    if (!user) return;
    propose({ user, type: 'remove', laboratory: assignment.laboratory });
  }
  const changeTitle = change?.type === 'delete' ? 'account.users.delete' : change?.type === 'role' ? 'ui.users.confirmRole' : change?.type === 'active' ? (change.user.isActive ? 'ui.users.deactivate' : 'ui.users.activate') : change?.type === 'remove' ? 'ui.users.removeLab' : 'ui.users.confirmAssignment';

  const accessProps = user ? { isAdmin, actorId, user: { id: user.id, role: user.role, isActive: user.isActive, fullName: user.fullName }, busy, onPropose: onProposeFromPanel } : null;

  return <section className="view-section users-workspace" aria-busy={loading}>
    <header className="users-heading"><div><h1>{tr(isAdmin ? 'ui.user_administration_2a750b85' : 'account.users.customers')}</h1><HelpDisclosure>{tr(isAdmin ? 'ui.users.subtitle' : 'account.users.staffScope')}</HelpDisclosure></div><div className="users-actions">
      {isAdmin && <button type="button" className="btn btn-secondary" onClick={() => navigateApp(workspacePathForTab('chatgpt_bridge'))}>{tr('bridge.title')}</button>}
      <button type="button" className="btn btn-secondary" disabled={loading || busy} onClick={() => void load()}><RefreshCw size={16} />{tr('ui.refresh_46140fa8')}</button>
      <button type="button" className="btn btn-primary" aria-expanded={showCreate} disabled={busy} onClick={() => setShowCreate(value => !value)}><Plus size={16} />{tr('ui.create_user_70f60575')}</button>
    </div></header>
    {notice && <p className="users-notice" role="status">{tr(notice)}</p>}
    {isAdmin && <LoyaltyPolicySettings />}
    {showCreate && (
      <UserCreatePanel
        isAdmin={isAdmin}
        actorRole={actorRole as UserRole}
        busy={busy}
        onCreated={(id) => { setShowCreate(false); setNotice('ui.users.created'); void load(); setSelected(id); const params = readRouteParams(); params.set('user', id); navigateApp(workspacePathForTab('users', params), { notify: false }); }}
        onBusyChange={(value) => { busyRef.current = value; setBusy(value); }}
        onCollapse={() => { setShowCreate(false); setFieldErrors({}); setCreateError(''); }}
      />
    )}
    {error && <div className="users-error" role="alert">{tr(error)} <button type="button" className="btn btn-secondary" disabled={loading || busy} onClick={() => void load()}>{tr('ui.users.retry')}</button></div>}
    <div className="users-layout">
      <UserDirectoryList
        users={users}
        total={users.length}
        isAdmin={isAdmin}
        selectedId={selected}
        search={search}
        roleFilter={roleFilter as '' | UserRole}
        statusFilter={statusFilter as '' | 'true' | 'false'}
        busy={busy}
        onSearch={setSearch}
        onRoleFilter={filterRole}
        onStatusFilter={setStatusFilter}
        onSelect={choose}
      />
      <aside ref={dossierRef} tabIndex={-1} className="users-dossier" aria-label={tr('ui.users.accountDetails')}>
        {!user ? <div className="users-empty users-dossier-empty"><h2>{tr(selected && !loading ? 'ui.users.accountUnavailable' : 'ui.users.selectAccount')}</h2><p>{tr('ui.users.selectHint')}</p></div> : (
          <>
            <AccountDetailPanel
              key={user.id}
              user={user}
              isAdmin={isAdmin}
              canEdit={!user.deletedAt && (isAdmin || (actorRole === 'LAB_STAFF' && user.role === 'CUSTOMER'))}
              busy={busy}
              onEdit={() => { setEditing(true); setActionError(''); setNotice(''); }}
              onChangePassword={() => { setResetTarget(user); }}
              onClose={() => choose('')}
            />
            {!user.deletedAt && accessProps && (
              <AccountAccessPanel
                isAdmin={accessProps.isAdmin}
                actorId={accessProps.actorId}
                user={accessProps.user}
                busy={accessProps.busy}
                onPropose={accessProps.onPropose}
              />
            )}
            {isStaff && (
              <section className="users-lab-scope" aria-busy={assignmentsLoading}>
                <header className="users-lab-scope-head">
                  <p className="users-lab-scope-eyebrow">{tr('ui.users.detail.labScopeEyebrow')}</p>
                  <h4>{tr('ui.laboratory_assignments_79925c7e')}</h4>
                  <p>{tr('ui.users.labHint')}</p>
                </header>
                {assignmentsLoading ? <p role="status">{tr('ui.loading_data_84c68bd5')}</p> : assignmentsError ? <p className="users-error" role="alert">{tr(assignmentsError)} <button type="button" className="btn btn-secondary" onClick={() => setAssignmentRevision(value => value + 1)}>{tr('ui.users.retry')}</button></p> : <>
                  {assignments.length ? <ul className="users-labs">{assignments.map(assignment => <li key={assignment.laboratoryId}><div><strong>{assignment.laboratory.code}</strong><span>{assignment.laboratory.name}</span>{!assignment.laboratory.isActive && <small>{tr('ui.inactive_50157a4c')}</small>}</div><button type="button" className="btn btn-secondary" disabled={busy} aria-label={tr('ui.users.removeLab') + ': ' + assignment.laboratory.code} onClick={() => onRemoveLab(assignment)}>{tr('ui.users.remove')}</button></li>)}</ul> : <p className="users-lab-empty">{tr('ui.users.noAssignments')}</p>}
                  <label>{tr('ui.choose_laboratory_09dc49a7')}<select disabled={busy} value={labChoices[user.id] || ''} onChange={event => setLabChoices(current => ({ ...current, [user.id]: event.target.value }))}><option value="">{tr('ui.choose_laboratory_09dc49a7')}</option>{laboratories.filter(lab => !assignments.some(assignment => assignment.laboratoryId === lab.id)).map(lab => <option key={lab.id} value={lab.id}>{lab.code} · {lab.name}{lab.isActive ? '' : ' (' + tr('ui.inactive_50157a4c') + ')'}</option>)}</select></label>
                  <button type="button" className="btn btn-primary" disabled={busy || !laboratories.some(lab => lab.id === labChoices[user.id])} onClick={() => onAssignLab(laboratories.find(lab => lab.id === labChoices[user.id])!)}>{tr('ui.users.reviewAssignment')}</button>
                </>}
              </section>
            )}
            {editing && <ManagedUserEditForm key={user.id} user={user} onCancel={() => setEditing(false)} onBusyChange={value => { busyRef.current=value; setBusy(value); }} onSaved={() => { setEditing(false); setNotice('ui.users.saved'); void load(); }} />}
          </>
        )}
      </aside>
    </div>
    <BaseModal2026 isOpen={!!change} onClose={() => { if (!busy) { setChange(null); setActionError(''); } }} title={tr(changeTitle)} dismissible={!busy}>
      {change && <div className="users-confirm"><h4>{change.user.fullName || change.user.email}</h4><p>{change.user.email}</p>
        {change.type === 'role' && <><p>{tr(roleLabels[change.user.role])} <ArrowRight size={16} aria-hidden="true" /> {tr(roleLabels[change.role!])}</p>{change.user.role === 'LAB_STAFF' && change.role !== 'LAB_STAFF' && <p className="users-error">{tr('ui.users.assignmentRemovalWarning')}</p>}</>}
        {change.type === 'active' && <p>{tr(change.user.isActive ? 'ui.users.deactivateHint' : 'ui.users.activateHint')}</p>}{change.type === 'delete' && <><p>{tr('account.users.deleteHint')}</p><label>{tr('account.security.reason')}<input ref={reasonRef} value={reason} required maxLength={500} disabled={busy} aria-invalid={actionError === 'account.security.reasonInvalid'} aria-describedby={actionError ? 'action-error' : undefined} onChange={event => { setReason(event.target.value); setActionError(''); }} /></label></>}
        {change.laboratory && <p><strong>{change.laboratory.code}</strong> · {change.laboratory.name}</p>}
        {actionError && <p id="action-error" className="users-error" role="alert">{tr(actionError)}</p>}
        <div className="users-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => { setChange(null); setActionError(''); }}>{tr('ui.cancel_74fcd352')}</button><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void applyChange()}>{tr(busy ? 'ui.users.saving' : 'ui.users.confirm')}</button></div>
      </div>}
    </BaseModal2026>
    <BaseModal2026 isOpen={!!resetTarget} title={tr('account.users.resetPassword')} dismissible={!busy} onClose={() => { if (!busy) setResetTarget(null); }}>
      {resetTarget && <PasswordChangeForm key={resetTarget.id} targetId={resetTarget.id} email={resetTarget.email} onBusyChange={value => { busyRef.current=value; setBusy(value); }} onSuccess={() => { setNotice('account.security.assistedSuccess'); void load(); }} />}
    </BaseModal2026>
  </section>;
}
