// CORS for the claude-proxy function. An allowed Origin is echoed back; anything else gets
// the first prod origin so the browser blocks the response cleanly.
//   - localhost / 127.0.0.1 (any port)         — local dev
//   - *.netlify.app                             — Netlify prod build + deploy previews
//   - STATIC_ALLOW below                        — the app's real domain(s)
//   - EXTRA_ALLOWED_ORIGINS env (comma-list)    — add a domain without a code change / redeploy of this file

const STATIC_ALLOW = ['https://dino.recipes', 'https://www.dino.recipes', 'https://dinnerideas.netlify.app'];

function extraAllowed(): string[] {
  return (Deno.env.get('EXTRA_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowList = [...STATIC_ALLOW, ...extraAllowed()];
  let allow = STATIC_ALLOW[0];
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.netlify.app') ||
        allowList.includes(origin)
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
