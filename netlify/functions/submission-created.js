/**
 * Postcards moderation.
 *
 * Netlify calls this function for every *verified* form submission (spam
 * already filtered by Akismet and the honeypot). Netlify signs the event and
 * refuses external calls, so the function cannot be triggered from outside.
 *
 * For the "postcard" form it validates the fields again and opens a pull
 * request on GitHub that adds one entry to data/postcards.json. Nothing is
 * published until the pull request is merged: merging is the approval.
 *
 * Environment variables (Netlify → Site configuration → Environment variables):
 *   POSTCARDS_GITHUB_TOKEN  fine-grained token, this repo only,
 *                           Contents: read/write, Pull requests: read/write
 *   POSTCARDS_REPO          optional, default "cipi-sh/website"
 *   POSTCARDS_BASE          optional, default "main"
 */
const PROVIDERS = require('./postcard-providers.json');

const FILE = 'data/postcards.json';
const API = 'https://api.github.com';

const LIMITS = { name: 40, city: 40, region: 40, message: 280 };
const LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|dev|app|xyz|ru|cn|top|info|biz|link|site|online|shop)\b|@[a-z0-9-]+\.[a-z])/i;
const SAFE_SHORT_RE = /^[\p{L}\p{N} .,'()\/&-]*$/u;

function clean(value, max) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Returns { card } or { error }. */
function validate(data) {
  if (data['bot-field']) return { error: 'honeypot filled' };
  if (!data.consent) return { error: 'no consent to publish' };

  const provider = clean(data.provider, 40);
  if (!Object.prototype.hasOwnProperty.call(PROVIDERS, provider)) return { error: `unknown provider "${provider}"` };

  const card = {
    name: clean(data.name, LIMITS.name) || 'Anonymous',
    city: clean(data.city, LIMITS.city),
    provider,
    region: clean(data.region, LIMITS.region),
    apps: Math.max(0, Math.min(999, parseInt(data.apps, 10) || 0)),
    message: clean(data.message, LIMITS.message),
  };

  for (const k of ['name', 'city', 'region']) {
    if (!SAFE_SHORT_RE.test(card[k])) return { error: `${k} has characters that are not allowed` };
  }
  if (!card.region && !['Own hardware', 'Other'].includes(provider)) return { error: 'region missing' };
  if (card.message.length < 10) return { error: 'message too short' };
  if (/[<>]/.test(card.message)) return { error: 'message contains < or >' };
  for (const k of ['name', 'city', 'region', 'message']) {
    if (LINK_RE.test(card[k])) return { error: `${k} contains a link or an address` };
  }
  return { card };
}

async function gh(path, { method = 'GET', body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.POSTCARDS_GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'cipi-postcards',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub ${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

exports.handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch {
    return { statusCode: 400 };
  }
  if (!payload || payload.form_name !== 'postcard') return { statusCode: 200 };

  const { card, error } = validate(payload.data || {});
  if (error) {
    console.log(`postcard ${payload.id} rejected: ${error}`);
    return { statusCode: 200 };
  }
  if (!process.env.POSTCARDS_GITHUB_TOKEN) {
    console.log(`postcard ${payload.id} kept in Netlify only: POSTCARDS_GITHUB_TOKEN is not set`);
    return { statusCode: 200 };
  }

  const repo = process.env.POSTCARDS_REPO || 'cipi-sh/website';
  const base = process.env.POSTCARDS_BASE || 'main';
  const id = String(payload.id || Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
  const branch = `postcard/${id}`;
  const entry = { id, date: (payload.created_at || new Date().toISOString()).slice(0, 10), ...card };

  try {
    const ref = await gh(`/repos/${repo}/git/ref/heads/${base}`);
    await gh(`/repos/${repo}/git/refs`, { method: 'POST', body: { ref: `refs/heads/${branch}`, sha: ref.object.sha } });

    const file = await gh(`/repos/${repo}/contents/${FILE}?ref=${encodeURIComponent(branch)}`);
    const list = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    if (list.some((c) => c.id === id)) return { statusCode: 200 };
    list.unshift(entry);

    await gh(`/repos/${repo}/contents/${FILE}`, {
      method: 'PUT',
      body: {
        message: `Postcard from ${entry.name}${entry.city ? `, ${entry.city}` : ''}`,
        content: Buffer.from(JSON.stringify(list, null, 1) + '\n').toString('base64'),
        sha: file.sha,
        branch,
      },
    });

    const quote = (s) => s.replace(/`/g, "'");
    await gh(`/repos/${repo}/pulls`, {
      method: 'POST',
      body: {
        title: `Postcard: ${entry.name} · ${entry.provider}${entry.region ? ` ${entry.region}` : ''}`,
        head: branch,
        base,
        body: [
          'New postcard from the form on cipi.sh/postcards. **Merge to publish it, close to discard.**',
          '',
          '| Field | Value |',
          '| --- | --- |',
          `| Name | \`${quote(entry.name)}\` |`,
          `| City | \`${quote(entry.city || '—')}\` |`,
          `| Provider | \`${quote(entry.provider)}\` |`,
          `| Region | \`${quote(entry.region || '—')}\` |`,
          `| Apps | \`${entry.apps || '—'}\` |`,
          '',
          '```text',
          quote(entry.message),
          '```',
          '',
          `Netlify submission: \`${id}\``,
        ].join('\n'),
      },
    });
    console.log(`postcard ${id}: pull request opened`);
  } catch (e) {
    console.log(`postcard ${id}: ${e.message}`);
  }
  return { statusCode: 200 };
};

exports.validate = validate;
