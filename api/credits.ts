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

// Comma-separated list of emails that skip balance checks entirely — for
// the site owner to use the app freely against the real Wavespeed balance,
// without needing to "pay themselves" through the credit system. The email
// comes from a verified Firebase ID token (checked below), so this can't be
// spoofed by editing client-side code — only someone who actually controls
// one of these accounts' real login can trigger the bypass.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

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

  const isAdmin = !!user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

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
      // Admin accounts never touch the wallet balance at all — every
      // generation is free for them, drawn straight against the real
      // Wavespeed account balance. Still logged (status 'admin_free', not
      // 'completed') purely for their own visibility into how much they've
      // personally used — and specifically NOT 'completed' so the refund
      // path below correctly treats it as nothing-to-refund.
      if (isAdmin) {
        await txRef.set({
          id: taskId,
          type: 'debit',
          amountUsd,
          status: 'admin_free',
          modelInfo: modelInfo || '',
          createdAt: new Date().toISOString(),
        });
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, balance: null, admin: true }));
        return;
      }

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
    if (isAdmin) {
      // Nothing was ever deducted for an admin charge, so there's nothing
      // to give back — just no-op successfully.
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
      return;
    }

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
