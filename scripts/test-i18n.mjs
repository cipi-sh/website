#!/usr/bin/env node
/**
 * Unit tests for netlify/edge-functions/i18n.js routing (no Netlify runtime).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  decide,
  langHref,
  languageForBarePath,
  localizeCanon,
  normalizeBarePath,
} from '../netlify/edge-functions/i18n.js';

let failed = 0;
let passed = 0;

function url(path, { host = 'cipi.sh', proto = 'https:' } = {}) {
  return new URL(`${proto}//${host}${path}`);
}

function assert(name, cond) {
  if (cond) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error('FAIL', name);
}

function assertPass(path, note = '') {
  const d = decide(url(path));
  assert(`pass ${path} ${note}`.trim(), d.pass === true);
}

function assertRedirect(path, dest, note = '') {
  const d = decide(url(path));
  assert(
    `301 ${path} → ${dest} ${note}`.trim(),
    d.redirect === dest && d.status === 301 && !d.pass,
  );
}

// Homepage: never redirected (the GSC "Page with redirect" bug)
assertPass('/', 'English homepage must be 200');
assertPass('/', 'Accept-Language must not matter');
assertRedirect('/index.html', '/');
assertRedirect('/en', '/');
assertRedirect('/en/', '/');
assertRedirect('/en/index.html', '/');

// Italian home
assertPass('/it/');
assertRedirect('/it', '/it/');
assertRedirect('/it/index.html', '/it/');

// In-tree English pages stay put
assertPass('/en/docs/');
assertPass('/en/docs/getting-started');
assertPass('/en/alternatives');
assertPass('/en/whats-new');

// In-tree Italian pages stay put
assertPass('/it/docs/');
assertPass('/it/docs/primi-passi');
assertPass('/it/alternative');
assertPass('/it/novita');

// Slug localization inside a language tree
assertRedirect('/it/docs/getting-started', '/it/docs/primi-passi');
assertRedirect('/en/docs/primi-passi', '/en/docs/getting-started');
assertRedirect('/it/whats-new', '/it/novita');
assertRedirect('/en/novita', '/en/whats-new');
assertRedirect('/en/docs', '/en/docs/');
assertRedirect('/it/guide', '/it/guide/');

// Legacy bare English paths → /en/… (not /)
assertRedirect('/docs', '/en/docs/');
assertRedirect('/docs/', '/en/docs/');
assertRedirect('/docs/getting-started', '/en/docs/getting-started');
assertRedirect('/guides', '/en/guides/');
assertRedirect('/alternatives', '/en/alternatives');
assertRedirect('/whats-new', '/en/whats-new');
assertRedirect('/alternative-to-ploi', '/en/alternative-to-ploi');

// Legacy bare Italian slugs → /it/… (slug language, not Accept-Language)
assertRedirect('/novita', '/it/novita');
assertRedirect('/alternative', '/it/alternative');
assertRedirect('/alternativa-a-ploi', '/it/alternativa-a-ploi');
assertRedirect('/guide/', '/it/guide/');
assertRedirect('/guide/deploy-laravel-su-ubuntu-vps', '/it/guide/deploy-laravel-su-ubuntu-vps');
assertRedirect('/guide/backup-vps-s3-con-cipi', '/it/guide/backup-vps-s3-con-cipi');
assertRedirect('/it/guides/backup-vps-s3', '/it/guide/backup-vps-s3-con-cipi');
assertRedirect('/en/guide/backup-vps-s3-con-cipi', '/en/guides/backup-vps-s3');
assertRedirect('/docs/primi-passi', '/it/docs/primi-passi');

// Unknown paths: real 404, not redirect-to-/en/404
assertPass('/this-page-does-not-exist');
assertPass('/random-old-url');
assertPass('/en/this-page-does-not-exist');

// Assets never rewritten
assertPass('/robots.txt');
assertPass('/sitemap.xml');
assertPass('/llms.txt');
assertPass('/css/site.css');
assertPass('/setup.sh');
assertPass('/og.png');
assertPass('/.well-known/security.txt');

// Host / protocol canonicalization
{
  const d = decide(url('/', { proto: 'http:' }));
  assert('http → https 301', d.status === 301 && d.absolute === 'https://cipi.sh/');
}
{
  const d = decide(url('/it/', { host: 'www.cipi.sh' }));
  assert('www → apex 301', d.status === 301 && d.absolute === 'https://cipi.sh/it/');
}
{
  const d = decide(url('/', { host: 'deploy-preview-1.netlify.app' }), { isPreview: true });
  assert('preview host not rewritten', d.pass === true);
}

// New language trees
assertPass('/de/');
assertPass('/fr/');
assertPass('/es/');
assertPass('/pt/');
assertRedirect('/de', '/de/');
assertRedirect('/fr', '/fr/');
assertPass('/de/docs/getting-started');
assertPass('/fr/alternatives');

// Helpers
assert('langHref en home is /', langHref('en', '/') === '/');
assert('langHref it home is /it/', langHref('it', '/') === '/it/');
assert('langHref de home is /de/', langHref('de', '/') === '/de/');
assert('langHref fr home is /fr/', langHref('fr', '/') === '/fr/');
assert('languageForBarePath /novita is it', languageForBarePath('/novita') === 'it');
assert('languageForBarePath /docs/ is en', languageForBarePath('/docs/') === 'en');
assert('normalize /docs/ → /docs/', normalizeBarePath('/docs/') === '/docs/');
assert('localize it getting-started', localizeCanon('/docs/getting-started', 'it') === '/docs/primi-passi');
assert('localize de getting-started stays EN slug', localizeCanon('/docs/getting-started', 'de') === '/docs/getting-started');

// Generated pages must not leak machine-translation placeholders
const BROKEN_PLACEHOLDER = /__\w+_\d+__/g;
const GENERATED_LANGS = ['de', 'fr', 'es', 'pt'];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.(html|js)$/.test(name)) files.push(path);
  }
  return files;
}

for (const lang of GENERATED_LANGS) {
  const langDir = join(process.cwd(), lang);
  for (const file of walk(langDir)) {
    const matches = readFileSync(file, 'utf8').match(BROKEN_PLACEHOLDER);
    assert(`no broken placeholders in ${file.replace(process.cwd(), '')}`, !matches);
  }
}

// Docs search must load the index for the current page language
for (const lang of ['en', 'it', ...GENERATED_LANGS]) {
  const indexPath = join(process.cwd(), lang, 'docs', 'search-index.js');
  assert(`${lang} docs search-index exists`, readFileSync(indexPath, 'utf8').includes('window.CIPI_DOCS'));
  const docsDir = join(process.cwd(), lang, 'docs');
  for (const file of walk(docsDir).filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8');
    if (!html.includes('sidebar-search')) continue;
    assert(
      `${file.replace(process.cwd(), '')} uses lang-aware search index`,
      html.includes("(document.documentElement.lang || 'en') + '/docs/search-index.js'"),
    );
  }
}

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
