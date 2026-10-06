import React from 'react';
import { FlaskConical } from 'lucide-react';
import { useLocale } from '../../providers/LocaleProvider';

type Props = { href?: string; onNavigate?: () => void };

export function ProjectBrand({ href = '#dau-trang', onNavigate }: Props) {
  const { t } = useLocale();
  const content = <><FlaskConical aria-hidden="true" /><span>{t('ui.lab_7a62e3ac')}<span>{t('ui.resource_manager_ae0bb64a')}</span></span></>;
  return onNavigate
    ? <button type="button" className="project-brand" onClick={onNavigate} aria-label={t('shell.brand_home')}>{content}</button>
    : <a className="project-brand" href={href} aria-label={t('shell.brand_home')}>{content}</a>;
}
