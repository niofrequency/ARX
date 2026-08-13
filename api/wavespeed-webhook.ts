import type { IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { verifyWavespeedWebhookSignature } from './_lib/verifyWavespeedWebhook';
import { adminDb, adminStorage } from './_lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

// This must run on Vercel's Node.js runtime (default when no `runtime: 'edge'`
// is set) — firebase-admin and Node's crypto/Buffer APIs aren't Edge-compatible.
// Body parsing is disabled so we can verify the signature against the exact
// raw bytes Wavespeed signed; parsing-then-reserializing JSON can change
// whitespace/field order and silently break verification.
export const config = {
  api: {
    bodyParser: false,
  },
};

type Req = IncomingMessage & { method?: string; headers: Record<string, string | string[] | undefined> };

const getRawBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });

const headerValue = (h: string | string[] | undefined): string | undefined =>
  Array.isArray(h) ? h[0] : h;

export default async function handler(req: Req, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  const secret = process.env.WAVESPEED_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing WAVESPEED_WEBHOOK_SECRET environment variable.');
    res.statusCode = 500;
    res.end('Server misconfigured.');
    return;
  }

  const rawBody = await getRawBody(req);

  const verification = verifyWavespeedWebhookSignature(
    rawBody,
    {
      webhookId: headerValue(req.headers['webhook-id']),
      webhookTimestamp: headerValue(req.headers['webhook-timestamp']),
      webhookSignature: headerValue(req.headers['webhook-signature']),
    },
    secret
  );

  if (!verification.valid) {
    console.warn('Rejected webhook: ', verification.reason);
    res.statusCode = 401;
    res.end('Invalid signature.');
    return;
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error('Webhook body was not valid JSON', e);
    res.statusCode = 400;
    res.end('Invalid JSON body.');
    return;
  }

  const taskId: string | undefined = payload.id;
  const status: string | undefined = payload.status;

  if (!taskId) {
    res.statusCode = 200;
    res.end('OK');
    return;
  }

  try {
    const db = adminDb();
    const pendingRef = db.collection('pendingJobs').doc(taskId);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      // Nothing we can do without knowing which user this belongs to — most
      // likely already handled by the client's own polling, or a task this
      // server never tracked. Not an error.
      res.statusCode = 200;
      res.end('OK (no pending job)');
      return;
    }

    const { uid, prompt, mode, modelInfo, priceUsd, internalTaskId } = pendingSnap.data() as {
      uid: string;
      prompt: string;
      mode: string;
      modelInfo: string;
      priceUsd?: number;
      internalTaskId?: string;
    };

    if (status === 'completed' && Array.isArray(payload.outputs) && payload.outputs.length > 0) {
      const outputUrl: string = payload.outputs[0];
      const outputRes = await fetch(outputUrl);
      if (!outputRes.ok) throw new Error(`Failed to fetch generated asset (${outputRes.status})`);
      const contentType = outputRes.headers.get('content-type') || 'image/png';
      const isVideo = contentType.startsWith('video') || /\.mp4(\?|$)/i.test(outputUrl);
      const buffer = Buffer.from(await outputRes.arrayBuffer());

      const ext = isVideo ? 'mp4' : 'png';
      const storagePath = `outputs/${uid}/${taskId}.${ext}`;
      const bucket = adminStorage().bucket();
      const file = bucket.file(storagePath);
      const downloadToken = randomUUID();

      await file.save(buffer, {
        metadata: {
          contentType,
          metadata: { firebaseStorageDownloadTokens: downloadToken },
        },
      });

      // Matches the exact URL shape Firebase's client SDK getDownloadURL()
      // produces, so this is indistinguishable from a client-side upload to
      // the rest of the app (history rendering, deletion, etc. all just work).
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;

      await db
        .collection('users')
        .doc(uid)
        .collection('history')
        .doc(taskId)
        .set({
          id: taskId,
          prompt: prompt || 'Generation',
          url: downloadUrl,
          storagePath,
          date: new Date().toISOString(),
          modelInfo: modelInfo || 'Wavespeed',
          mode: mode || 'editor',
        });
    }
    // status === 'failed' (or anything else): nothing to upload. Refund the
    // credit that was reserved for this generation — this is the case
    // where the user's browser was gone when the job failed, so the
    // client-side refund (in markFailed) never got a chance to run.
    else if (status === 'failed' && priceUsd && internalTaskId) {
      const walletRef = db.collection('users').doc(uid).collection('wallet').doc('main');
      const txRef = db.collection('users').doc(uid).collection('transactions').doc(internalTaskId);

      await db.runTransaction(async (t) => {
        const txSnap = await t.get(txRef);
        if (!txSnap.exists) return;
        const txData = txSnap.data();
        // Idempotent: only refund a charge that hasn't already been refunded
        // (e.g. by the client noticing the failure first, if it was still open).
        if (txData?.status !== 'completed') return;

        t.set(
          walletRef,
          { balanceUsd: FieldValue.increment(priceUsd), updatedAt: new Date().toISOString() },
          { merge: true }
        );
        t.set(txRef, { status: 'refunded', refundedAt: new Date().toISOString() }, { merge: true });
      });
    }

    await pendingRef.delete();

    res.statusCode = 200;
    res.end('OK');
  } catch (e) {
    console.error('Failed to process Wavespeed webhook', e);
    // Return a non-2xx so Wavespeed retries delivery (their retry policy is
    // up to 3 attempts) in case this was a transient error on our end.
    res.statusCode = 500;
    res.end('Internal error processing webhook.');
  }
}
