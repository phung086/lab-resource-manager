// Per-tab storage survives refresh, but is removed when the tab closes.
// JavaScript storage is still exposed to XSS: CSP and safe rendering remain necessary.
export const getAccessToken = () => {
  globalThis.localStorage?.removeItem?.('lrm_token'); globalThis.localStorage?.removeItem?.('lrm_user');
  return sessionStorage.getItem('lrm_token');
};
export const getAuthUser = () => sessionStorage.getItem('lrm_user');
export const storeAuthUser = user => sessionStorage.setItem('lrm_user', JSON.stringify(user));
export function removeAuth() {
  sessionStorage.removeItem('lrm_token'); sessionStorage.removeItem('lrm_user');
  globalThis.localStorage?.removeItem?.('lrm_token'); globalThis.localStorage?.removeItem?.('lrm_user');
}
export function saveAuth(result) {
  // Never silently revive a credential left by an older persistent-storage build.
  removeAuth(); sessionStorage.setItem('lrm_token', result.accessToken); storeAuthUser(result.user);
  window.dispatchEvent(new CustomEvent('lrm:session-changed'));
}
