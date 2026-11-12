import { useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { apiRequest } from '../../../api';
import { useLocale } from '../../../providers/LocaleProvider';
import { navigateApp, workspacePathForTab } from '../../../workspaceRoutes';
import { PageHeading } from '../../base/PageHeading';
import { PlanBuilder } from './PlanBuilder';
import '../../../styles/planning-workspace.css';
import '../../../styles/customer-booking.css';

type RepeatResources = { id: string; name: string; code: string; laboratoryId: string; laboratory: { id: string; name: string } }[];

export function RepeatBookingDraft({ sourceId, onSaved }: { sourceId: string; onSaved: () => void }) {
  const { tr } = useLocale();
  const [resources, setResources] = useState<RepeatResources | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/bookings/${encodeURIComponent(sourceId)}/repeat-draft`, { signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(result?.resources) || !result.resources.length) throw new Error('api.DATA_UNAVAILABLE');
        setResources(result.resources);
      })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message || 'api.API_REQUEST_FAILED'); });
    return () => controller.abort();
  }, [sourceId, revision]);
  return <section className="planning-workspace customer-repeat-draft" aria-labelledby="repeat-booking-heading">
    <PageHeading className="customer-repeat-heading">
      <div>
        <h1 id="repeat-booking-heading"><RotateCcw size={23} aria-hidden="true" />{tr('ui.customerBooking.repeat')}</h1>
        <p>{tr('ui.customerBooking.repeatHint')}</p>
      </div>
      <button type="button" className="btn btn-secondary" onClick={() => navigateApp(workspacePathForTab('bookings', { filter: 'HISTORY', booking: sourceId }))}>
        <ArrowLeft size={16} aria-hidden="true" />{tr('ui.my_bookings_094ca2d9')}
      </button>
    </PageHeading>
    {error ? <div className="alert danger" role="alert">{tr(error)}
      <button type="button" className="btn btn-secondary" onClick={() => { setError(''); setRevision(value => value + 1); }}>{tr('ui.retry_c58d068c')}</button>
    </div> : resources ? <PlanBuilder resources={resources} initialIds={resources.map(resource => resource.id)} repeatSourceId={sourceId} onSaved={onSaved} />
      : <p className="planning-paper" role="status">{tr('planning.loading')}</p>}
  </section>;
}
