import type { ComponentPropsWithoutRef } from 'react';

/** One page-heading composition; route actions keep their own semantics/state. */
export function PageHeading({ className = '', ...props }: ComponentPropsWithoutRef<'header'>) {
  return <header {...props} className={`lab-page-heading ${className}`} />;
}
