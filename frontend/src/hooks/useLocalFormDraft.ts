import { useContext, useEffect, useState } from 'react';
import { readLocalDraft,writeLocalDraft,clearLocalDraft,localDraftPending, draftChangeEvent, type LocalDraft } from '../utils/localDraftStore';
import { DraftActorContext } from '../providers/DraftActorContext';


export function useLocalFormDraft(scope:string, fields:readonly string[]) {
  const actor=useContext(DraftActorContext), key=actor ? `lrm.form-draft.v1:${actor}:${scope}` : '';
  const [record,setRecord]=useState<{key:string;value:LocalDraft|null}>(()=>{try{return {key,value:readLocalDraft(key,v=>fields.every(f=>typeof v.draft[f]==='string'&&v.draft[f].length<=20000))};}catch{return {key,value:null};}});
  const [failed,setFailed]=useState(false);
  const fieldKey=JSON.stringify(fields);
  useEffect(()=>{
    const names=JSON.parse(fieldKey) as string[];
    const reload=()=>{try{setRecord({key,value:readLocalDraft(key,v=>names.every(f=>typeof v.draft[f]==='string'&&v.draft[f].length<=20000))});setFailed(localDraftPending(key));}catch{setFailed(true);}};
    reload();window.addEventListener(draftChangeEvent,reload);
    return()=>window.removeEventListener(draftChangeEvent,reload);
  },[key,fieldKey]);
  const backup=record.key===key ? record.value : null;
  function save(draft:Record<string,string>){
    if(!key)return;
    const value:LocalDraft={version:1,savedAt:Date.now(),draft:Object.fromEntries(fields.map(f=>[f,draft[f]||'']))};
    setRecord({key,value});try{writeLocalDraft(key,value);setFailed(false);}catch{setFailed(true);}
  }
  function clear(){setRecord({key,value:null});setFailed(false);try{clearLocalDraft(key);}catch{/* Memory/session marker prevents restoring confirmed submissions. */}}
  return {backup,save,clear,failed:failed||localDraftPending(key)};
}
