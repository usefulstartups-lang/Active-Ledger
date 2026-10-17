const Parser = require('rss-parser');
const Papa = require('papaparse');
const { createClient } = require('@supabase/supabase-js');

const parser = new Parser({
  timeout: 7000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  },
  customFields: { item: ['source'] }, // Google News puts the publisher here
});

const gnews = (q) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;

// ---- General startup & business news (add or remove feeds any time) ----
// A feed that is down or changed its address is simply skipped and logged.
const FEEDS = [
  // India first
  { name: 'Inc42', url: 'https://inc42.com/feed/' },
  { name: 'YourStory', url: 'https://yourstory.com/feed' },
  { name: 'Entrackr', url: 'https://entrackr.com/feed' },
  { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/small-biz/startups/rssfeeds/11993040.cms' },
  { name: 'Mint', url: 'https://www.livemint.com/rss/companies' },
  { name: 'BusinessLine', url: 'https://www.thehindubusinessline.com/companies/feeder/default.rss' },
  { name: 'Google News', url: gnews('India startup funding'), google: true },
  { name: 'Google News', url: gnews('Indian business startups'), google: true },
  // Global
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'Entrepreneur', url: 'https://www.entrepreneur.com/latest.rss' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/' },
  { name: 'Inc.', url: 'https://www.inc.com/rss' },
];

// ---- Your Active Ledger (read server-side to know which startups to follow) ----
const DEFAULT_LEDGER_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSnzz7ZtIZdVOzq9FJLG0x1Hz2Y6XYNkTsveYm_sJheBoPIP-jhL27SBGl57CLMJirXvzjSQ4X-CMmB/pub?gid=0&single=true&output=csv';

const DEFAULT_BATCH = 15; // startups checked per hourly run; they rotate automatically

exports.handler = async function (event) {
  const q = (event && event.queryStringParameters) || {};
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // server-only key, never expose to the browser
  );

  const [general, startups] = await Promise.all([
    q.only === 'startups' ? { inserted: 0 } : runGeneral(supabase),
    q.only === 'general' ? { inserted: 0, checked: [] } : runStartups(supabase, q),
  ]);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, general, startups }),
  };
};

async function runGeneral(supabase) {
  const results = await pool(FEEDS, 6, async (feed) => {
    const parsed = await parser.parseURL(feed.url);
    const rows = parsed.items.slice(0, 15).map((item) => toRow(item, feed.name, feed.google, 'general', null));
    return insert(supabase, rows);
  });
  return { inserted: sum(results, FEEDS) };
}

async function runStartups(supabase, q) {
  let names = [];
  try {
      const res = await fetch(process.env.LEDGER_CSV_URL || DEFAULT_LEDGER_CSV, { signal: AbortSignal.timeout(15000) });
    const rows = Papa.parse(await res.text(), { header: true, skipEmptyLines: true }).data;
    names = [...new Set(rows.map((r) => (r['Startup Name'] || '').trim()).filter((n) => n && n !== '-'))];
  } catch (err) {
    console.error('Could not read the Ledger sheet:', err.message);
    return { inserted: 0, checked: [] };
  }
  if (!names.length) return { inserted: 0, checked: [] };

  const batch = Math.min(parseInt(q.batch) || DEFAULT_BATCH, names.length);
  const hour = Math.floor(Date.now() / 3600000);
  const start = q.offset !== undefined ? parseInt(q.offset) || 0 : (hour * batch) % names.length;
  const picked = Array.from({ length: batch }, (_, i) => names[(start + i) % names.length]);

  const results = await pool(picked, 6, async (name) => {
    const url = gnews(`"${name}" (startup OR funding OR founder OR India)`);
    const parsed = await parser.parseURL(url);
    const needle = name.toLowerCase();
    const rows = parsed.items
      .filter((it) => (it.title || '').toLowerCase().includes(needle))
      .slice(0, 5)
      .map((item) => toRow(item, 'Google News', true, 'startup', name));
    return insert(supabase, rows);
  });
  return { inserted: sum(results, picked), checked: picked };
}

function toRow(item, feedName, isGoogle, category, startupName) {
  let title = (item.title || '').trim();
  let source = feedName;
  if (isGoogle) {
    const s = item.source;
    const pub = s && (typeof s === 'string' ? s : s._);
    if (pub) source = pub;
    title = title.replace(/\s+-\s+[^-]+$/, ''); // Google appends " - Publisher"
  }
  return {
    title,
    link: item.link,
    source,
    summary: isGoogle ? '' : (item.contentSnippet || '').slice(0, 300),
    image_url: extractImage(item),
    published_at: item.isoDate || new Date().toISOString(),
    category,
    startup_name: startupName,
  };
}

async function insert(supabase, rows) {
  if (!rows.length) return 0;
  // upsert on the unique "link" column so re-runs don't create duplicates
  const { error, count } = await supabase
    .from('articles')
    .upsert(rows, { onConflict: 'link', ignoreDuplicates: true, count: 'exact' });
  if (error) throw new Error(error.message);
  return count || 0;
}

// Runs tasks a few at a time so one slow feed can't use up the whole time limit.
async function pool(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.allSettled(items.slice(i, i + size).map(fn))));
  }
  return out;
}

function sum(results, items) {
  let total = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') total += r.value;
    else {
      const label = items[i].name || items[i];
      console.warn(`Skipped ${label}: ${r.reason && r.reason.message}`);
    }
  });
  return total;
}

function extractImage(item) {
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  const match = (item['content:encoded'] || item.content || '').match(/<img[^>]+src="([^">]+)"/);
  return match ? match[1] : null;
}
