// Only Wikimedia's documented Special:FilePath resize service is transformed.
// Never append parameters to a signed/private S3 URL or invent CDN variants.
export function resourceImageProps(url: string, size: 'card' | 'detail' = 'card') {
  const defaults = { src: url, decoding: 'async' as const, loading: 'lazy' as const };
  try {
    const source = new URL(url);
    if (source.origin !== 'https://commons.wikimedia.org' || source.username || source.password || !source.pathname.startsWith('/wiki/Special:FilePath/')
      || !/\.(?:jpe?g|png|webp)$/i.test(decodeURIComponent(source.pathname))) return defaults;
    const resized = (width: number) => { const next = new URL(source); next.searchParams.set('width', String(width)); return next.toString(); };
    const widths = size === 'card' ? [320, 640, 960] : [640, 960, 1280];
    return { ...defaults, src: resized(size === 'card' ? 640 : 1280), srcSet: widths.map(width => `${resized(width)} ${width}w`).join(', '),
      sizes: size === 'card' ? '(max-width: 600px) calc(100vw - 48px), (max-width: 1000px) 45vw, 400px' : '(max-width: 800px) calc(100vw - 48px), 800px' };
  } catch { return defaults; }
}
