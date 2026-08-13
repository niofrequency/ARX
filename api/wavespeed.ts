import { verifyFirebaseToken, unauthorized } from './_lib/verifyAuth.js';

// Runs on Vercel's Edge Runtime: fast cold starts, native fetch/Request/Response,
// and streaming request/response bodies (important for image/video uploads).
export const config = { runtime: 'edge' };

const WAVESPEED_BASE = 'https://api.wavespeed.ai/api/v3';

// NOTE: this is intentionally a single fixed file (api/wavespeed.ts), not a
// bracketed catch-all route like api/wavespeed/[...path].ts. Multi-segment
// catch-all routes are unreliable for plain (non-Next.js) Vercel Serverless/
// Edge Functions — a request like /api/wavespeed/bytedance/seedream/edit can
// 404 before it ever reaches the function. Passing the real upstream path as
// a `?path=` query string on a single static route sidesteps that entirely.
export default async function handler(req: Request) {
  // 1. Require a signed-in user. This is what actually keeps random visitors
  //    from burning through your Wavespeed credits now that the key lives
  //    on the server instead of in each user's browser.
  const user = await verifyFirebaseToken(req);
  if (!user) return unauthorized();

  // 2. Make sure the server actually has the real key configured.
  const wavespeedKey = process.env.WAVESPEED_API_KEY;
  if (!wavespeedKey) {
    return new Response(
      JSON.stringify({ error: 'Server is missing the WAVESPEED_API_KEY environment variable.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Read the real upstream path out of ?path=, plus forward any other query params.
  const url = new URL(req.url);
  const upstreamPath = url.searchParams.get('path');
  if (!upstreamPath) {
    return new Response(JSON.stringify({ error: 'Missing required "path" query parameter.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  url.searchParams.delete('path');
  const target = `${WAVESPEED_BASE}/${upstreamPath}${url.search}`;

  // 4. Forward the request as-is (headers, method, body) but swap in the
  //    real server-side key and drop whatever Authorization the client sent
  //    (that was just their ID token, not a Wavespeed credential).
  const headers = new Headers(req.headers);
  headers.delete('authorization');
  headers.delete('host');
  headers.delete('content-length');
  headers.set('Authorization', `Bearer ${wavespeedKey}`);

  const hasBody = !['GET', 'HEAD'].includes(req.method);

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    // Required by the edge runtime when streaming a request body through.
    // @ts-expect-error - duplex is valid at runtime but missing from the TS lib types
    duplex: hasBody ? 'half' : undefined,
  });

  const respHeaders = new Headers(upstream.headers);
  respHeaders.delete('content-encoding');
  respHeaders.delete('content-length');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}
