// Cloudflare Worker entry. The website itself is the static files in public/ (served by Cloudflare directly).
// Only the Buy-Me-a-Coffee payment URLs under /api/ come through here.
import { onRequest as coffeeOrder } from '../functions/api/coffee/order.js';
import { onRequest as coffeeWebhook } from '../functions/api/coffee/webhook.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/coffee/order') return coffeeOrder({ request, env });
    if (pathname === '/api/coffee/webhook') return coffeeWebhook({ request, env });
    if (pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
