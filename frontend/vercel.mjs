const apiOrigin = process.env.LRM_RAILWAY_API_ORIGIN;
const api = apiOrigin ? new URL(apiOrigin) : null;
if (!api || api.protocol !== 'https:' || api.username || api.password || api.href !== api.origin + '/') {
  throw new Error('Set LRM_RAILWAY_API_ORIGIN to the Railway API HTTPS origin without a path.');
}

const privateRoutes = ['/login', '/register', '/workspace/:path*'];

export const config = {
  framework: 'vite',
  installCommand: 'npm ci',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  trailingSlash: false,
  rewrites: [
    { source: '/api/:path*', destination: api.origin + '/api/:path*' },
    ...['resources', 'schedule', 'how-it-works'].map(page => ({
      source: '/' + page,
      destination: '/' + page + '/index.html',
    })),
    ...privateRoutes.map(source => ({ source, destination: '/private.html' })),
  ],
  headers: [
    {
      source: '/media/catalog/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; img-src 'self' data: https:; media-src 'self' https:; font-src 'self'; connect-src 'self' https://accounts.google.com/gsi/; frame-src https://accounts.google.com/gsi/ https://www.google.com/maps/embed; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
        },
      ],
    },
    {
      source: '/api/:path*',
      headers: [
        { key: 'x-vercel-enable-rewrite-caching', value: '0' },
        { key: 'Cache-Control', value: 'no-store' },
      ],
    },
    ...[...privateRoutes, '/private.html'].map(source => ({
      source,
      headers: [
        { key: 'Cache-Control', value: 'no-store' },
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      ],
    })),
  ],
};
