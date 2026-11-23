#!/usr/bin/env python3
"""Guides, comparisons and article-style pages (stdlib only).

Sources
  _source/guides/<slug>.md     -> /guides/<slug>.html, /guides/index.html, /guides/feed.xml
  _source/compare/<slug>.md    -> /<path or alternative-to-slug>.html, /alternatives.html
  _source/pages/cipi-yml.md    -> /cipi-yml.html

Front matter (between --- lines): `key: value`, or `key:` followed by `  - item` lines.
  title, description, category, published, updated, related (list), faq (list "Question? | Answer"),
  howto (yes/no), keywords, eyebrow, path (compare only), family (compare only), name, site, price, kind

Usage: python3 scripts/content.py            (everything)
       python3 scripts/content.py guides|compare|pages
"""
from __future__ import annotations

import html
import json
import os
import re
import sys
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B  # noqa: E402
import docmd  # noqa: E402

SITE, SRC, ROOT = B.SITE, B.SRC, B.ROOT
esc = B.esc
AUTHOR = {"@type": "Person", "name": "Andrea Pollastri", "url": "https://web.ap.it/"}
PUBLISHER = {"@type": "Organization", "name": "Cipi", "url": SITE + "/",
             "logo": {"@type": "ImageObject", "url": SITE + "/favicon-light-192.png"}}

GUIDE_CATS = [
    ("start", "Get started", "From a fresh server to a live app."),
    ("providers", "Cloud providers", "Cipi on AWS, DigitalOcean, Hetzner and more."),
    ("laravel", "Laravel", "Octane, Reverb, queues, search and deploys, step by step."),
    ("cipi-yml", "cipi.yml", "Server settings that live in your repository."),
    ("agent", "Cipi Agent & AI", "MCP, webhooks, health and safe data for your team."),
    ("security", "Security", "Patching, isolation and access control."),
    ("ops", "Operations", "Backups, monitoring, migrations and the panel."),
    ("php", "PHP, WordPress & e-commerce", "Symfony, WordPress, WooCommerce and other PHP apps."),
]
CAT_NAME = {k: n for k, n, _ in GUIDE_CATS}

COMPARE_FAMILIES = [
    ("panel", "Server panels", "Tools that manage your own VPS."),
    ("paas", "Managed platforms", "The vendor runs the servers; you pay for resources."),
    ("docker", "Self-hosted Docker platforms", "Containers on your server."),
    ("deploy", "Deploy tools", "Ship to servers you prepare yourself."),
    ("hosting", "Hosting control panels", "Built for shared hosting and resellers."),
]

