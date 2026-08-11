import { verifyFirebaseToken, unauthorized } from '../_lib/verifyAuth';

// Runs on Vercel's Edge Runtime: fast cold starts, native fetch/Request/Response,
// and streaming request/response bodies (important for image/video uploads).
export const config = { runtime: 'edge' };

const WAVESPEED_BASE = 'https://api.wavespeed.ai/api/v3';

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

  // 3. Rebuild the upstream Wavespeed URL from everything after /api/wavespeed/
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/wavespeed\//, '');
  const target = `${WAVESPEED_BASE}/${path}${url.search}`;

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
