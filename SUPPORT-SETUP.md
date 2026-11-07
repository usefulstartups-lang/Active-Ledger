# Buy Me a Beer: setup (about 30 minutes)

What you have: public/support.html (the page), functions/api/beer/order.js + webhook.js (secure payments),
supabase-beer.sql (database). Payments use Razorpay. The leaderboard updates itself after each successful payment.

## 1. Database (Supabase)
SQL Editor > New query > paste supabase-beer.sql > Run.

## 2. Razorpay
1. Create a Razorpay account and complete business verification (KYC). Start in TEST mode.
2. Settings > API Keys: generate a key. You get a Key ID and a Key Secret.
3. Settings > Webhooks > Add new webhook:
   - URL:    https://YOUR-SITE.com/api/beer/webhook
   - Secret: invent a long random text (this is your webhook secret)
   - Event:  payment.captured  (tick only this one)
4. Make sure payments are set to auto-capture (Settings > Payment capture).

## 3. Cloudflare Pages
1. Put the `functions` folder at the TOP level of your GitHub repo (next to `public`), then upload the other files.
2. Cloudflare > Workers & Pages > your project > Settings > Variables and Secrets. Add these 5 as ENCRYPTED secrets:
   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
3. Redeploy (Deployments > Retry, or push any commit).

## 4. Menu link
Nav tab: add a row  Label: Buy Me a Beer | URL: support.html | Location: both | Group: Company | Order: 7 | Visible: Yes

## 5. Test, then go live
1. Open /support.html, pick a tier, enter a username, pay with Razorpay TEST card/UPI details from their docs.
2. Within seconds the username appears in the Top 5. Check the row in Supabase > Table editor > beer_payments (status = paid).
3. When happy, switch Razorpay to LIVE: replace the key id/secret and webhook secret in Cloudflare, redeploy.

## Notes
- Amounts are fixed on the server (10, 50, 100, 500, 5000). Changing a price means editing BOTH the TIERS list in site.js and in functions/api/beer/order.js.
- To remove a name from the leaderboard: Supabase > beer_payments > set hidden = true on that person's rows.
- The service-role key and Razorpay secrets live ONLY in Cloudflare secrets. Never put them in site.js or config.js.
- Add a refund/donation line to your Terms page. Check Razorpay's rules for "donations" for your business type, and ask your accountant about tax.
- Payments are not live until steps 1-3 are done: until then the button politely says payments are not switched on.