ICON = {
    "x": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg>',
    "linkedin": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.7 4.8 6.1V21h-4v-5.4c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21H9z"/></svg>',
    "reddit": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 12.1a2.2 2.2 0 00-3.7-1.6 10.7 10.7 0 00-5.8-1.8l1-4.6 3.2.7a1.6 1.6 0 101.6-1.6 1.6 1.6 0 00-1.5 1l-3.6-.8a.4.4 0 00-.5.3l-1.1 5.1a10.8 10.8 0 00-5.9 1.8 2.2 2.2 0 10-2.4 3.6 4.3 4.3 0 000 .7c0 3.4 3.9 6.1 8.8 6.1s8.8-2.7 8.8-6.1a4.3 4.3 0 000-.7A2.2 2.2 0 0022 12.1zM7 13.7a1.6 1.6 0 113.2 0 1.6 1.6 0 01-3.2 0zm8.9 4.2a5.6 5.6 0 01-3.9 1.2 5.6 5.6 0 01-3.9-1.2.4.4 0 01.6-.6 4.8 4.8 0 003.3 1 4.8 4.8 0 003.3-1 .4.4 0 01.6.6zm-.3-2.6a1.6 1.6 0 111.6-1.6 1.6 1.6 0 01-1.6 1.6z"/></svg>',
    "hn": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2 2h20v20H2zm9.2 11.5V18h1.6v-4.5L17 6h-1.8l-3 5.4L9.2 6H7.4z"/></svg>',
    "telegram": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.8 15.3l-.4 5.3c.6 0 .8-.3 1.1-.6l2.7-2.5 5.5 4c1 .6 1.7.3 2-.9l3.6-16.9c.3-1.5-.6-2.1-1.6-1.7L1.6 9.9c-1.4.6-1.4 1.4-.2 1.8l5.4 1.7L19.3 5.5c.6-.4 1.1-.2.7.2z"/></svg>',
    "whatsapp": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1a17 17 0 01-1.7-.6 13.3 13.3 0 01-5.1-4.5 5.8 5.8 0 01-1.2-3.1 3.4 3.4 0 011-2.5 1.1 1.1 0 01.8-.4h.6c.2 0 .5 0 .7.6l1 2.4a.6.6 0 010 .6 2.3 2.3 0 01-.4.6l-.5.6c-.2.2-.4.4-.2.7a10.4 10.4 0 001.9 2.4 9.4 9.4 0 002.8 1.7c.3.2.5.1.7-.1l1-1.2c.2-.3.5-.3.8-.2l2.3 1.1c.3.2.6.2.6.4a2.6 2.6 0 01-.2 1.4z"/></svg>',
    "link": '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.1 0l3-3a5 5 0 00-7.1-7.1l-1.7 1.7"/><path d="M14 11a5 5 0 00-7.1 0l-3 3a5 5 0 007.1 7.1l1.7-1.7"/></svg>',
}


# --------------------------------------------------------------------------- parsing

def parse(path: str) -> tuple[dict, str]:
    text = B.read(path)
    meta: dict = {}
    if text.startswith("---\n"):
        head, text = text[4:].split("\n---\n", 1)
        key = None
        for ln in head.split("\n"):
            if not ln.strip():
                continue
            m = re.match(r"^\s+-\s+(.*)$", ln)
            if m and key:
                meta.setdefault(key, [])
                if not isinstance(meta[key], list):
                    meta[key] = []
                meta[key].append(m.group(1).strip())
                continue
            k, _, v = ln.partition(":")
            key = k.strip()
            v = v.strip()
            if len(v) > 1 and v[0] == v[-1] and v[0] in "\"'":
                v = v[1:-1]
            meta[key] = v if v else []
    return meta, text


