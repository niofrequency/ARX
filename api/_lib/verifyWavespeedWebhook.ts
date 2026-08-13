import crypto from 'crypto';

/**
 * Verifies a webhook request actually came from WaveSpeedAI, per their
 * documented spec (https://wavespeed.ai/docs/verify-webhooks):
 *   HMAC_SHA256(secret_without_whsec_prefix, "{webhook-id}.{webhook-timestamp}.{raw_body}")
 * compared against the `webhook-signature: v3,<hex>` header, with the
 * timestamp rejected if older than 5 minutes (replay protection).
 *
 * `rawBody` MUST be the exact raw request body string — re-serializing a
 * parsed JSON object will not necessarily match byte-for-byte and will fail
 * verification.
 */
export function verifyWavespeedWebhookSignature(
  rawBody: string,
  headers: { webhookId?: string; webhookTimestamp?: string; webhookSignature?: string },
  secret: string,
  maxAgeSeconds = 300
): { valid: boolean; reason?: string } {
  const { webhookId, webhookTimestamp, webhookSignature } = headers;

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return { valid: false, reason: 'Missing required webhook headers.' };
  }

  const parts = webhookSignature.split(',');
  if (parts.length !== 2 || parts[0] !== 'v3' || !/^[a-f0-9]{64}$/i.test(parts[1])) {
    return { valid: false, reason: 'Malformed webhook-signature header.' };
  }
  const receivedSignature = parts[1];

  const ageSeconds = Math.abs(Date.now() / 1000 - parseInt(webhookTimestamp, 10));
  if (!Number.isFinite(ageSeconds) || ageSeconds > maxAgeSeconds) {
    return { valid: false, reason: 'Webhook timestamp too old (possible replay).' };
  }

  const keyWithoutPrefix = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const expectedSignature = crypto.createHmac('sha256', keyWithoutPrefix).update(signedContent).digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'hex');
  const receivedBuf = Buffer.from(receivedSignature, 'hex');
  if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
    return { valid: false, reason: 'Signature mismatch.' };
  }

  return { valid: true };
}
