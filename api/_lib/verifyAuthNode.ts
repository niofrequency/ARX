const headerValue = (h: string | string[] | undefined): string | undefined =>
  Array.isArray(h) ? h[0] : h;

/**
 * Same verification as _lib/verifyAuth.ts's verifyFirebaseToken, but reads
 * from a plain Node headers object (`req.headers`) instead of a Web-standard
 * Request — for use in Node.js runtime functions (which use the classic
 * IncomingMessage/ServerResponse handler shape) rather than Edge functions.
 */
export async function verifyFirebaseTokenNode(
  headers: Record<string, string | string[] | undefined>
): Promise<{ uid: string; email?: string } | null> {
  const authHeader = headerValue(headers['authorization'] || headers['Authorization']) || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!idToken) return null;

  const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error('Missing FIREBASE_API_KEY / VITE_FIREBASE_API_KEY env var on the server.');
    return null;
  }

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const u = data?.users?.[0];
    if (!u?.localId) return null;
    return { uid: u.localId, email: u.email };
  } catch (e) {
    console.error('Token verification failed', e);
    return null;
  }
}