def minutes(md: str) -> int:
    words = len(re.findall(r"\w+", re.sub(r"```.*?```", lambda m: " " * (len(m.group(0)) // 12), md, flags=re.S)))
    return max(2, round(words / 220))


def nice_date(iso: str) -> str:
    try:
        return datetime.strptime(iso, "%Y-%m-%d").strftime("%B %-d, %Y")
    except ValueError:
        return iso


# --------------------------------------------------------------------------- pieces

def og_image(key: str) -> str:
    p = os.path.join(ROOT, "img", "og", f"{key}.jpg")
    return f"{SITE}/img/og/{key}.jpg" if os.path.exists(p) else f"{SITE}/og.png"


def share_bar(url: str, title: str) -> str:
    from urllib.parse import quote
    u, t = quote(url, safe=""), quote(title, safe="")
    links = [
        ("x", "Share on X", f"https://x.com/intent/post?text={t}&url={u}"),
        ("linkedin", "Share on LinkedIn", f"https://www.linkedin.com/sharing/share-offsite/?url={u}"),
        ("reddit", "Share on Reddit", f"https://www.reddit.com/submit?url={u}&title={t}"),
        ("hn", "Share on Hacker News", f"https://news.ycombinator.com/submitlink?u={u}&t={t}"),
        ("telegram", "Share on Telegram", f"https://t.me/share/url?url={u}&text={t}"),
        ("whatsapp", "Share on WhatsApp", f"https://wa.me/?text={t}%20{u}"),
    ]
    out = ['<div class="share" aria-label="Share this page"><span class="share-label">Share</span>']
    for k, label, href in links:
        out.append(f'<a class="share-btn share-{k}" href="{href}" target="_blank" rel="noopener" aria-label="{label}" title="{label}">{ICON[k]}</a>')
    out.append(f'<button class="share-btn share-copy" type="button" data-share-copy="{esc(url)}" aria-label="Copy link" title="Copy link">{ICON["link"]}<span class="share-done">Copied</span></button>')
    out.append("</div>")
    return "".join(out)


TG_CARD = ('<aside class="tg-card"><div><strong>Cipi on Telegram</strong><p>New guides, releases and security notes, '
           'as they ship.</p></div><a class="btn" href="https://t.me/cipicloud" target="_blank" rel="noopener">'
           'Join t.me/cipicloud</a></aside>')

CTA = ('<section class="art-cta"><div><h2>Try it on your own server</h2><p>Free and open source. One command on a fresh '
       'Ubuntu 24.04 or 26.04 VPS.</p></div><div class="cmd"><code>wget -O - https://cipi.sh/setup.sh | bash</code>'
       '<button class="copy-btn" type="button" data-copy="wget -O - https://cipi.sh/setup.sh | bash">'
       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>'
       '<span class="label">Copy</span></button></div><a class="btn btn-lime" href="/docs/quickstart">Read the quickstart</a></section>')


def cards(items: list[dict], base: str = "/guides/") -> str:
    out = ['<ul class="g-cards">']
    for g in items:
        href = g.get("href") or base + g["slug"]
        badge = esc(g.get("badge") or CAT_NAME.get(g.get("category", ""), ""))
        out.append(f'<li><a class="g-card" href="{href}"><span class="g-cat">{badge}</span>'
                   f'<b>{esc(g["title"])}</b><span class="g-desc">{esc(g["description"])}</span>'
                   f'<span class="g-meta">{g.get("minutes", "")}{" min read" if g.get("minutes") else ""}</span></a></li>')
    out.append("</ul>")
    return "".join(out)


def faq_html(faq: list[str]) -> tuple[str, dict | None]:
    if not faq:
        return "", None
    qa = [tuple(x.split(" | ", 1)) for x in faq if " | " in x]
    out = ['<section class="art-faq"><h2 id="faq">Questions</h2>']
    for q, a in qa:
        out.append(f"<details><summary>{esc(q)}</summary><p>{docmd.inline(a)}</p></details>")
    out.append("</section>")
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": B.strip_tags(docmd.inline(a))}}
        for q, a in qa]}
    return "".join(out), ld


# --------------------------------------------------------------------------- shell

def shell(*, path: str, title: str, full_title: str, desc: str, eyebrow: tuple[str, str] | None, lead: str,
          meta_line: str, body: str, toc: list, ld: list, after: str, uses: set[str], og_key: str,
          crumbs: list[tuple[str, str]], body_class: str = "article", hero_extra: str = "",
          keywords: str = "", og_type: str = "article", extra_head: str = "") -> str:
    url = SITE + path
    crumb_ld = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + h} for i, (n, h) in enumerate(crumbs)]}
    ld = ld + [crumb_ld]
    ld_html = "\n".join(f'    <script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)
    crumbs_html = "".join(f'<li><a href="{h}">{esc(n)}</a></li>' for n, h in crumbs[:-1]) + \
        f'<li aria-current="page">{esc(crumbs[-1][0])}</li>'
    css = ['<link rel="stylesheet" href="/assets/css/base.css">', '<link rel="stylesheet" href="/assets/css/docs.css">',
           '<link rel="stylesheet" href="/assets/css/article.css">']
    js = ['<script src="/assets/js/site.js" defer></script>', '<script src="/assets/js/docs.js" defer></script>',
          '<script src="/assets/js/search.js" defer></script>', '<script src="/assets/js/share.js" defer></script>', '<script src="/assets/js/stepper.js" defer></script>']
    if "clips" in uses:
        css.append('<link rel="stylesheet" href="/assets/css/clips.css">')
        js.append('<script src="/assets/js/clips.js" defer></script>')
    if "term" in uses:
        js.append('<script src="/assets/js/term.js" defer></script>')
    img = og_image(og_key)
    toc_block = ""
    if toc:
        items = [t for t in toc if t[0] == 2] if len(toc) > 16 else toc
        toc_block = ('<nav class="docs-toc art-toc" aria-label="On this page"><h2>On this page</h2><ol>' +
                     "".join(f'<li><a class="l{l}" href="#{h}">{esc(t)}</a></li>' for l, h, t in items) +
                     "</ol></nav>")
    eyebrow_html = f'<a class="art-eyebrow" href="{eyebrow[1]}">{esc(eyebrow[0])}</a>' if eyebrow else ""
    return f"""<!DOCTYPE html>
<html lang="en" data-theme="light" data-follow-system>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{esc(full_title)}</title>
    <meta name="description" content="{esc(desc)}">
{f'    <meta name="keywords" content="{esc(keywords)}">' + chr(10) if keywords else ""}    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="author" content="Andrea Pollastri">
    <link rel="canonical" href="{url}">
    <link rel="alternate" type="application/rss+xml" title="Cipi guides" href="{SITE}/guides/feed.xml">
    <meta property="og:type" content="{og_type}">
    <meta property="og:site_name" content="Cipi">
    <meta property="og:locale" content="en_US">
    <meta property="og:url" content="{url}">
    <meta property="og:title" content="{esc(title)}">
    <meta property="og:description" content="{esc(desc)}">
    <meta property="og:image" content="{img}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="{esc(title)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{esc(title)}">
    <meta name="twitter:description" content="{esc(desc)}">
    <meta name="twitter:image" content="{img}">
{B.PARTIALS["head"].rstrip()}
    {(chr(10) + "    ").join(css)}
{extra_head}{ld_html}
</head>
<body class="{body_class}">
<!-- site:nav -->
{B.chrome("nav")}<!-- /site:nav -->
<main id="main">
<header class="art-hero">
<div class="page-w">
<ol class="crumbs">{crumbs_html}</ol>
{eyebrow_html}
<h1>{esc(title)}</h1>
<p class="art-lead">{esc(lead)}</p>
{meta_line}
{hero_extra}
</div>
</header>
<div class="page-w art-grid{' art-grid--notoc' if not toc else ''}">
<article class="prose art-body">
{body}
</article>
{toc_block}
</div>
<div class="page-w art-after">
{after}
</div>
</main>
<!-- site:footer -->
{B.chrome("footer")}<!-- /site:footer -->
{B.PARTIALS["search"].rstrip()}
{chr(10).join(js)}
{B.PARTIALS["analytics"].replace("{{PATH}}", path).rstrip()}
</body>
</html>
"""


def render_md(md: str) -> tuple[str, list, set[str]]:
    raw = docmd.render(md)
    body, uses = B.expand_components(raw)
    body, toc = B.process_headings(body)
    return body, toc, uses


def out_path(path: str) -> str:
    rel = path.strip("/")
    if path.endswith("/"):
        rel = rel + "/index.html" if rel else "index.html"
    elif not rel.endswith(".html"):
        rel += ".html"
    return os.path.join(ROOT, rel)


# --------------------------------------------------------------------------- guides

def load_guides() -> list[dict]:
    d = os.path.join(SRC, "guides")
    items = []
    for f in sorted(os.listdir(d)):
        if not f.endswith(".md"):
            continue
        meta, md = parse(os.path.join(d, f))
        meta["slug"] = f[:-3]
        meta["md"] = md
        meta["minutes"] = minutes(md)
        meta.setdefault("updated", meta.get("published", B.TODAY))
        meta.setdefault("published", meta["updated"])
        items.append(meta)
    return items


def build_guides() -> list[str]:
    guides = load_guides()
    by = {g["slug"]: g for g in guides}
    written = []
    for g in guides:
        body, toc, uses = render_md(g["md"])
        cat = g.get("category", "start")
        path = f"/guides/{g['slug']}"
        url = SITE + path
        if g.get("docs"):
            nav = json.loads(B.read(B.SRC, "docs", "nav.json"))
            titles = {pg["slug"]: pg["title"] for grp in nav["groups"] for pg in grp["pages"]}
            body += ('<aside class="art-refs"><h2>Reference docs</h2><ul>' + "".join(
                f'<li><a href="/docs/{d}">{esc(titles.get(d, d))}</a></li>' for d in g["docs"] if d in titles) + "</ul></aside>")
        faq_block, faq_ld = faq_html(g.get("faq") or [])
        body += faq_block
        if faq_block:
            toc.append((2, "faq", "Questions"))
        ld = [{
            "@context": "https://schema.org", "@type": "TechArticle", "headline": g["title"],
            "description": g["description"], "url": url, "mainEntityOfPage": url,
            "datePublished": g["published"], "dateModified": g["updated"], "inLanguage": "en",
            "author": AUTHOR, "publisher": PUBLISHER, "image": og_image("guide-" + g["slug"]),
            "articleSection": CAT_NAME.get(cat, ""), "timeRequired": f"PT{g['minutes']}M",
            "about": {"@type": "SoftwareApplication", "name": "Cipi", "applicationCategory": "DeveloperApplication",
                      "operatingSystem": "Ubuntu", "url": SITE + "/"},
        }]
        if g.get("keywords"):
            ld[0]["keywords"] = g["keywords"]
        if str(g.get("howto", "")).lower() in ("yes", "true"):
            steps = [t for t in toc if t[0] == 2 and t[1] != "faq"]
            ld.append({"@context": "https://schema.org", "@type": "HowTo", "name": g["title"],
                       "description": g["description"], "totalTime": f"PT{g['minutes'] + 10}M",
                       "step": [{"@type": "HowToStep", "position": i + 1, "name": t, "url": f"{url}#{h}"}
                                for i, (_, h, t) in enumerate(steps)]})
        if faq_ld:
            ld.append(faq_ld)
        rel = [by[s] for s in (g.get("related") or []) if s in by]
        if len(rel) < 3:
            rel += [x for x in guides if x.get("category") == cat and x["slug"] != g["slug"] and x not in rel][:3 - len(rel)]
        after = TG_CARD
        if rel:
            after += '<section class="art-related"><h2>Keep reading</h2>' + cards(rel[:3]) + "</section>"
        after += CTA
        meta_line = (f'<p class="art-meta"><span>By <a href="https://web.ap.it/" rel="author">Andrea Pollastri</a></span>'
                     f'<span>Updated <time datetime="{g["updated"]}">{nice_date(g["updated"])}</time></span>'
                     f'<span>{g["minutes"]} min read</span></p>')
        html_out = shell(path=path, title=g["title"], full_title=f'{g["title"]} — Cipi guides', desc=g["description"],
                         eyebrow=(CAT_NAME.get(cat, "Guides"), f"/guides/#{cat}"), lead=g.get("lead") or g["description"],
                         meta_line=meta_line, body=body, toc=toc, ld=ld, after=after, uses=uses,
                         og_key="guide-" + g["slug"], keywords=g.get("keywords", ""),
                         crumbs=[("Home", "/"), ("Guides", "/guides/"), (g["title"], path)],
                         hero_extra=share_bar(url, g["title"]))
        B.write(out_path(path), html_out)
        written.append(path)

    # index
    groups = []
    chips = ['<nav class="g-chips" aria-label="Guide topics">']
    for key, name, blurb in GUIDE_CATS:
        items = sorted([x for x in guides if x.get("category") == key], key=lambda x: (x.get("order", "9"), x["title"]))
        if not items:
            continue
        chips.append(f'<a href="#{key}">{esc(name)} <span>{len(items)}</span></a>')
        groups.append(f'<section class="g-group" id="{key}"><div class="g-group-h"><h2>{esc(name)}</h2><p>{esc(blurb)}</p></div>{cards(items)}</section>')
    chips.append("</nav>")
    latest = sorted(guides, key=lambda x: x["updated"], reverse=True)[:3]
    body = ("".join(chips) + '<section class="g-group g-latest"><div class="g-group-h"><h2>Latest</h2></div>' +
            cards(latest) + "</section>" + "".join(groups))
    ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Cipi guides", "url": SITE + "/guides/",
           "description": "Practical guides for Laravel and PHP on your own server.",
           "mainEntity": {"@type": "ItemList", "numberOfItems": len(guides), "itemListElement": [
               {"@type": "ListItem", "position": i + 1, "url": f"{SITE}/guides/{x['slug']}", "name": x["title"]}
               for i, x in enumerate(guides)]}}]
    page = shell(path="/guides/", title="Guides", full_title="Guides — Laravel and PHP on your own server | Cipi",
                 desc="Step-by-step guides for Laravel and PHP on your own VPS with Cipi: Octane, Reverb, Meilisearch, cipi.yml, MCP and the Cipi Agent, security patches, backups, WordPress, Symfony, e-commerce, and setup on AWS, DigitalOcean, Hetzner and more.",
                 eyebrow=None, lead=f"{len(guides)} practical guides for Laravel and PHP on your own server: clear steps, real commands.",
                 meta_line='<p class="art-meta"><a href="/guides/feed.xml">RSS feed</a><a href="https://t.me/cipicloud">Telegram</a></p>',
                 body=body, toc=[], ld=ld, after=TG_CARD + CTA, uses=set(), og_key="guides", og_type="website",
                 crumbs=[("Home", "/"), ("Guides", "/guides/")], body_class="article article--index")
    B.write(out_path("/guides/"), page)
    written.append("/guides/")

    # RSS
    items = []
    for x in sorted(guides, key=lambda x: x["updated"], reverse=True):
        d = datetime.strptime(x["updated"], "%Y-%m-%d").strftime("%a, %d %b %Y 09:00:00 +0000")
        items.append(f"""    <item>
      <title>{html.escape(x['title'])}</title>
      <link>{SITE}/guides/{x['slug']}</link>
      <guid isPermaLink="true">{SITE}/guides/{x['slug']}</guid>
      <pubDate>{d}</pubDate>
      <category>{html.escape(CAT_NAME.get(x.get('category', ''), ''))}</category>
      <description>{html.escape(x['description'])}</description>
    </item>""")
    rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Cipi guides</title>
    <link>{SITE}/guides/</link>
    <atom:link href="{SITE}/guides/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Practical guides for Laravel and PHP on your own server.</description>
    <language>en</language>
    <lastBuildDate>{datetime.now().strftime("%a, %d %b %Y %H:%M:%S +0000")}</lastBuildDate>
{chr(10).join(items)}
  </channel>
