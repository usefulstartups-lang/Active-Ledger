# Setup guide: Useful Startups

Follow the steps **in order**. Total time: about 45 to 60 minutes. You only do this once.

**How the pieces fit**

```
Google Sheet  ──(Apps Script)──▶  Supabase  ──▶  Website on Cloudflare Pages
(you edit here)                   (database)      (visitors see this)
                                      ▲
GitHub Actions ── news every hour ────┘
```

## What you need before starting

| Account | Used for | Needed? |
|---|---|---|
| GitHub | Stores the code, runs the hourly news job | Yes |
| Supabase | The database | Yes |
| Google (Drive / Sheets) | Your control panel | Yes |
| Cloudflare | Hosts the website | Yes |
| Razorpay | "Buy me a coffee" payments | Only if you want payments |

Keep a notepad open. You will collect a few values (keys, URLs) along the way. They are marked **📋 SAVE THIS**.

---

## Step 1: Put the code in GitHub

1. Back up your old repo (you said you will).
2. Unzip `Useful-Startups-repo.zip` on your computer. You will see `public`, `functions`, `supabase`, `google-sheet`, `scripts`, `README.md`, `SETUP.md`...
3. In your repo, delete all old files, then add the unzipped files **so that `public/` and `functions/` sit at the top level of the repo** (not inside an extra folder).
4. Commit and push.

Easiest way without Git commands: GitHub repo page > delete files > then **Add file > Upload files** and drag in the contents of the unzipped folder. Make sure the `.github` folder uploads too (it is hidden on some computers; on Windows enable "Hidden items", on Mac press `Cmd + Shift + .`).

> Check: your repo must show `.github/workflows/fetch-news.yml`. If it is missing the hourly news job will not run.

---

## Step 2: Supabase (the database)

**Use your existing project, or create a new one**
- Existing project: just open it.
- New project: supabase.com > New project > pick a name, a strong database password, region closest to India (Mumbai) > Create. Wait about 2 minutes.

**2a. Create the tables**
1. Left menu **SQL Editor** > **New query**.
2. Open `supabase/schema.sql` from the repo, copy **everything**, paste, click **Run**.
3. You should see "Success". It is safe to run again later.

**2b. Collect your keys**
Left menu **Project Settings** (gear) > **API**.

- **📋 Project URL**: looks like `https://abcdxyz.supabase.co`
- **📋 anon public key**: long text starting `eyJ...` (safe to be public)
- **📋 service_role key**: another long `eyJ...` text. **Secret. Never put it in `public/` or share it.**

**2c. Point the website at your project**
Open `public/js/config.js` on GitHub (pencil icon) and make sure:
```js
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'your anon public key';
```
If you are reusing the same Supabase project that was already in the file, they are already correct. Commit the change.

---

## Step 3: Create the new Google Sheet

1. Go to Google Drive > **New > File upload** > choose `google-sheet/Useful-Startups-Control-Panel.xlsx`.
2. Right-click the uploaded file > **Open with > Google Sheets**.
3. **File > Save as Google Sheets** (so it becomes a real Sheet, not an Excel file). Rename it, for example `Useful Startups: Control Panel`.

You will see these tabs. **Do not rename the tabs or the header row (row 1).**

| Tab | What it controls |
|---|---|
| Start here | Instructions only |
| **Ledger** | One row per startup. `Visible = no` hides a row |
| Founders | Optional: LinkedIn and past businesses of founders |
| Settings | All text on the site (hero, footer, contact details, social links, failed-startups banner...) |
| Nav | Menu links |
| Pages | Home page cards and steps, About / Terms / Privacy text |
| Team | Team page |
| Highlights | The 3 numbers on the home page |

**Move your data over**
1. Open your old Sheet, select your startup rows (without the header), copy.
2. In the new Sheet > **Ledger** tab, click cell **A2**, then **Edit > Paste special > Values only**.
3. Delete the grey italic example row ("Example Startup (delete me)"). It is marked `Visible = no`, so it never appears on the site anyway.
4. Do the same for Founders, Settings, Team, Pages if you had customised them. The tabs already contain the site's default values.
5. In **Settings**, set `contact_email`, your social links, and `legal_updated`.

