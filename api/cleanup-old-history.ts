import type { IncomingMessage, ServerResponse } from 'http';
import { adminDb, adminStorage } from './_lib/firebaseAdmin';

// Node.js runtime (default) — needs firebase-admin. Triggered on a schedule
// by Vercel Cron (see the "crons" entry in vercel.json), not by users.

type Req = IncomingMessage & { method?: string; headers: Record<string, string | string[] | undefined> };

const RETENTION_DAYS = 14;
// Caps how many items get cleaned up per run, so this can't run long enough
// to hit a function timeout if a large backlog ever builds up — any
// leftover items just get picked up by tomorrow's run instead.
const MAX_PER_RUN = 500;

const headerValue = (h: string | string[] | undefined): string | undefined =>
  Array.isArray(h) ? h[0] : h;

export default async function handler(req: Req, res: ServerResponse) {
  // Only Vercel's own cron trigger (or a manual call carrying the same
  // secret) may run this — it permanently deletes user data, so it must
  // never be a publicly callable URL.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = headerValue(req.headers['authorization']);
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return;
  }

  try {
    const cutoffIso = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const db = adminDb();

    // Collection-group query: reaches every user's users/{uid}/history
    // subcollection in one pass, not just one specific user's.
    const snap = await db
      .collectionGroup('history')
      .where('date', '<', cutoffIso)
      .limit(MAX_PER_RUN)
      .get();

    let deleted = 0;
    let failed = 0;

    for (const doc of snap.docs) {
      const data = doc.data() as { storagePath?: string };
      try {
        if (data.storagePath) {
          await adminStorage()
            .bucket()
            .file(data.storagePath)
            .delete({ ignoreNotFound: true } as any);
        }
        await doc.ref.delete();
        deleted++;
      } catch (e) {
        console.error(`Failed to clean up history item ${doc.id}`, e);
        failed++;
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        deleted,
        failed,
        mayHaveMore: snap.size === MAX_PER_RUN,
        cutoffIso,
      })
    );
  } catch (e) {
    console.error('Cleanup job failed', e);
    res.statusCode = 500;
    res.end('Internal error running cleanup.');
  }
}