</rss>
"""
    B.write(os.path.join(ROOT, "guides", "feed.xml"), rss)
    print(f"guides: {len(guides)} articles")
    return written


# --------------------------------------------------------------------------- comparisons

def load_compare() -> list[dict]:
    d = os.path.join(SRC, "compare")
    items = []
    for f in sorted(os.listdir(d)):
        if not f.endswith(".md") or f.startswith("_"):
            continue
        meta, md = parse(os.path.join(d, f))
        meta["slug"] = f[:-3]
        meta["md"] = md
        meta["path"] = meta.get("path") or f"/alternative-to-{meta['slug']}"
        meta.setdefault("updated", B.TODAY)
        items.append(meta)
    return items


def verdict_box(c: dict) -> str:
    def lst(xs):
        return "".join(f"<li>{docmd.inline(x)}</li>" for x in xs)
    if not c.get("choose_cipi"):
        return ""
    return ('<div class="vs-verdict"><div class="vs-col vs-cipi"><h2 id="choose-cipi">Choose Cipi if</h2><ul>' +
            lst(c["choose_cipi"]) + f'</ul></div><div class="vs-col"><h2 id="choose-them">Choose {esc(c["name"])} if</h2><ul>' +
            lst(c.get("choose_them") or []) + "</ul></div></div>")


def build_compare() -> list[str]:
    comps = load_compare()
    written = []
    for c in comps:
        if c.get("family") == "list":
            body, toc, uses = render_md(c["md"])
        else:
            body, toc, uses = render_md(c["md"])
            body = verdict_box(c) + body
            toc = [(2, "choose-cipi", "Choose Cipi if"), (2, "choose-them", f"Choose {c['name']} if")] + toc
        faq_block, faq_ld = faq_html(c.get("faq") or [])
        body += faq_block
        if faq_block:
            toc.append((2, "faq", "Questions"))
        path = c["path"]
        url = SITE + path
        ld = [{"@context": "https://schema.org", "@type": "Article", "headline": c["title"], "description": c["description"],
               "url": url, "mainEntityOfPage": url, "dateModified": c["updated"], "datePublished": c.get("published", c["updated"]),
               "author": AUTHOR, "publisher": PUBLISHER, "image": og_image("vs-" + c["slug"]), "inLanguage": "en",
               "about": [{"@type": "SoftwareApplication", "name": "Cipi", "url": SITE + "/", "applicationCategory": "DeveloperApplication",
                          "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}}] +
                        ([{"@type": "SoftwareApplication", "name": c["name"], "url": c.get("site", "")}] if c.get("name") else [])}]
        if faq_ld:
            ld.append(faq_ld)
        others = [x for x in comps if x["slug"] != c["slug"] and x.get("family") == c.get("family")][:3]
        after = ""
        if others:
            after += '<section class="art-related"><h2>More comparisons</h2>' + cards(
                [{"href": o["path"], "title": o["title"], "description": o["description"], "badge": o.get("kind", "")} for o in others]) + \
                '<p class="art-all"><a class="link-arrow" href="/alternatives">All comparisons</a></p></section>'
        after += TG_CARD + CTA
        hero_extra = ""
        if c.get("name"):
            hero_extra = (f'<div class="vs-strip"><div class="vs-pill vs-pill--cipi"><b>Cipi</b><span>Free, MIT, on your VPS</span></div>'
                          f'<span class="vs-x">vs</span><div class="vs-pill"><b>{esc(c["name"])}</b><span>{esc(c.get("kind", ""))}'
                          f'{" · " + esc(c["price"]) if c.get("price") else ""}</span></div></div>')
        meta_line = (f'<p class="art-meta"><span>Updated <time datetime="{c["updated"]}">{nice_date(c["updated"])}</time></span>'
                     f'<span>Prices and features from public pages; check them before deciding</span></p>')
        page = shell(path=path, title=c["title"], full_title=c.get("seo_title") or f'{c["title"]} | Cipi', desc=c["description"],
                     eyebrow=("Compare", "/alternatives"), lead=c.get("lead") or c["description"], meta_line=meta_line,
                     body=body, toc=toc, ld=ld, after=after, uses=uses, og_key="vs-" + c["slug"],
                     keywords=c.get("keywords", ""), crumbs=[("Home", "/"), ("Compare", "/alternatives"), (c.get("name") or c["title"], path)],
                     hero_extra=hero_extra + share_bar(url, c["title"]))
        B.write(out_path(path), page)
        written.append(path)

    # index
    groups = []
    for key, name, blurb in COMPARE_FAMILIES:
        items = [x for x in comps if x.get("family") == key]
        if not items:
            continue
        groups.append(f'<section class="g-group" id="{key}"><div class="g-group-h"><h2>{esc(name)}</h2><p>{esc(blurb)}</p></div>' +
                      cards([{"href": x["path"], "title": f'Cipi vs {x["name"]}', "description": x["description"],
                              "badge": x.get("price") or x.get("kind", "")} for x in items]) + "</section>")
    lists = [x for x in comps if x.get("family") == "list"]
    intro = B.read(SRC, "compare", "_index.md") if os.path.exists(os.path.join(SRC, "compare", "_index.md")) else ""
    ib, itoc, iuses = render_md(intro)
    body = ib + "".join(groups)
    if lists:
        body += '<section class="g-group"><div class="g-group-h"><h2>Round-ups</h2></div>' + cards(
            [{"href": x["path"], "title": x["title"], "description": x["description"], "badge": "Round-up"} for x in lists]) + "</section>"
    ld = [{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Cipi compared", "url": SITE + "/alternatives",
           "mainEntity": {"@type": "ItemList", "itemListElement": [
               {"@type": "ListItem", "position": i + 1, "url": SITE + x["path"], "name": x["title"]} for i, x in enumerate(comps)]}}]
    page = shell(path="/alternatives", title="Cipi compared", full_title="Cipi vs Forge, Ploi, Vito Deploy, Coolify and more — every comparison",
                 desc="How Cipi compares with Laravel Forge, Ploi, Vito Deploy, Laravel Cloud, Coolify, RunCloud, cPanel and 15 more: price, where it runs, features, and when each is the better choice.",
                 eyebrow=None, lead="Honest, feature-by-feature comparisons with the tools you're weighing. Each page says where the other tool wins.",
                 meta_line="", body=body, toc=[], ld=ld, after=TG_CARD + CTA, uses=iuses, og_key="alternatives", og_type="website",
                 crumbs=[("Home", "/"), ("Compare", "/alternatives")], body_class="article article--index")
    B.write(out_path("/alternatives"), page)
    written.append("/alternatives")
    print(f"compare: {len(comps)} pages")
    return written


# --------------------------------------------------------------------------- standalone pages

def build_pages() -> list[str]:
    written = []
    d = os.path.join(SRC, "pages")
    for f in sorted(os.listdir(d)):
        if not f.endswith(".md"):
            continue
        meta, md = parse(os.path.join(d, f))
        body, toc, uses = render_md(md)
        faq_block, faq_ld = faq_html(meta.get("faq") or [])
        body += faq_block
        if faq_block:
            toc.append((2, "faq", "Questions"))
        path = meta.get("path") or "/" + f[:-3]
        url = SITE + path
        ld = [{"@context": "https://schema.org", "@type": "TechArticle", "headline": meta["title"], "description": meta["description"],
               "url": url, "dateModified": meta.get("updated", B.TODAY), "author": AUTHOR, "publisher": PUBLISHER,
               "image": og_image(f[:-3]), "inLanguage": "en"}]
        if faq_ld:
            ld.append(faq_ld)
        page = shell(path=path, title=meta["title"], full_title=meta.get("seo_title") or f'{meta["title"]} | Cipi', desc=meta["description"],
                     eyebrow=(meta["eyebrow"], meta.get("eyebrow_href", "/docs/")) if meta.get("eyebrow") else None,
                     lead=meta.get("lead") or meta["description"], meta_line=meta.get("meta_line", ""), body=body, toc=toc, ld=ld,
                     after=TG_CARD + CTA, uses=uses, og_key=f[:-3], keywords=meta.get("keywords", ""),
                     crumbs=[("Home", "/"), (meta.get("crumb") or meta["title"], path)],
                     hero_extra=share_bar(url, meta["title"]))
        B.write(out_path(path), page)
        written.append(path)
    print(f"pages: {len(written)}")
    return written


if __name__ == "__main__":
    what = sys.argv[1:] or ["guides", "compare", "pages"]
    if "guides" in what:
        build_guides()
    if "compare" in what:
        build_compare()
    if "pages" in what:
        build_pages()
