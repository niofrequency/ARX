import { verifyFirebaseToken, unauthorized } from './_lib/verifyAuth.js';

export const config = { runtime: 'edge' };

// The only credit packs users are allowed to buy — deliberately a fixed
// server-side list rather than trusting a client-supplied amount, so
// nobody can call this endpoint with a tampered price.
const CREDIT_PACKS: Record<string, number> = {
  tiny: 5,
  small: 10,
  medium: 25,
  large: 50,
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = await verifyFirebaseToken(req);
  if (!user) return unauthorized();

  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server is missing NOWPAYMENTS_API_KEY.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { packId?: string; orderId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { packId, orderId } = body;
  const amountUsd = packId ? CREDIT_PACKS[packId] : undefined;
  if (!amountUsd || !orderId) {
    return new Response(JSON.stringify({ error: 'Invalid or missing packId/orderId.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const origin = new URL(req.url).origin;

  const upstream = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount: amountUsd,
      price_currency: 'usd',
      order_id: orderId,
      order_description: `ARX credits — $${amountUsd}`,
      success_url: `${origin}/?topup=success`,
      cancel_url: `${origin}/?topup=cancelled`,
      // pay_currency intentionally omitted — the user picks any coin they
      // hold on NOWPayments' own hosted invoice page, rather than us
      // locking the checkout to one specific asset.
    }),
  });

  const data = await upstream.json();
  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: data?.message || 'Failed to create invoice.' }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ invoiceUrl: data.invoice_url, amountUsd }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
