import crypto from 'crypto';

/**
 * Recursively sorts every object's keys alphabetically (arrays keep their
 * order, only object keys get sorted, at every depth). This matches
 * NOWPayments' own reference implementation for IPN signing exactly —
 * https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389
 */
function sortObjectDeep(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sortObjectDeep);
  }
  if (value !== null && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc: Record<string, any>, key) => {
        acc[key] = sortObjectDeep(value[key]);
        return acc;
      }, {});
  }
  return value;
}

/**
 * Verifies a NOWPayments IPN (webhook) request. Unlike Wavespeed's scheme,
 * NOWPayments signs a *re-serialized, key-sorted* version of the JSON body
 * rather than the literal raw bytes — so parsing the body first is fine
 * here (there's no "must use raw bytes" requirement like Wavespeed had).
 */
export function verifyNowpaymentsSignature(
  parsedBody: any,
  receivedSignature: string | undefined,
  ipnSecret: string
): boolean {
  if (!receivedSignature || !ipnSecret) return false;

  const sorted = sortObjectDeep(parsedBody);
  const signedContent = JSON.stringify(sorted);

  const expectedSignature = crypto.createHmac('sha512', ipnSecret).update(signedContent).digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'hex');
  const receivedBuf = Buffer.from(receivedSignature, 'hex');
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
