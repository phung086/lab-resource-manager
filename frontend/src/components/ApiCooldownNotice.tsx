import { useEffect, useState } from 'react';
import { getApiCooldownUntil } from '../api.js';
import { useLocale } from '../providers/LocaleProvider';

export function ApiCooldownNotice() {
  const { tr } = useLocale();
  const [until, setUntil] = useState(getApiCooldownUntil);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const update = () => { setUntil(getApiCooldownUntil()); setNow(Date.now()); };
    window.addEventListener('lrm:rate-limited', update);
    return () => window.removeEventListener('lrm:rate-limited', update);
  }, []);
  useEffect(() => {
    if (until <= Date.now()) return;
    const timer = setInterval(() => { const current = Date.now(); setNow(current); if (current >= until) clearInterval(timer); }, 1000);
    return () => clearInterval(timer);
  }, [until]);
  if (!until) return null;
  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  return <p className="alert warning" role="status">{seconds ? tr('ui.requestCooldown.wait', { seconds }) : tr('ui.requestCooldown.ready')}</p>;
}
