import assert from 'node:assert/strict';
import test from 'node:test';
import { addExternalResourceMedia, finishResourceMediaUpload, publicMediaUrl, requestResourceMediaUpload } from '../src/services/resourceMediaService.js';
import { S3Client } from '@aws-sdk/client-s3';
import { prisma } from '../src/db.js';

test('media upload validates bytes and types before configuring storage', async () => {
  for (const [contentType, size] of [['image/svg+xml', 100], ['image/webp', 0], ['image/jpeg', 10 * 1024 * 1024 + 1], ['video/mp4', 100 * 1024 * 1024 + 1], ['image/png', 1.5]]) {
    await assert.rejects(requestResourceMediaUpload('resource-qa', { contentType, size }), error => error.code === 'MEDIA_INVALID_FILE');
  }
});
test('presigned upload binds length, content type and cache metadata without fetching bytes via API', async () => {
  const values = { MEDIA_S3_ENDPOINT: 'https://storage.qa.invalid', MEDIA_S3_BUCKET: 'lab-media', MEDIA_S3_REGION: 'us-east-1', MEDIA_S3_ACCESS_KEY_ID: 'media-qa-not-a-live-key', MEDIA_S3_SECRET_ACCESS_KEY: 'media-qa-not-a-live-secret', MEDIA_PUBLIC_BASE_URL: 'https://cdn.qa.invalid/media' };
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, values);
    const ticket = await requestResourceMediaUpload('resource-qa', { contentType: 'image/webp', size: 2048 });
    const url = new URL(ticket.uploadUrl);
    assert.equal(url.hostname, 'storage.qa.invalid');
    assert.match(ticket.key, /^resources\/resource-qa\/[a-f0-9-]{36}\.webp$/);
    assert.equal(ticket.expiresInSeconds, 600); assert.equal(ticket.cacheControl, 'public, max-age=86400');
    const signed = url.searchParams.get('X-Amz-SignedHeaders').split(';');
    assert.ok(signed.includes('content-length') && signed.includes('content-type') && signed.includes('cache-control'));
    assert.equal(url.searchParams.has('x-amz-checksum-crc32'), false, 'Do not sign a checksum of an absent body for a later browser PUT');
    process.env.MEDIA_PUBLIC_BASE_URL = 'https://user:password@cdn.qa.invalid';
    await assert.rejects(requestResourceMediaUpload('resource-qa', { contentType: 'image/png', size: 10 }), error => error.code === 'MEDIA_NOT_CONFIGURED');
  } finally { for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value; }
});
test('external media requires exact allowed HTTPS host and cannot silently save an untrusted URL', async () => {
  const previous = process.env.MEDIA_EXTERNAL_HOSTS;
  process.env.MEDIA_EXTERNAL_HOSTS = 'upload.wikimedia.org';
  const original = prisma.resourceMedia.create; let writes = 0;
  prisma.resourceMedia.create = async ({ data }) => { writes++; return data; };
  const details = { kind: 'IMAGE', title: 'Reference', altText: 'Reference photo', credit: 'Source author', license: 'CC BY', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Reference.jpg', sortOrder: 0 };
  try {
    for (const url of ['http://upload.wikimedia.org/a.jpg', 'https://upload.wikimedia.org.evil.test/a.jpg', 'https://user:pass@upload.wikimedia.org/a.jpg']) await assert.rejects(addExternalResourceMedia('qa', { ...details, url }), error => error.code === 'MEDIA_INVALID_URL');
    assert.equal(writes, 0);
    await addExternalResourceMedia('qa', { ...details, url: 'https://upload.wikimedia.org/a.jpg' }); assert.equal(writes, 1);
    assert.equal(publicMediaUrl(new URL('https://cdn.qa.invalid/media/'), 'resources/a b/photo.webp'), 'https://cdn.qa.invalid/media/resources/a%20b/photo.webp');
  } finally { prisma.resourceMedia.create = original; if (previous === undefined) delete process.env.MEDIA_EXTERNAL_HOSTS; else process.env.MEDIA_EXTERNAL_HOSTS = previous; }
});
test('completion checks resource ownership of key, actual size, MIME and extension before persistence', async () => {
  const values = { MEDIA_S3_ENDPOINT: 'https://storage.qa.invalid', MEDIA_S3_BUCKET: 'lab-media', MEDIA_S3_REGION: 'us-east-1', MEDIA_S3_ACCESS_KEY_ID: 'qa-dummy', MEDIA_S3_SECRET_ACCESS_KEY: 'qa-dummy-not-live', MEDIA_PUBLIC_BASE_URL: 'https://cdn.qa.invalid' };
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  const send = S3Client.prototype.send, create = prisma.resourceMedia.create;
  let head = { ContentType: 'image/webp', ContentLength: 1024 }, writes = 0, reads = 0;
  const data = { key: 'resources/qa/00000000-0000-4000-8000-000000000001.webp', kind: 'IMAGE', title: 'QA image', altText: 'QA reference image', sortOrder: 0 };
  try {
    Object.assign(process.env, values);
    S3Client.prototype.send = async (_command, options) => { assert.ok(options.abortSignal); reads++; return head; };
    prisma.resourceMedia.create = async ({ data }) => { writes++; return data; };
    await assert.rejects(finishResourceMediaUpload('other', data), error => error.code === 'MEDIA_INVALID_KEY'); assert.equal(reads, 0);
    for (const metadata of [{ ContentType: 'image/webp', ContentLength: 10 * 1024 * 1024 + 1 }, { ContentType: 'video/mp4', ContentLength: 100 }, { ContentType: 'image/png', ContentLength: 100 }, { ContentType: 'image/svg+xml', ContentLength: 100 }]) {
      head = metadata; await assert.rejects(finishResourceMediaUpload('qa', data), error => error.code === 'MEDIA_INVALID_FILE');
    }
    assert.equal(writes, 0);
    S3Client.prototype.send = async () => { throw Object.assign(new Error('fixture missing'), { name: 'NotFound' }); };
    await assert.rejects(finishResourceMediaUpload('qa', data), error => error.status === 409 && error.code === 'MEDIA_UPLOAD_MISSING');
    S3Client.prototype.send = async () => { throw Object.assign(new Error('fixture timeout'), { name: 'TimeoutError' }); };
    await assert.rejects(finishResourceMediaUpload('qa', data), error => error.status === 503 && error.code === 'DATA_UNAVAILABLE');
    S3Client.prototype.send = async () => head;
    head = { ContentType: 'image/webp', ContentLength: 1024 };
    const saved = await finishResourceMediaUpload('qa', data);
    assert.equal(writes, 1); assert.equal(saved.objectKey, data.key); assert.equal(saved.resourceId, 'qa');
    assert.ok(saved.url.startsWith('https://cdn.qa.invalid/resources/qa/'));
  } finally {
    S3Client.prototype.send = send; prisma.resourceMedia.create = create;
    for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
