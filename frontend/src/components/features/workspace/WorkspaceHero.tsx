import type { ReactNode } from 'react';
import { ArrowUpRight, CalendarDays, Boxes, ClipboardList, Users } from 'lucide-react';
import { useLocale } from '../../../providers/LocaleProvider';
import labImage from '../../../assets/lab-workbench-hero-optimized.webp';

/** Navigation only: the existing destinations retain policy and authorization. */
export function WorkspaceHero({ title, subtitle, role, onNavigate, children }: {
  title: string; subtitle?: string; role: string;
  onNavigate: (tab: string) => void; children?: ReactNode;
}) {
  const { tr } = useLocale();
  const actions = [
    { tab: 'resources', label: 'ui.rooms_and_equipment_db26e03c', Icon: Boxes },
    { tab: 'smart_calendar', label: 'ui.room_and_equipment_calendar_cce9c071', Icon: CalendarDays },
    role === 'ADMIN' ? { tab: 'users', label: 'ui.user_administration_2a750b85', Icon: Users }
      : { tab: 'bookings', label: role === 'LAB_STAFF' ? 'ui.bookings_and_handover_3e0e5754' : 'ui.my_bookings_094ca2d9', Icon: ClipboardList },
  ];
  return <header className="studio-hero">
    <img className="studio-hero-image" src={labImage} alt="" width={1536} height={1024}/>
    <div className="studio-hero-copy"><h1 id="workspace-title">{title}</h1>{subtitle && <p>{subtitle}</p>}{children}</div>
    <nav className="studio-hero-actions" aria-label={tr('ui.quick_navigation_ec400fed')}>
      {actions.map(({ tab, label, Icon }) => <button type="button" key={tab} onClick={() => onNavigate(tab)}><Icon size={23} aria-hidden="true"/><span>{tr(label)}</span><ArrowUpRight size={15} aria-hidden="true"/></button>)}
    </nav>
  </header>;
}
