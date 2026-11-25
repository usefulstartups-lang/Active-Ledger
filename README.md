# Useful Startups

India's startup **Ledger** + hourly **news**.

```
Google Sheet ──(Apps Script sync)──▶ Supabase ──▶ Website (Cloudflare Pages)
 control panel                        database     reads Supabase only
```

* **Google Sheet = your control panel.** Add, edit or delete startups; change any text, menu link, team member; hide a row with `Visible = no`. Same as always.
* **Supabase = the database.** The website never reads the Sheet directly.
* **Cloudflare Pages** hosts `public/` and the Buy-Me-a-Coffee functions in `functions/`.
* **GitHub Actions** fetches news every hour.

## Folder map
```
public/                 the website (static files)
  *.html                index, ledger, news, search, about, team, contact, support, terms, privacy
  js/                   site.js (menu, footer, home, text pages) · data.js (reads Supabase)
                        gsearch.js (site-wide search) · share.js (PDF report) · ledger-extras.js
                        news.js · preloader.js · config.js (the only file with settings) · vendor/pdf-lib
  css/  img/            styles and images
functions/api/coffee/   Cloudflare functions: order.js, webhook.js (Razorpay)
supabase/schema.sql     the whole database. Safe to run again
google-sheet/           Useful-Startups-Control-Panel.xlsx (upload as the new Sheet)
                        sync-to-supabase.gs (Sheet -> Supabase) · forms.gs (contact / suggestions / missed searches)
scripts/ + .github/     hourly news fetcher
wrangler.toml           Cloudflare Pages settings
```

## Setup

Full step-by-step guide: **[SETUP.md](SETUP.md)**.

## Day to day
* Everything is edited in the Google Sheet. Tabs are matched by **name** (list at the top of `sync-to-supabase.gs`).
* Settings text: blank line = new paragraph, `**bold**`, `[text](url)`, `- ` bullets, `## ` sub-heading.
* Visitor suggestions land in the `Submissions` tab, messages in `Contacts`, unanswered Ledger searches in `Missed Searches` (all auto-created).
* News fetch can be run by hand: GitHub > Actions > Fetch news > Run workflow.

## How the three searches differ
* **Ledger search bar** (top of the Ledger page): filters the startup cards. Unchanged.
* **Site search** (home page and above "Suggest a startup" on the Ledger page): startups, founders, news, team and pages. Enter opens `search.html`.
