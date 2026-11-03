import type { useLocalFormDraft } from '../../hooks/useLocalFormDraft';
import { useLocale } from '../../providers/LocaleProvider';
import '../../styles/local-drafts.css';
export function LocalDraftNotice({store,onRestore,disabled=false}:{store:ReturnType<typeof useLocalFormDraft>;onRestore:(draft:Record<string,string>)=>void;disabled?:boolean}){
  const {tr}=useLocale();
  return store.backup ? <aside className={`local-draft-notice${store.failed ? ' is-warning' : ''}`}><p role="status">{tr(store.failed?'ui.maintenanceDraft.unavailable':'ui.formDraft.saved')}</p><button type="button" disabled={disabled} onClick={()=>onRestore(store.backup!.draft)}>{tr('ui.maintenanceDraft.restore')}</button><button type="button" disabled={disabled} onClick={store.clear}>{tr('ui.maintenanceDraft.discard')}</button></aside>:null;
}
