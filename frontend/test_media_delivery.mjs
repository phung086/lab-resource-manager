import assert from 'node:assert/strict';
import test from 'node:test';
import { resourceImageProps } from './src/utils/resourceImage.ts';
import { shouldConserveMedia } from './src/utils/mediaPreferences.ts';
import { uploadResourceFile } from './src/utils/mediaUpload.js';

test('reference image sizes use Wikimedia transforms without changing unrelated or signed URLs', () => {
  const source = 'https://commons.wikimedia.org/wiki/Special:FilePath/Lab%20room.jpg?width=1200';
  const props = resourceImageProps(source);
  assert.equal(new URL(props.src).searchParams.get('width'), '640');
  assert.ok(props.srcSet.includes('320w') && props.srcSet.includes('960w'));
  assert.equal(new URL(resourceImageProps(source, 'detail').src).searchParams.get('width'), '1280');
  for (const url of ['https://cdn.example.test/photo.webp?X-Amz-Signature=keep', '/local.webp', 'not-a-url', 'https://commons.wikimedia.org.evil.test/wiki/Special:FilePath/photo.jpg', 'https://commons.wikimedia.org/wiki/Special:FilePath/video.webm']) {
    const unchanged = resourceImageProps(url);
    assert.equal(unchanged.src, url); assert.equal(unchanged.srcSet, undefined);
  }
});
test('automatic decorative video conserves data on slow connections and honors Save-Data', () => {
  for (const effectiveType of ['slow-2g', '2g', '3g']) assert.equal(shouldConserveMedia({ effectiveType }), true);
  assert.equal(shouldConserveMedia({ saveData: true, effectiveType: '4g' }), true);
  assert.equal(shouldConserveMedia({ effectiveType: '4g' }), false);
  assert.equal(shouldConserveMedia(), false);
});
test('storage upload has a deadline, progress, explicit cancellation, safe headers and no retry', async () => {
  const original = globalThis.XMLHttpRequest;
  const requests = [];
  class Request {
    upload = {}; headers = {};
    constructor() { requests.push(this); }
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader(key, value) { this.headers[key] = value; }
    send(body) { this.body = body; }
    abort() { this.onabort?.(); }
  }
  globalThis.XMLHttpRequest = Request;
  try {
    const controller = new AbortController(); const progress = [];
    const file = { type: 'image/webp' };
    const pending = uploadResourceFile('https://storage.test/signed', file, { signal: controller.signal, onProgress: n => progress.push(n), cacheControl: 'public, max-age=86400' });
    const first = requests[0];
    assert.equal(first.method, 'PUT'); assert.equal(first.timeout, 120000); assert.equal(first.withCredentials, false);
    assert.deepEqual(first.headers, { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=86400' });
    first.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 }); assert.deepEqual(progress, [50]);
    controller.abort(); await assert.rejects(pending, /uploadCancelled/); assert.equal(first.upload.onprogress, null);
    for (const [event, status, message] of [['ontimeout', 0, /uploadTimeout/], ['onload', 403, /upload_failed/], ['onerror', 0, /upload_failed/]]) {
      const pending = uploadResourceFile('https://storage.test/signed', file); const last = requests.at(-1); last.status = status; last[event](); await assert.rejects(pending, message);
    }
    const count = requests.length;
    await assert.rejects(uploadResourceFile('https://storage.test/signed', file, { signal: controller.signal }), /uploadCancelled/);
    assert.equal(requests.length, count);
    const ok = uploadResourceFile('https://storage.test/signed', file); const last = requests.at(-1); last.status = 200; last.onload(); await ok;
    assert.equal(requests.length, 5);
  } finally { globalThis.XMLHttpRequest = original; }
});
