import { useEffect, useState } from 'react';
import { apiRequest } from '../../../api.js';
import { useLocale } from '../../../providers/LocaleProvider';
import { PlanBuilder } from './PlanBuilder';
import '../../../styles/planning-workspace.css';

type Resource = { id: string; name: string; code: string; laboratoryId?: string; laboratory?: { id: string; name: string } };
export function SelectedBundle({ ids, onSaved, onPending }: { onPending: (ids: string[], uncertain: boolean) => void; ids: string[]; onSaved: (rows: { id: string; resourceId: string; status: string; feeAmountVnd?: number }[]) => void }) {
  const { tr } = useLocale();
  const key = ids.join(',');
  const [resources, setResources] = useState<Resource[]>([]), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setResources([]); setError('');
    Promise.all(key.split(',').filter(Boolean).map(id => apiRequest(`/resources/${encodeURIComponent(id)}`, { signal: controller.signal })))
      .then(rows => { if (!controller.signal.aborted) setResources(rows); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [key]);
  return <div className="planning-workspace">
    {!ids.length ? <p>{tr('planning.noPending')}</p> : error ? <p role="alert">{tr(error)}</p> : resources.length ? <PlanBuilder key={key} resources={resources} initialIds={ids} onSaved={onSaved} onPending={onPending}/> : <p role="status">{tr('planning.loading')}</p>}
  </div>;
}
