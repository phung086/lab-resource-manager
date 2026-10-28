import { ArrowRight, Circle } from 'lucide-react';
import '../../styles/operations-workbench.css';

/** Current workflow stage, not an inferred history of completed transitions. */
export function WorkbenchPath({ label, steps, current }: { label: string; steps: string[]; current: number }) {
  return <ol className="workbench-path" aria-label={label}>{steps.map((step,index) =>
    <li key={index} aria-current={index === current ? 'step' : undefined}>
      <span aria-hidden="true">{index === current ? <ArrowRight size={15} /> : <Circle size={9} />}</span>{step}
    </li>)}</ol>;
}
