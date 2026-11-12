import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Offline only: never run image conversion on an HTTP request or fetch remote URLs.
sharp.cache(false);
sharp.concurrency(1);
export async function prepareImage(input, outputDirectory) {
  const info = await stat(input);
  if (!info.isFile() || info.size > 20 * 1024 * 1024 || !info.size) throw new Error('Input must be a local image of 1 byte to 20 MiB.');
  const source = await readFile(input);
  const options = { limitInputPixels: 24000000, failOn: 'error' };
  const metadata = await sharp(source, options).metadata();
  if (!['jpeg', 'png', 'webp', 'avif'].includes(metadata.format) || (metadata.pages || 1) !== 1) throw new Error('Use a single-frame JPEG, PNG, WebP or AVIF image.');
  const variants = [];
  for (const [width, budget] of [[640, 160 * 1024], [1600, 600 * 1024]]) {
    let encoded;
    for (const quality of [80, 70, 60]) {
      encoded = await sharp(source, options).rotate().resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
        .webp({ quality, effort: 4 }).timeout({ seconds: 20 }).toBuffer({ resolveWithObject: true });
      if (encoded.data.length <= budget) break;
    }
    if (encoded.data.length > budget) throw new Error(`Image exceeds the ${width}px byte budget. Crop/simplify the source before publication.`);
    const digest = createHash('sha256').update(encoded.data).digest('hex').slice(0, 20);
    variants.push({ name: `${digest}-${width}.webp`, data: encoded.data, width: encoded.info.width, height: encoded.info.height, bytes: encoded.info.size });
  }
  // Dedicated new directory, no source/output overwrite. Keep partial outputs if
  // a filesystem error occurs, and do not emit a successful manifest in that case.
  await mkdir(outputDirectory);
  for (const variant of variants) await writeFile(path.join(outputDirectory, variant.name), variant.data, { flag: 'wx' });
  const manifest = { originalBytes: info.size, format: 'image/webp', metadataStripped: true,
    variants: variants.map(({ data: _data, ...variant }) => variant), uploadFile: variants[1].name,
    note: 'Attach the original credit/license in the media editor. Variants are not automatically published or wired to S3.' };
  await writeFile(path.join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output || input === '--help') console.log('Usage: npm run media:prepare -- <local-image> <new-output-directory>\nCreates bounded 640/1600 WebP variants offline; never uploads or changes the input.');
  else {
    try { console.log(JSON.stringify(await prepareImage(path.resolve(input), path.resolve(output)), null, 2)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
