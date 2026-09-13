import type { IncomingMessage, ServerResponse } from 'http';
import { verifyFirebaseTokenNode } from './_lib/verifyAuthNode.js';
import { adminStorage } from './_lib/firebaseAdmin.js';

type Req = IncomingMessage & {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
};

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  const user = await verifyFirebaseTokenNode(req.headers);
  if (!user) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.searchParams.get('path') || '';
  const allowed = path.startsWith(`users/${user.uid}/refLibrary/`) || path.startsWith(`users/${user.uid}/refFamilies/`);
  if (!path || path.includes('..') || !allowed) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Forbidden path' }));
    return;
  }

  try {
    const file = adminStorage().bucket().file(path);
    const [exists] = await file.exists();
    if (!exists) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const [buf] = await file.download();
    const [meta] = await file.getMetadata();
    res.statusCode = 200;
    res.setHeader('Content-Type', meta.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.end(buf);
  } catch (err: any) {
    console.error('ref-file proxy failed', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Download failed' }));
  }
}
