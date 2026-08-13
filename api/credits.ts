import type { IncomingMessage, ServerResponse } from 'http';
import { verifyFirebaseTokenNode } from './_lib/verifyAuthNode';
import { adminDb } from './_lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

// Node.js runtime (default) — needs firebase-admin. Vercel auto-parses JSON
// bodies for plain Node functions (not just Next.js), so req.body arrives
// already parsed here — no manual body reading needed like the webhooks.

type Req = IncomingMessage & {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: any;
};

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'POST') {
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

  const { action, taskId, amountUsd, modelInfo } = req.body || {};
  if (
    (action !== 'reserve' && action !== 'refund') ||
    typeof taskId !== 'string' ||
    !taskId ||
    typeof amountUsd !== 'number' ||
    amountUsd <= 0
  ) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid request' }));
    return;
  }

  const db = adminDb();
  const walletRef = db.collection('users').doc(user.uid).collection('wallet').doc('main');
  const txRef = db.collection('users').doc(user.uid).collection('transactions').doc(taskId);

  try {
    if (action === 'reserve') {
      // This is the ONLY place a balance is ever decremented — atomic
      // check-then-decrement inside a Firestore transaction, so two
      // concurrent generations can never both succeed against a balance
      // that only covers one of them.
      const result = await db.runTransaction(async (t) => {
        const walletSnap = await t.get(walletRef);
        const balance = walletSnap.exists ? Number(walletSnap.data()?.balanceUsd) || 0 : 0;

        if (balance < amountUsd) {
          return { ok: false as const, balance };
        }

        t.set(
          walletRef,
          { balanceUsd: FieldValue.increment(-amountUsd), updatedAt: new Date().toISOString() },
          { merge: true }
        );
        t.set(txRef, {
          id: taskId,
          type: 'debit',
          amountUsd,
          status: 'completed',
          modelInfo: modelInfo || '',
          createdAt: new Date().toISOString(),
        });

        return { ok: true as const, balance: balance - amountUsd };
      });

      res.statusCode = result.ok ? 200 : 402;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify(
          result.ok
            ? { ok: true, balance: result.balance }
            : { ok: false, error: 'insufficient_balance', balance: result.balance }
        )
      );
      return;
    }

    // action === 'refund'
    // Idempotent by design: only refunds a transaction that's currently
    // 'completed' (i.e. was actually charged and not already refunded), so
    // calling this twice for the same taskId — e.g. both the client's own
    // failure detection AND the Wavespeed webhook's — never double-refunds.
    await db.runTransaction(async (t) => {
      const txSnap = await t.get(txRef);
      if (!txSnap.exists) return;
      const txData = txSnap.data();
      if (txData?.status !== 'completed') return;

      t.set(
        walletRef,
        { balanceUsd: FieldValue.increment(amountUsd), updatedAt: new Date().toISOString() },
        { merge: true }
      );
      t.set(txRef, { status: 'refunded', refundedAt: new Date().toISOString() }, { merge: true });
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error('Credits endpoint error', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal error' }));
  }
}
