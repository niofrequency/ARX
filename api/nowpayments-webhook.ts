import type { IncomingMessage, ServerResponse } from 'http';
import { verifyNowpaymentsSignature } from './_lib/verifyNowpaymentsWebhook.js';
import { adminDb } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

// Node.js runtime (default when no `runtime: 'edge'` is set) — firebase-admin
// needs Node APIs. Unlike the Wavespeed webhook, NOWPayments signs a
// re-serialized/sorted version of the body rather than the literal raw
// bytes, so there's no need to disable Vercel's automatic JSON body parsing
// here — `req.body` arrives already parsed.

type Req = IncomingMessage & {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: any;
};

const headerValue = (h: string | string[] | undefined): string | undefined =>
  Array.isArray(h) ? h[0] : h;

// NOWPayments statuses that represent the payment being fully and finally
// settled. `partially_paid` is intentionally excluded — that requires manual
// reconciliation per their docs, not automatic crediting.
const COMPLETED_STATUSES = new Set(['finished', 'confirmed']);

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!ipnSecret) {
    console.error('Missing NOWPAYMENTS_IPN_SECRET environment variable.');
    res.statusCode = 500;
    res.end('Server misconfigured.');
    return;
  }

  const payload = req.body;
  const receivedSignature = headerValue(req.headers['x-nowpayments-sig']);

  if (!payload || !verifyNowpaymentsSignature(payload, receivedSignature, ipnSecret)) {
    console.warn('Rejected NOWPayments webhook: invalid signature.');
    res.statusCode = 401;
    res.end('Invalid signature.');
    return;
  }

  const orderId: string | undefined = payload.order_id;
  const paymentStatus: string | undefined = payload.payment_status;

  if (!orderId) {
    res.statusCode = 200;
    res.end('OK');
    return;
  }

  try {
    const db = adminDb();
    const pendingRef = db.collection('pendingPayments').doc(orderId);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      // Either already processed, or a payment this server never tracked.
      res.statusCode = 200;
      res.end('OK (no pending payment)');
      return;
    }

    const { uid, amountUsd } = pendingSnap.data() as { uid: string; amountUsd: number };

    if (paymentStatus && COMPLETED_STATUSES.has(paymentStatus)) {
      const walletRef = db.collection('users').doc(uid).collection('wallet').doc('main');
      const txRef = db.collection('users').doc(uid).collection('transactions').doc(orderId);

      await db.runTransaction(async (t) => {
        t.set(
          walletRef,
          {
            balanceUsd: FieldValue.increment(amountUsd),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        t.set(txRef, {
          id: orderId,
          amountUsd,
          status: 'completed',
          provider: 'nowpayments',
          createdAt: new Date().toISOString(),
        });
      });

      await pendingRef.delete();
    } else if (paymentStatus === 'failed' || paymentStatus === 'expired' || paymentStatus === 'refunded') {
      // Nothing to credit; just clean up so this doesn't linger forever.
      await pendingRef.delete();
    }
    // Any other in-progress status (waiting, confirming, sending, etc.):
    // leave the pendingPayments record in place — more IPN calls will
    // follow as the payment progresses toward a final status.

    res.statusCode = 200;
    res.end('OK');
  } catch (e) {
    console.error('Failed to process NOWPayments webhook', e);
    res.statusCode = 500;
    res.end('Internal error processing webhook.');
  }
}
