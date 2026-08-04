/**
 * Canonical origin + language trees for Netlify Edge.
 * /en/… (English slugs) ↔ /it/… (Italian slugs).
 * Legacy bare paths redirect 302 → /{lang}{localized-slug}.
 */
const CANONICAL_HOST = 'cipi.sh';
const LANG_PREFIX_RE = /^\/(en|it)(\/|$)/;

const ASSET_EXT_RE =
  /\.(?:css|js|mjs|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|txt|xml|xsl|json|webmanifest|pdf|zip|gz|tgz|sh|mp4|webm|wasm)$/i;

const LEGACY_PAGE_RE =
  /^\/(?:(?:docs|guides|guide)(?:\/|$)|(?:alternatives|alternative|alternativa-a-[a-z0-9-]+|alternative-to-[a-z0-9-]+|best-laravel-forge-alternatives|migliori-alternative-a-laravel-forge|discovery|whats-new|novita)(?:\.html)?\/?$|index\.html\/?$)/i;

const SLUGS_IT = {
  '/': '/',
  '/404': '/404',
  '/whats-new': '/novita',
  '/discovery': '/discovery',
  '/alternatives': '/alternative',
  '/best-laravel-forge-alternatives': '/migliori-alternative-a-laravel-forge',
  '/alternative-to-cleavr': '/alternativa-a-cleavr',
  '/alternative-to-cloudpanel': '/alternativa-a-cloudpanel',
  '/alternative-to-coolify': '/alternativa-a-coolify',
  '/alternative-to-cpanel': '/alternativa-a-cpanel',
  '/alternative-to-directadmin': '/alternativa-a-directadmin',
  '/alternative-to-dokku': '/alternativa-a-dokku',
  '/alternative-to-easypanel': '/alternativa-a-easypanel',
  '/alternative-to-kamal': '/alternativa-a-kamal',
  '/alternative-to-laravel-cloud': '/alternativa-a-laravel-cloud',
  '/alternative-to-laravel-forge': '/alternativa-a-laravel-forge',
  '/alternative-to-moss': '/alternativa-a-moss',
  '/alternative-to-plesk': '/alternativa-a-plesk',
  '/alternative-to-ploi': '/alternativa-a-ploi',
  '/alternative-to-runcloud': '/alternativa-a-runcloud',
  '/alternative-to-serverpilot': '/alternativa-a-serverpilot',
  '/alternative-to-vito-deploy': '/alternativa-a-vito-deploy',
  '/docs/': '/docs/',
  '/docs/getting-started': '/docs/primi-passi',
  '/docs/agent': '/docs/agent',
  '/docs/apps': '/docs/app',
  '/docs/deploy': '/docs/deploy',
  '/docs/infrastructure': '/docs/infrastruttura',
  '/docs/cli-client': '/docs/client-cli',
  '/docs/gui': '/docs/gui',
  '/docs/advanced': '/docs/avanzato',
  '/docs/about': '/docs/informazioni',
  '/guides/': '/guide/',
  '/guides/deploy-laravel-ubuntu-vps': '/guide/deploy-laravel-su-ubuntu-vps',
  '/guides/laravel-security-checklist': '/guide/checklist-sicurezza-laravel',
  '/guides/laravel-ecosystem-2026': '/guide/ecosistema-laravel-2026',
  '/guides/laravel-ci-cd-git-workflow': '/guide/ci-cd-workflow-git-laravel',
  '/guides/spec-driven-development-ai-laravel': '/guide/sviluppo-spec-driven-ai-laravel',
  '/guides/laravel-developer-stack-2026': '/guide/stack-developer-self-hosted-2026',
};

const SLUGS_EN = Object.fromEntries(Object.entries(SLUGS_IT).map(([en, it]) => [it, en]));

