# Useful Startups

India's startup **Ledger** + hourly **news**.

```
Google Sheet  ──(Apps Script sync)──▶  Supabase  ──▶  Website (Netlify)
 control panel                          database       reads Supabase only
```

* **Google Sheet = your control panel.** Add/edit/delete startups, change page text, nav, team, hide rows (`Visible = no`) exactly as before.
* **Supabase = the database.** The site never reads the Sheet directly any more.
* **Netlify** hosts `public/` and the Buy-Me-a-Coffee functions. **GitHub Actions** fetches news hourly.

## Folder map
| Path | What it is |
|---|---|
| `public/` | The website (static). `data.js` reads Supabase, `site.js` = nav/footer/home, `ledger.html` + `ledger-extras.js` = Ledger, `share.js` = share report, `news.html` + `app.js` = news |
| `supabase/schema.sql` | Whole database. Safe to re-run |
| `google-sheet/sync-to-supabase.gs` | Sheet → Supabase sync (paste into the Sheet's Apps Script) |
| `google-sheet/contact-form.gs`, `templates/` | Contact form script; starter CSVs for the Settings/Nav/Pages/Team/Highlights tabs |
| `netlify/functions/` | `coffee-order.mjs`, `coffee-webhook.mjs` (Razorpay) |
| `scripts/` + `.github/workflows/fetch-news.yml` | Hourly news fetcher |

## Setup (once)
1. **Supabase** → SQL Editor → paste `supabase/schema.sql` → Run.
2. **Sheet sync** → open the Sheet → Extensions → Apps Script → new file, paste `google-sheet/sync-to-supabase.gs`.
   Project Settings → Script properties: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (service_role key). Run `installSync` once and approve.
   From then on edits sync ~1 minute after you stop typing; menu **Useful Startups → Sync to website now** is instant.
3. **Netlify** env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
   Razorpay webhook URL: `https://YOUR-SITE/api/coffee/webhook`, event `payment.captured`.
4. **GitHub** repo secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (news fetcher).
5. `public/config.js`: set `SITE_URL` to your real domain (or add a Settings row `site_url`).

The service_role key goes only into Apps Script / Netlify / GitHub secrets, never into `public/`.

## Sheet tabs → website
`Active Ledger` (gid 0) → `ledger` · `Founders` → `founders` · `Settings` · `Nav` · `Pages` · `Team` · `Highlights` · optional `Unlisted Shares`.
Tabs are matched by gid (listed at the top of the `.gs` file), so renaming a tab is safe. Missed searches and suggestions still go to your existing Apps Script web apps / Sheet tabs.

Settings text supports: blank line = paragraph, `**bold**`, `[text](url)`, `- ` bullets, `## ` subheading.
