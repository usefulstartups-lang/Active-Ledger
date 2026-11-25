// Netlify Function: POST /api/coffee/webhook
// Razorpay calls this after a payment. We check the signature, then mark the payment as paid.
// The leaderboard reads the paid rows, so rankings update automatically.
export const config = { path: '/api/coffee/webhook' };

const env = (k) => Netlify.env.get(k);
const enc = new TextEncoder();

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export default async (request) => {
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });
  if (!env('RAZORPAY_WEBHOOK_SECRET') || !env('SUPABASE_URL') || !env('SUPABASE_SERVICE_ROLE_KEY'))
    return new Response('not configured', { status: 501 });

  const raw = await request.text();
  const sig = request.headers.get('x-razorpay-signature') || '';
  if (!safeEqual(await hmacHex(env('RAZORPAY_WEBHOOK_SECRET'), raw), sig)) return new Response('invalid signature', { status: 400 });

  let ev;
  try { ev = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }
  if (ev.event !== 'payment.captured') return new Response('ignored', { status: 200 });

  const p = ev.payload && ev.payload.payment && ev.payload.payment.entity;
  if (!p || p.status !== 'captured' || p.currency !== 'INR' || !p.order_id) return new Response('ignored', { status: 200 });

  const row = {
    order_id: p.order_id,
    payment_id: p.id,
    username: (p.notes && p.notes.username) || 'Anonymous',
    tier: (p.notes && p.notes.tier) || null,
    site: (p.notes && p.notes.site) || 'useful',
    amount: p.amount / 100,
    status: 'paid',
    paid_at: new Date((p.created_at || Date.now() / 1000) * 1000).toISOString(),
  };
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(env('SUPABASE_URL') + '/rest/v1/coffee_payments?on_conflict=order_id', {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  });
  if (!r.ok) { console.error('coffee webhook db error', r.status); return new Response('db error', { status: 500 }); } // Razorpay retries
  return new Response('ok', { status: 200 });
};