---

## Step 4: Connect the Sheet to the website (Apps Script)

All of this happens inside the new Sheet: **Extensions > Apps Script**. A new browser tab opens with a file called `Code.gs`.

### 4a. Form receiver (Contact page, Suggest a startup, missed searches)

1. Click **+** next to Files > **Script**. Name it `forms`.
2. Delete everything inside and paste the full contents of `google-sheet/forms.gs`. Click the save icon.
3. Click **Deploy > New deployment**.
4. Click the gear next to "Select type" > **Web app**.
5. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**.
6. Click **Authorize access** > pick your Google account. If you see "Google hasn't verified this app": **Advanced > Go to (project name) (unsafe) > Allow**. This is normal for your own script.
7. **📋 Copy the Web app URL** (ends in `/exec`).
8. On GitHub open `public/js/config.js` and set:
   ```js
   const FORMS_URL = 'PASTE-THE-/exec-URL-HERE';
   ```
   Commit.

### 4b. Sync script (Sheet to Supabase)

1. Back in Apps Script click **+ > Script**. Name it `sync-to-supabase`.
2. Paste the full contents of `google-sheet/sync-to-supabase.gs`. Save.
3. Left side **Project Settings** (gear) > scroll to **Script properties** > **Add script property**. Add two:

   | Property | Value |
   |---|---|
   | `SUPABASE_URL` | your Project URL from Step 2b |
   | `SUPABASE_SERVICE_KEY` | your **service_role** key from Step 2b |

   Click **Save script properties**.
4. Go back to **Editor**. In the function dropdown at the top choose **`installSync`** and click **Run**.
5. Approve permissions the same way as before (Advanced > Go to... > Allow).
6. When it finishes, open **Execution log**. You should see `First sync: ledger 12 · settings 53 · ...`.

### 4c. Check that it worked
- In Supabase: **Table Editor > sheet_data**. You should see rows for `ledger`, `settings`, etc.
- Refresh your Sheet. A new menu **Useful Startups** appears. Click **Useful Startups > Check connection**. It should say "Connected to Supabase".

> From now on, whenever you edit the Sheet, the site updates about **1 minute** later. For instant update use **Useful Startups > Sync to website now**.

---

## Step 5: Host the website on Cloudflare Pages

1. Cloudflare dashboard > **Workers & Pages > Create > Pages > Connect to Git**.
2. Authorise GitHub and choose your repo.
3. Build settings:

   | Field | Value |
   |---|---|
   | Framework preset | None |
   | Build command | *(leave empty)* |
   | Build output directory | `public` |

4. Click **Save and Deploy**. After a minute you get a `something.pages.dev` address.
5. Add the secrets (needed for coffee payments). Open the project > **Settings > Variables and Secrets > Add** (type **Secret**), for **Production**:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | your Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service_role key |
   | `RAZORPAY_KEY_ID` | from Razorpay (Step 6) |
   | `RAZORPAY_KEY_SECRET` | from Razorpay (Step 6) |
   | `RAZORPAY_WEBHOOK_SECRET` | a password you invent (Step 6) |

   Skip the three Razorpay ones if you are not using payments yet.
6. **Redeploy** (Deployments > the latest > Retry deployment) so the secrets take effect.
7. **Custom domain**: project > **Custom domains > Set up a domain**. Follow the prompts.

> Cloudflare finds the payment functions by itself because the folder is called `functions/` at the top of the repo. You do not configure anything for it.

---

## Step 6: Razorpay payments (skip if not needed)

1. Razorpay Dashboard > **Settings > API Keys > Generate**. Start with **Test mode**.
   Put the key id into `RAZORPAY_KEY_ID` and the secret into `RAZORPAY_KEY_SECRET` (Cloudflare, Step 5).
2. **Settings > Webhooks > Add new webhook**
   - URL: `https://YOUR-DOMAIN/api/coffee/webhook`
   - Secret: invent a long password and put the **same** value into `RAZORPAY_WEBHOOK_SECRET` in Cloudflare
   - Event: tick **payment.captured** only
