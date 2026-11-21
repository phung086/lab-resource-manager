import { publicPathForSection, workspacePathForTab } from '../workspaceRoutes.js';

function socialLink(value: string | undefined, hosts: string[]) {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol === 'https:' && hosts.includes(url.hostname) && !url.port &&
        !url.username && !url.password && url.pathname !== '/') return url.href;
  } catch {
    return undefined;
  }
}

export const facebookSupportUrl = socialLink(import.meta.env.VITE_PUBLIC_LAB_FACEBOOK_URL,
  ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'messenger.com', 'www.messenger.com', 'm.me']);
export const zaloSupportUrl = socialLink(import.meta.env.VITE_PUBLIC_LAB_ZALO_URL,
  ['zalo.me', 'www.zalo.me', 'oa.zalo.me']);

const configuredPhone = import.meta.env.VITE_PUBLIC_LAB_SUPPORT_PHONE?.trim();
const dialNumber = configuredPhone?.replace(/[^+\d]/g, '');
export const labSupportPhone = configuredPhone && /^\+?[0-9(). -]+$/.test(configuredPhone) &&
  dialNumber && /^\+?\d{7,15}$/.test(dialNumber)
  ? { label: configuredPhone, href: `tel:${dialNumber}` }
  : undefined;

export function labSupportHref(signedIn: boolean, { openAssistant = false } = {}) {
  const supportPath = workspacePathForTab('support', openAssistant ? { assistant: 'open' } : {});
  return signedIn ? supportPath : publicPathForSection('dang-nhap', { returnTo: supportPath });
}
