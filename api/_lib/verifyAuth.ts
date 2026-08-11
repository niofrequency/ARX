/**
 * Verifies a Firebase ID token by asking Firebase itself whether it's valid,
 * via the Identity Toolkit `accounts:lookup` endpoint. This runs on Vercel's
 * Edge Runtime, so we can't use the Node-only firebase-admin SDK — this is
 * the lightweight, dependency-free equivalent.
 *
 * Requires the (public) Firebase Web API key to be available server-side as
 * either FIREBASE_API_KEY or VITE_FIREBASE_API_KEY (the same value you use
 * for the frontend build works fine here too).
 */
export async function verifyFirebaseToken(req: Request): Promise<{ uid: string; email?: string } | null> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!idToken) return null;

  const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error('Missing FIREBASE_API_KEY / VITE_FIREBASE_API_KEY env var on the server.');
    return null;
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = data?.users?.[0];
    if (!user?.localId) return null;
    return { uid: user.localId, email: user.email };
  } catch (e) {
    console.error('Token verification failed', e);
    return null;
  }
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized. Please sign in and try again.' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
