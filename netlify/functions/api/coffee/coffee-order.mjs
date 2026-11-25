// Netlify Function: POST /api/coffee/order
// Creates a Razorpay order. Fixed-tier prices are decided HERE, never by the browser.
// Custom amounts are checked here too: whole rupees from 10 to 100000.
export const config = { path: '/api/coffee/order' };

const TIERS = { coffee: 10, croissant: 50, refill: 100, team: 500, cafe: 5000 };   // rupees. Keep in sync with TIERS in site.js
const MIN_AMT = 10, MAX_AMT = 100000;
const SITES = { useful: 'Useful Startups' };
const env = (k) => Netlify.env.get(k);

const allowedOrigins = () => String(env('COFFEE_ALLOWED_ORIGINS') || '').split(',').map((s) => s.trim()).filter(Boolean);

function headersFor(request) {
  const h = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const origin = request.headers.get('Origin');
  if (origin && allowedOrigins().includes(origin)) { h['Access-Control-Allow-Origin'] = origin; h['Vary'] = 'Origin'; }
  return h;
}
const json = (request, o, status = 200) => new Response(JSON.stringify(o), { status, headers: headersFor(request) });

export default async (request) => {
  const origin = request.headers.get('Origin');

  if (request.method === 'OPTIONS') {   // pre-flight, only for other sites you list in COFFEE_ALLOWED_ORIGINS
    if (!origin || !allowedOrigins().includes(origin)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin, Vary: 'Origin',
      'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
  }
  if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405);

  if (!env('RAZORPAY_KEY_ID') || !env('RAZORPAY_KEY_SECRET') || !env('SUPABASE_URL') || !env('SUPABASE_SERVICE_ROLE_KEY'))
    return json(request, { error: 'not_configured' }, 501);

  // Browsers from unknown websites are refused. Own site and listed sites only.
  if (origin && origin !== new URL(request.url).origin && !allowedOrigins().includes(origin))
    return json(request, { error: 'origin_not_allowed' }, 403);

  let body;
  try { body = await request.json(); } catch { return json(request, { error: 'bad_request' }, 400); }

  let amount;
  if (body.tier === 'custom') {
    amount = body.amount;
    if (!Number.isInteger(amount) || amount < MIN_AMT || amount > MAX_AMT) return json(request, { error: 'bad_amount' }, 400);
  } else {
    amount = TIERS[body.tier];
    if (!amount) return json(request, { error: 'bad_tier' }, 400);
  }
  const site = body.site === undefined ? 'useful' : String(body.site);
  if (!SITES[site]) return json(request, { error: 'bad_site' }, 400);
  const name = String(body.name || '').replace(/\s+/g, ' ').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{1,23}$/.test(name)) return json(request, { error: 'bad_name' }, 400);

  const rz = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + btoa(env('RAZORPAY_KEY_ID') + ':' + env('RAZORPAY_KEY_SECRET')) },
    body: JSON.stringify({ amount: amount * 100, currency: 'INR', receipt: 'coffee_' + Date.now().toString(36), notes: { username: name, tier: body.tier, site } }),
  });
  const order = await rz.json().catch(() => ({}));
  if (!rz.ok || !order.id) return json(request, { error: 'order_failed' }, 502);

  // Remember the pending order. If this fails the payment still works: the webhook creates the row.
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const ins = await fetch(env('SUPABASE_URL') + '/rest/v1/coffee_payments', {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ order_id: order.id, username: name, tier: body.tier, amount, site, status: 'created' }),
  }).catch(() => null);
  if (ins && !ins.ok) console.error('coffee_payments insert failed', ins.status);

  return json(request, { order_id: order.id, key_id: env('RAZORPAY_KEY_ID'), amount: order.amount, site_name: SITES[site] });
};
