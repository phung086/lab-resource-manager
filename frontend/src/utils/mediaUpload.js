// One bounded direct-to-storage request; never attach API auth or retry a PUT.
export function uploadResourceFile(url, file, { signal, onProgress, timeoutMs = 120000, cacheControl } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('ui.media.uploadCancelled')); return; }
    const request = new XMLHttpRequest();
    let settled = false;
    const abort = () => request.abort();
    const finish = (error) => {
      if (settled) return;
      settled = true; signal?.removeEventListener('abort', abort);
      request.onload = request.onerror = request.ontimeout = request.onabort = null;
      request.upload.onprogress = null;
      if (error) reject(new Error(error)); else resolve();
    };
    request.open('PUT', url);
    request.timeout = timeoutMs;
    request.withCredentials = false;
    request.setRequestHeader('Content-Type', file.type);
    if (cacheControl) request.setRequestHeader('Cache-Control', cacheControl);
    request.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100)); };
    request.onload = () => finish(request.status >= 200 && request.status < 300 ? undefined : 'ui.upload_failed_ask_your_administrator_352d81a6');
    request.onerror = () => finish('ui.upload_failed_ask_your_administrator_352d81a6');
    request.ontimeout = () => finish('ui.media.uploadTimeout');
    request.onabort = () => finish('ui.media.uploadCancelled');
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { request.abort(); finish('ui.media.uploadCancelled'); return; }
    try { request.send(file); } catch { finish('ui.upload_failed_ask_your_administrator_352d81a6'); }
  });
}
