// Public settings. Everything here is safe to expose in the browser.
// NEVER put the service_role key here: it belongs only in Cloudflare / GitHub / Apps Script secrets.

const SUPABASE_URL = 'https://aetyxpngagqkhfwtbqhw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldHl4cG5nYWdxa2hmd3RicWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjE3NjcsImV4cCI6MjEwNDA5Nzc2N30.esMsuBVcRfpYGwuDMWYiXeab_n-v_k96sVYrVLQBeGM';

// Your website's address. Used in share links and on shared reports.
// (You can also override it from the Sheet: add a Settings row  site_url | https://yourdomain)
const SITE_URL = 'https://usefulstartups.in';

// The Google Apps Script "web app" URL that receives the Contact form, "Suggest a startup" and missed searches.
// Paste the /exec URL you get after deploying google-sheet/forms.gs (see README, step 3).
const FORMS_URL = 'https://script.google.com/macros/s/AKfycbzCGEOVyVxiTRwlrPjHOP4Rl5qUwI4VZkXF0HIc-hfk0JaBuMttoRAzoMuQED-yNia66Q/exec';