3. Test a small payment on `/support.html` in test mode. In Supabase **Table Editor > coffee_payments** a row with status `paid` should appear, and the name shows on the leaderboard.
4. When happy, switch to **Live** keys: replace the two key values in Cloudflare, redeploy, and create the webhook again in Live mode.

---

## Step 7: Hourly news (GitHub Actions)

1. GitHub repo > **Settings > Secrets and variables > Actions > New repository secret**. Add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Go to the **Actions** tab. If asked, click "I understand my workflows, enable them".
3. Click **Fetch news > Run workflow > Run workflow**.
4. After a minute it should show a green tick. Check the site's `/news.html`.

It then runs by itself every hour. It also looks up news for the startups in your Ledger, which is why Step 4 must be done first.

---

## Step 8: Final settings to check

| File | What to set |
|---|---|
| `public/js/config.js` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SITE_URL` (your real domain, no trailing slash), `FORMS_URL` |
| `public/robots.txt` and `public/sitemap.xml` | Replace the domain with yours if it differs |
| Sheet > Settings | `contact_email`, social links, `failed_url`, `oak_*` block |

---

## Step 9: Test checklist

- [ ] Home page loads, shows your startups count
- [ ] Home search: type a startup name, suggestions appear, Enter opens `search.html`
- [ ] Ledger page lists your startups; top search bar filters cards
- [ ] Ledger "Search everything" bar above "Suggest a startup" works
- [ ] Open a startup > **Share report** > PDF downloads with the "Brought to you by Useful Startups" footer
- [ ] News page shows stories; the announcement bar text is readable
- [ ] Edit a startup name in the Sheet, wait 1 minute, refresh the site: it changed
- [ ] Set a row's `Visible` to `no`: it disappears from the site
- [ ] Contact form: submit it, a row appears in the Sheet's **Contacts** tab
- [ ] "Suggest a startup": a row appears in **Submissions**
- [ ] (If used) a test coffee payment appears in the leaderboard

---

## Day to day

- **Add a startup:** new row in the **Ledger** tab. Done.
- **Remove one:** delete the row, or set `Visible` to `no`.
- **Change any text / menu / team:** edit Settings, Nav, Pages or Team.
- **See visitor suggestions:** Submissions tab. Copy good ones into Ledger.
- **See what people searched and did not find:** Missed Searches tab.
- **Force an update now:** Useful Startups menu > Sync to website now.
- **Rename a tab?** Also change its name in `sync-to-supabase.gs` (the `TABS` list at the top).
- Text boxes support: blank line = new paragraph, `**bold**`, `[text](url)`, lines starting `- ` for bullets, `## ` for a sub-heading.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Site shows no startups | Step 4 not finished. Check Supabase > `sheet_data` has rows. Run **Sync to website now** |
| "Tab ... not found" when syncing | A tab name differs from the `TABS` list. Names must match exactly (`Ledger`, `Settings`...) |
| "Supabase rejected ... (401/403)" | Wrong `SUPABASE_SERVICE_KEY`. Use the **service_role** key, not the anon key |
| "Supabase rejected ... 404 replace_tab" | `schema.sql` was not run, or ran with an error. Run it again |
| Edits in the Sheet do not appear | Wait 1 minute, hard refresh. Check **Apps Script > Triggers** shows 4 triggers (run `installSync` again if not) |
| Contact / Suggest form says not set up | `FORMS_URL` empty in `config.js`, or you redeployed the script (use Manage deployments > Edit > New version) |
| News page empty | Run the workflow manually (Step 7) and check the Actions log |
| Coffee payment fails | Secrets missing in Cloudflare, or you did not redeploy after adding them |
| Payment succeeded but not on leaderboard | Webhook URL or secret wrong. Razorpay > Webhooks shows delivery errors |
| Share PDF shows the wrong website name | Set `SITE_URL` in `config.js` (or add a Settings row `site_url`) |

---

## Security rules (important)

- The **service_role** key lives only in: Apps Script properties, Cloudflare secrets, GitHub secrets. Never in `public/`, never in a screenshot.
- If it ever leaks: Supabase > Project Settings > API > reset the key, then update those three places.
- The anon key in `config.js` is meant to be public. Row-level security (set by `schema.sql`) lets visitors only read the Ledger and news.
