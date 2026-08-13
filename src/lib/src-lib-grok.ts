import { verifyFirebaseToken, unauthorized } from './_lib/verifyAuth.js';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = await verifyFirebaseToken(req);
  if (!user) return unauthorized();

  const grokKey = process.env.GROK_API_KEY;
  if (!grokKey) {
    return new Response(
      JSON.stringify({ error: 'Server is missing the GROK_API_KEY environment variable.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await req.text();

  const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${grokKey}`,
    },
    body,
  });

  const respHeaders = new Headers(upstream.headers);
  respHeaders.delete('content-encoding');
  respHeaders.delete('content-length');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}