function pickLang(request) {
  const cookie = request.headers.get('cookie') || '';
  const chosen = cookie.match(/(?:^|;\s*)cipi-lang=(en|it)(?=;|\s|$)/);
  if (chosen) return chosen[1];

  const header = request.headers.get('accept-language') || '';
  let best = null;
  let bestQ = -1;
  for (const part of header.split(',')) {
    const [tagRaw, ...params] = part.trim().split(';');
    const tag = tagRaw.trim().toLowerCase();
    if (!tag) continue;
    let q = 1;
    for (const p of params) {
      const qm = p.trim().match(/^q=([\d.]+)$/i);
      if (qm) q = parseFloat(qm[1]);
    }
    if (q > bestQ) {
      bestQ = q;
      best = tag;
    }
  }
  return best === 'it' || (best && best.startsWith('it-')) ? 'it' : 'en';
}

function normalizeBarePath(pathname) {
  let p = pathname || '/';
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (p.endsWith('.html')) p = p.slice(0, -5);
  if (p === '/index' || p.endsWith('/index')) p = p.slice(0, -'/index'.length) || '/';
  if (p === '/') return '/';
  if (p === '/docs' || p === '/guides' || p === '/guide') return p + '/';
  return p;
}

function langHref(lang, canon) {
  if (canon === '/') return `/${lang}/`;
  return `/${lang}${canon}`;
}

function toEnglishCanon(bare) {
  let p = bare;
  if (p === '/guide') p = '/guide/';

  if (SLUGS_EN[p]) return SLUGS_EN[p];

  if (p === '/alternative') return '/alternatives';
  if (p === '/novita') return '/whats-new';
  if (p === '/migliori-alternative-a-laravel-forge') return '/best-laravel-forge-alternatives';
  if (p.startsWith('/alternativa-a-')) {
    return '/alternative-to-' + p.slice('/alternativa-a-'.length);
  }

  if (p === '/guide/') return '/guides/';
  if (p.startsWith('/guide/')) {
    if (SLUGS_EN[p]) return SLUGS_EN[p];
    return '/guides/' + p.slice('/guide/'.length);
  }

  return p;
}

function localizeCanon(bare, lang) {
  const en = toEnglishCanon(bare);
  if (lang === 'en') return en;
  return SLUGS_IT[en] || en;
}

function isAssetPath(path) {
  if (path.startsWith('/css/') || path.startsWith('/.well-known/')) return true;
  const last = path.slice(path.lastIndexOf('/') + 1);
  if (!last.includes('.')) return false;
  if (last.endsWith('.html') && (LEGACY_PAGE_RE.test(path) || path === '/index.html')) {
    return false;
  }
  return ASSET_EXT_RE.test(last) || last.includes('.');
}

function isLegacyPagePath(path) {
  if (path === '/' || path === '/index.html') return true;
  if (LEGACY_PAGE_RE.test(path)) return true;
  const last = path.slice(path.lastIndexOf('/') + 1);
  if (!last.includes('.') && !path.startsWith('/css/') && !path.startsWith('/.well-known/')) {
    return true;
  }
  return false;
}

function redirectTo(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      Vary: 'Accept-Language, Cookie',
      'Cache-Control': 'no-store',
    },
  });
}

export default async (request, context) => {
  const url = new URL(request.url);
  const isPreview =
    url.hostname.endsWith('.netlify.app') || url.hostname.endsWith('.pages.dev');

  if (!isPreview && (url.protocol === 'http:' || url.hostname === `www.${CANONICAL_HOST}`)) {
    url.protocol = 'https:';
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  const path = url.pathname;

  // Static assets (sitemap, robots, images, …) — never rewrite
  if (isAssetPath(path) && !path.endsWith('.html')) {
    return;
  }

  const langMatch = path.match(LANG_PREFIX_RE);
  if (langMatch) {
    const lang = langMatch[1];
    const rest = path.replace(/^\/(en|it)/, '') || '/';
    const expected = langHref(lang, localizeCanon(normalizeBarePath(rest), lang));
    if (path !== expected) {
      return redirectTo(request, expected);
    }
    return;
  }

  if (isAssetPath(path)) {
    return;
  }

  if (isLegacyPagePath(path)) {
    const lang = pickLang(request);
    const canon = localizeCanon(normalizeBarePath(path), lang);
    return redirectTo(request, langHref(lang, canon));
  }
};

export const config = { path: '/*' };
