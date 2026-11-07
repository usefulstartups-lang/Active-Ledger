// Cloudflare Pages Function: POST /api/beer/order
// Creates a Razorpay order for one of the 5 fixed tiers. The amount is decided HERE, never by the browser.
const TIERS = { beer: 10, round: 50, cheers: 100, party: 500, bar: 5000 };   // rupees. Keep in sync with site.js

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
    return json({ error: 'not_configured' }, 501);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }

  const amount = TIERS[body.tier];
  if (!amount) return json({ error: 'bad_tier' }, 400);
  const name = String(body.name || '').replace(/\s+/g, ' ').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{1,23}$/.test(name)) return json({ error: 'bad_name' }, 400);

  const rz = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + btoa(env.RAZORPAY_KEY_ID + ':' + env.RAZORPAY_KEY_SECRET) },
    body: JSON.stringify({ amount: amount * 100, currency: 'INR', receipt: 'beer_' + Date.now().toString(36), notes: { username: name, tier: body.tier } }),
  });
  const order = await rz.json().catch(() => ({}));
  if (!rz.ok || !order.id) return json({ error: 'order_failed' }, 502);

  // Remember the pending order. If this fails the payment still works: the webhook creates the row.
  const ins = await fetch(env.SUPABASE_URL + '/rest/v1/beer_payments', {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ order_id: order.id, username: name, tier: body.tier, amount, status: 'created' }),
  }).catch(() => null);
  if (ins && !ins.ok) console.error('beer_payments insert failed', ins.status);

  return json({ order_id: order.id, key_id: env.RAZORPAY_KEY_ID, amount: order.amount });
}
