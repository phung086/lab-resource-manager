import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { prepareImage } from './scripts/prepareMedia.mjs';

test('offline image processing resizes, strips metadata, respects budgets and refuses overwrite', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lrm-media-qa-'));
  const source = path.join(directory, 'source.jpg'); const output = path.join(directory, 'processed');
  await sharp({ create: { width: 2400, height: 1800, channels: 3, background: '#7554bb' } }).withMetadata({ orientation: 6 }).jpeg().toFile(source);
  const before = await readFile(source);
  const manifest = await prepareImage(source, output);
  assert.deepEqual(await readFile(source), before);
  for (const [index, variant] of manifest.variants.entries()) {
    const metadata = await sharp(path.join(output, variant.name)).metadata();
    assert.equal(metadata.format, 'webp'); assert.equal(metadata.exif, undefined);
    assert.equal(metadata.orientation, undefined); assert.equal(metadata.width, variant.width);
    assert.ok(Math.max(metadata.width, metadata.height) <= [640, 1600][index]);
    assert.ok((await stat(path.join(output, variant.name))).size <= [160, 600][index] * 1024);
  }
  await assert.rejects(prepareImage(source, output), /EEXIST/);
  const invalid = path.join(directory, 'unsafe.svg'); await writeFile(invalid, '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>');
  await assert.rejects(prepareImage(invalid, path.join(directory, 'invalid-output')), /single-frame/);
  console.log(`Media QA artifacts retained: ${directory}`);
});
