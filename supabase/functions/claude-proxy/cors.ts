// CORS for the claude-proxy function. Allows localhost (any port), *.netlify.app, and the
// project's own domains. Falls back to the prod origin for anything unrecognised.

const STATIC_ALLOW = ['https://dinnerideas.netlify.app'];

export function corsHeaders(origin: string | null): Record<string, string> {
  let allow = STATIC_ALLOW[0];
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.netlify.app') ||
        STATIC_ALLOW.includes(origin)
      ) {
        allow = origin;
      }
    } catch {
      // non-URL origin — keep the fallback
    }
  }
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}
