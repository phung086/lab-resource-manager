import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Bounded, read-only smoke against the isolated Nginx test container. Not a
// capacity benchmark: no user, booking, payment, or storage mutations.
const base = new URL(process.env.MEDIA_SMOKE_URL || 'http://127.0.0.1:25441');
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname) && base.port === '25441');
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; };
const get = (url, options = {}) => fetch(new URL(url, base), { ...options, signal: AbortSignal.timeout(15000) });
const videoPath = '/media/LAB-benefits-loop-v1.mp4';
const video = await readFile(path.join(dist, videoPath));
// Parse top-level ISO BMFF boxes, never scan random binary strings for 'moov'.
const boxes = [];
for (let offset = 0; offset < video.length;) {
  assert.ok(offset + 8 <= video.length, 'Complete MP4 box header');
  let length = video.readUInt32BE(offset); const type = video.toString('ascii', offset + 4, offset + 8);
  if (length === 1) { assert.ok(offset + 16 <= video.length); length = Number(video.readBigUInt64BE(offset + 8)); }
  if (length === 0) length = video.length - offset;
  assert.ok(Number.isSafeInteger(length) && length >= 8 && offset + length <= video.length, 'Bounded MP4 box');
  boxes.push({ type, offset, length }); offset += length;
}
check(boxes.some(box => box.type === 'ftyp'), 'MP4 has file type');
const moov = boxes.find(box => box.type === 'moov'), mdat = boxes.find(box => box.type === 'mdat');
check(moov && mdat && moov.offset < mdat.offset, 'Faststart: playback index precedes media data');
check(video.length <= 2 * 1024 * 1024, 'Decorative loop stays below 2 MiB');

const range = await get(videoPath, { headers: { Range: 'bytes=0-1023' } });
check(range.status === 206, 'Video supports single byte-range reads');
check(range.headers.get('content-type')?.startsWith('video/mp4'), 'Video MIME is correct');
check(range.headers.get('content-range') === `bytes 0-1023/${video.length}`, 'Content-Range matches exact file');
check(range.headers.get('cache-control')?.includes('max-age=86400'), 'Unhashed media caches for one day');
check(range.headers.get('x-content-type-options') === 'nosniff', 'Static media retains MIME protection');
check(Buffer.from(await range.arrayBuffer()).equals(video.subarray(0, 1024)), 'Range body matches the file');
const invalid = await get(videoPath, { headers: { Range: `bytes=${video.length + 1}-` } });
check(invalid.status === 416, 'Unsatisfiable range is rejected'); await invalid.body?.cancel();
const multi = await get(videoPath, { headers: { Range: 'bytes=0-31,64-95' } });
check(multi.status === 200 && !multi.headers.get('content-type')?.includes('multipart'), 'Multi-range fan-out is disabled'); await multi.body?.cancel();
const head = await get(videoPath, { method: 'HEAD' });
check(head.status === 200 && Number(head.headers.get('content-length')) === video.length, 'HEAD preserves object length');
const notModified = await get(videoPath, { headers: { 'If-None-Match': head.headers.get('etag') } });
check(notModified.status === 304, 'Warm requests revalidate without retransmitting video');
const missing = await get('/media/missing-media-qa.mp4');
check(missing.status === 404, 'Missing media does not become SPA HTML'); await missing.body?.cancel();
const poster = (await readdir(path.join(dist, 'assets'))).find(name => name.startsWith('benefits-poster-') && name.endsWith('.webp'));
check(Boolean(poster), 'Optimized poster is content-hashed by Vite');
const image = await get(`/assets/${poster}`);
check(image.headers.get('cache-control')?.includes('max-age=31536000'), 'Hashed poster caches for one year');
check((await image.arrayBuffer()).byteLength < 25 * 1024, 'Poster stays below 25 KiB');

// 8 workers, 48 operations total: 24 media ranges, 12 lightweight health and
// 12 public catalogue reads. Measure end-to-end body time, never claim user count.
const samples = [], started = performance.now(); let next = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  for (;;) {
    const index = next++; if (index >= 48) break;
    const media = index % 2 === 0;
    const at = performance.now();
    const response = await get(media ? videoPath : index % 4 === 1 ? '/api/health' : '/api/resources', media ? { headers: { Range: 'bytes=0-65535' } } : {});
    check(response.status === (media ? 206 : 200), 'Bounded concurrent media/API read succeeds');
    await response.arrayBuffer(); samples.push(performance.now() - at);
  }
}));
samples.sort((a, b) => a - b);
console.log(JSON.stringify({ checks, videoBytes: video.length, faststart: true, concurrency: 8, reads: 48, durationMs: Math.round(performance.now() - started), p95Ms: Math.round(samples[Math.ceil(samples.length * .95) - 1]), scope: 'local Nginx with shared development API; not production capacity or playback certification' }, null, 2));
