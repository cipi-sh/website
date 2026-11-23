#!/usr/bin/env python3
"""Build the static site from _source/.

    python3 scripts/build.py

- Home:        _source/pages/index.html            -> index.html
- Docs:        _source/docs/nav.json + pages/*.html -> docs/<slug>.html, docs/index.html,
               group landings, docs/search-index.json, assets/js/docs-anchors.js
- Chrome:      _source/partials/{nav,footer}.html are synced into every other page between
               <!-- site:nav --> … <!-- /site:nav --> and <!-- site:footer --> … <!-- /site:footer -->

Fragments may contain <cipi-term name="…"></cipi-term> (scripts in _source/docs/terms.json)
and <cipi-panel></cipi-panel> (the animated web-panel tour).
No dependencies beyond the Python standard library. Output is committed; Netlify serves it as is.
"""
from __future__ import annotations

import glob
import html
import json
import os
import re
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import docmd  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "_source")
SITE = "https://cipi.sh"
TODAY = date.today().isoformat()
REPO_EDIT = "https://github.com/cipi-sh/website/edit/main/_source/docs/pages/"


def src_ext(slug: str) -> str:
    return ".md" if os.path.exists(os.path.join(SRC, "docs", "pages", f"{slug}.md")) else ".html"


def read(*p: str) -> str:
    with open(os.path.join(*p), encoding="utf-8") as fh:
        return fh.read()


def write(path: str, text: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def strip_tags(s: str) -> str:
    s = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def slugify(s: str) -> str:
    s = strip_tags(s).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:60] or "section"


PARTIALS = {k: read(SRC, "partials", f"{k}.html") for k in ("head", "nav", "footer", "search", "analytics")}


def chrome(name: str, wide: bool = False) -> str:
    return PARTIALS[name].replace("{{NAV_CLASS}}", "sn-wide" if wide else "page-w")


# --------------------------------------------------------------------------- terminals

TERMS = json.loads(read(SRC, "docs", "terms.json"))
REPLAY_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2.5 8a5.5 5.5 0 109.4-3.9M12 1.5v3h-3"/></svg>'
COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>'


def term_html(name: str) -> str:
    t = TERMS[name]
    commands = [s["c"] for s in t["script"] if "c" in s and not s.get("nocopy")]
    static = "\n".join("$ " + c for c in commands)
    script = json.dumps(t["script"], ensure_ascii=False).replace("</", "<\\/")
    lines = 1 + sum(1 for s in t["script"] if "c" in s or "o" in s or "bar" in s) + sum(1 for s in t["script"] if "c" in s and "o" in s)
    return (
        f'<div class="term" data-term data-autoplay="view" style="--term-min:calc({lines} * 1.65em + 36px)" data-prompt="{esc(t.get("prompt", "root@vps:~#"))}">'
        f'<div class="term-bar"><span class="term-dots"><i></i><i></i><i></i></span>'
        f'<span class="term-title">{esc(t["title"])}</span>'
        f'<button class="term-btn" type="button" data-term-copy>{COPY_ICON}<span class="label">Copy</span></button>'
        f'<button class="term-btn" type="button" data-term-replay aria-label="Replay">{REPLAY_ICON}Replay</button></div>'
        f'<pre class="term-body" aria-label="Terminal demo: {esc(t["title"])}">{esc(static)}</pre>'
        f'<script type="application/json" class="term-script">{script}</script></div>'
    )


def expand_components(body: str) -> tuple[str, set[str]]:
    used: set[str] = set()

    def t(m: re.Match) -> str:
        used.add("term")
        return term_html(m.group(1))

    body = re.sub(r'<cipi-term name="([^"]+)"></cipi-term>', t, body)
    body = body.replace("<cipi-panel></cipi-panel>", "<cipi-clips></cipi-clips>")

    def c(m: re.Match) -> str:
        used.add("clips")
        names = m.group(1) or ""
        single = " data-single" if names and "," not in names else ""
        return (f'<div data-clips="{names}"{single}></div>'
                '<noscript><p>Animated clips of the web panel; see the <a href="/docs/gui-overview#gui-tour">screenshot tour</a>.</p></noscript>')

    body = re.sub(r'<cipi-clips(?: name="([^"]+)")?></cipi-clips>', c, body)
    return body, used


# --------------------------------------------------------------------------- docs model

NAV = json.loads(read(SRC, "docs", "nav.json"))
GROUPS = NAV["groups"]
PAGES: list[dict] = []
for g in GROUPS:
    for p in g["pages"]:
        p["group"] = g
        PAGES.append(p)
BY_SLUG = {p["slug"]: p for p in PAGES}
LANDINGS = {g["landing"]: g for g in GROUPS}
ANCHORS = json.loads(read(SRC, "docs", "anchors.json"))


def process_headings(body: str) -> tuple[str, list[tuple[int, str, str]]]:
    """Give every h2/h3 an id, add a § anchor, return the TOC."""
    used = set(re.findall(r'\sid="([^"]+)"', body))
    toc: list[tuple[int, str, str]] = []

    def repl(m: re.Match) -> str:
        level, attrs, inner = int(m.group(1)), m.group(2), m.group(3)
        idm = re.search(r'\sid="([^"]+)"', attrs)
        if idm:
            hid = idm.group(1)
        else:
            base = slugify(inner)
            hid, n = base, 2
            while hid in used:
                hid = f"{base}-{n}"
                n += 1
            used.add(hid)
            attrs = f' id="{hid}"' + attrs
        if 'class="timeline-title"' not in attrs:
            toc.append((level, hid, strip_tags(inner)))
        return f'<h{level}{attrs}>{inner}<a class="anchor" href="#{hid}" aria-label="Link to this section">#</a></h{level}>'

    body = re.sub(r"<h([23])((?:\s[^>]*)?)>(.*?)</h\1>", repl, body, flags=re.S)
    return body, toc


def sidebar(current: str) -> str:
    out = ['<aside class="docs-side" id="docsSide" aria-label="Documentation">',
           '<button class="side-search" type="button" data-search-open><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>Search</span><kbd class="kbd">/</kbd></button>',
           f'<a class="side-start" href="/docs/"{" aria-current=\"page\"" if current == "index" else ""}>Documentation home</a>']
    for g in GROUPS:
        slugs = [p["slug"] for p in g["pages"]] + [g["landing"]]
        is_open = current in slugs
        out.append(f'<details class="side-group"{" open" if is_open else ""}><summary>{esc(g["title"])}</summary><ul>')
        for p in g["pages"]:
            cur = ' aria-current="page"' if p["slug"] == current else ""
            out.append(f'<li><a href="/docs/{p["slug"]}"{cur}>{esc(p["title"])}</a></li>')
        out.append("</ul></details>")
    out.append("</aside>")
    return "\n".join(out)


def toc_html(toc: list[tuple[int, str, str]], edit_slug: str | None) -> str:
    items = [t for t in toc if t[0] == 2] if len(toc) > 28 else toc
    if items and not any(t[0] == 2 for t in items):
        items = [(2, h, x) for _, h, x in items]
    out = ['<nav class="docs-toc" aria-label="On this page">']
    if items:
        out.append("<h2>On this page</h2><ol>")
        for lvl, hid, text in items:
            out.append(f'<li><a class="l{lvl}" href="#{hid}">{esc(text)}</a></li>')
        out.append("</ol>")
    out.append('<div class="toc-tools">')
    if edit_slug:
        out.append(f'<a href="{REPO_EDIT}{edit_slug}{src_ext(edit_slug)}">Edit this page on GitHub</a>')
    out.append('<a href="https://github.com/cipi-sh/cipi/issues/new">Report a problem</a>')
    out.append('<a href="#main">Back to top</a></div></nav>')
    return "\n".join(out)


def page_shell(*, slug: str, title: str, desc: str, body: str, toc: str, crumbs: list[tuple[str, str]],
               uses: set[str], extra_body_attrs: str = "", robots: str = "index, follow",
               canonical: str | None = None, pager: str = "", meta: str = "", lead: str | None = None) -> str:
    url = canonical or (f"{SITE}/docs/" if slug == "index" else f"{SITE}/docs/{slug}")
    full_title = "Cipi documentation" if slug == "index" else f"{title} — Cipi docs"
    crumb_ld = [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + h} for i, (n, h) in enumerate(crumbs)]
    ld = [
        {"@context": "https://schema.org", "@type": "TechArticle", "headline": title, "description": desc,
         "url": url, "dateModified": TODAY, "inLanguage": "en",
         "author": {"@type": "Person", "name": "Andrea Pollastri", "url": "https://github.com/andreapollastri"},
         "isPartOf": {"@type": "WebSite", "name": "Cipi", "url": SITE + "/"},
         "about": {"@type": "SoftwareApplication", "name": "Cipi", "url": SITE + "/"}},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": crumb_ld},
    ]
    ld_html = "\n".join(f'    <script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)
    crumbs_html = "".join(
        f'<li><a href="{h}">{esc(n)}</a></li>' for n, h in crumbs[:-1]
    ) + f'<li aria-current="page">{esc(crumbs[-1][0])}</li>'
    css = ['<link rel="stylesheet" href="/assets/css/base.css">', '<link rel="stylesheet" href="/assets/css/docs.css">']
    js = ['<script src="/assets/js/site.js" defer></script>', '<script src="/assets/js/docs.js" defer></script>',
          '<script src="/assets/js/search.js" defer></script>', '<script src="/assets/js/stepper.js" defer></script>']
    if "clips" in uses:
        css.append('<link rel="stylesheet" href="/assets/css/clips.css">')
        js.append('<script src="/assets/js/clips.js" defer></script>')
    if "term" in uses:
        js.append('<script src="/assets/js/term.js" defer></script>')
    lead_html = f'<p class="docs-lead">{esc(lead if lead is not None else desc)}</p>' if (lead is not None or desc) else ""
    og_key = "docs" if slug == "index" else f"docs-{slug}"
    og_img = f"{SITE}/img/og/{og_key}.jpg" if os.path.exists(os.path.join(ROOT, "img", "og", f"{og_key}.jpg")) else f"{SITE}/og.png"
    return f"""<!DOCTYPE html>
<html lang="en" data-theme="light" data-follow-system>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{esc(full_title)}</title>
    <meta name="description" content="{esc(desc)}">
    <meta name="robots" content="{robots}">
    <link rel="canonical" href="{url}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Cipi">
    <meta property="og:url" content="{url}">
    <meta property="og:title" content="{esc(full_title)}">
    <meta property="og:description" content="{esc(desc)}">
    <meta property="og:image" content="{og_img}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="{og_img}">
{PARTIALS["head"].rstrip()}
    {chr(10).join("    " + c if i else c for i, c in enumerate(css))}
{ld_html}
</head>
<body class="docs"{extra_body_attrs}>
<!-- site:nav -->
{chrome("nav", wide=True)}<!-- /site:nav -->
<button class="docs-menu-btn" type="button" aria-controls="docsSide" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>Docs menu</button>
<div class="docs-shell">
{sidebar(slug)}
<div class="docs-main">
<main class="docs-article" id="main">
<header>
<ol class="crumbs">{crumbs_html}</ol>
<h1>{esc(title)}</h1>
{lead_html}
{meta}
</header>
<div class="prose">
{body}
</div>
{pager}
</main>
{toc}
</div>
</div>
<!-- site:footer -->
{chrome("footer", wide=False)}<!-- /site:footer -->
{PARTIALS["search"].rstrip()}
{chr(10).join(js)}
{PARTIALS["analytics"].replace("{{PATH}}", "/docs/" + ("" if slug == "index" else slug)).rstrip()}
</body>
</html>
"""


def pager_html(slug: str) -> str:
    order = ["quickstart"] + [p["slug"] for p in PAGES if p["slug"] != "quickstart"]
    i = order.index(slug)
    prev_p = BY_SLUG[order[i - 1]] if i > 0 else None
    next_p = BY_SLUG[order[i + 1]] if i + 1 < len(order) else None
    out = ['<nav class="pager" aria-label="Previous and next page">']
    if prev_p:
        out.append(f'<a class="prev" href="/docs/{prev_p["slug"]}" rel="prev"><small>Previous</small><b>{esc(prev_p["title"])}</b></a>')
    if next_p:
        out.append(f'<a class="next" href="/docs/{next_p["slug"]}" rel="next"><small>Next</small><b>{esc(next_p["title"])}</b></a>')
    out.append("</nav>")
    return "".join(out)


def build_docs() -> list[dict]:
    search: list[dict] = []
    written = []

    # Old pages that are not group landings and not real pages any more
    legacy_only = {k: v for k, v in NAV.get("legacy", {}).items()}

    for p in PAGES:
        md_path = os.path.join(SRC, "docs", "pages", f"{p['slug']}.md")
        if os.path.exists(md_path):
            raw = docmd.render(read(md_path))
        else:
            raw = read(SRC, "docs", "pages", f"{p['slug']}.html")
        body, uses = expand_components(raw)
        body, toc = process_headings(body)
        g = p["group"]
        crumbs = [("Docs", "/docs/"), (g["title"], f"/docs/{g['landing']}"), (p["title"], f"/docs/{p['slug']}")]
        attrs = ""
        if p["slug"] in ANCHORS:  # cli-client / php-sdk keep their old URL
            attrs = f' data-legacy-page="{p["slug"]}"'
        meta = (f'<div class="docs-meta"><span>{esc(g["title"])}</span>'
                f'<a href="{REPO_EDIT}{p["slug"]}{src_ext(p["slug"])}">Edit on GitHub</a></div>')
        out = page_shell(slug=p["slug"], title=p["title"], desc=p["desc"], body=body,
                         toc=toc_html(toc, p["slug"]), crumbs=crumbs, uses=uses,
                         extra_body_attrs=attrs, pager=pager_html(p["slug"]), meta=meta)
        write(os.path.join(ROOT, "docs", f"{p['slug']}.html"), out)
        written.append(p["slug"])

        # search entries: the page, then each h2 section
        g_title = g["title"]
        plain = re.sub(r'<div class="code-block-header">.*?</div>', " ", body, flags=re.S)
        plain = re.sub(r'<div class="term-bar">.*?</div>', " ", plain, flags=re.S)
        plain = re.sub(r'<a class="anchor"[^>]*>#</a>', "", plain)
        search.append({"u": f"/docs/{p['slug']}", "t": p["title"], "g": g_title, "h": p["title"], "d": p["desc"],
                       "x": strip_tags(plain)[:600]})
        parts = re.split(r'(<h([23])[^>]*\sid="[^"]+"[^>]*>.*?</h\2>)', plain, flags=re.S)
        parts = [x for i, x in enumerate(parts) if i % 3 != 2]  # drop the level capture
        for i in range(1, len(parts), 2):
            hid = re.search(r'\sid="([^"]+)"', parts[i]).group(1)
            head = strip_tags(re.sub(r'<a class="anchor".*?</a>', "", parts[i]))
            text = strip_tags(parts[i + 1])[:1600]
            search.append({"u": f"/docs/{p['slug']}", "a": hid, "t": p["title"], "g": g_title, "h": head, "x": text})

    # Group landings (some keep old URLs: apps, deploy, infrastructure, …)
    for g in GROUPS:
        slug = g["landing"]
        items = "".join(
            f'<li><a href="/docs/{p["slug"]}"><b>{esc(p["title"])}</b><span>{esc(p["desc"])}</span></a></li>'
            for p in g["pages"])
        body = f'<ul class="landing-list">{items}</ul>'
        attrs = f' data-legacy-page="{slug}"' if slug in ANCHORS else ""
        out = page_shell(slug=slug, title=g["title"], desc=g["intro"], body=body, toc=toc_html([], None),
                         crumbs=[("Docs", "/docs/"), (g["title"], f"/docs/{slug}")], uses=set(),
                         extra_body_attrs=attrs)
        write(os.path.join(ROOT, "docs", f"{slug}.html"), out)
        written.append(slug)
        search.append({"u": f"/docs/{slug}", "t": g["title"], "g": g["title"], "h": g["title"], "d": g["intro"], "x": ""})

    # Legacy pages with no landing of their own (e.g. /docs/advanced)
    for old, target in legacy_only.items():
        moved = sorted({v for v in ANCHORS[old].values()}, key=lambda s: [x["slug"] for x in PAGES].index(s))
        items = "".join(f'<li><a href="/docs/{s}"><b>{esc(BY_SLUG[s]["title"])}</b><span>{esc(BY_SLUG[s]["desc"])}</span></a></li>' for s in moved)
        body = f'<p>The pages that used to live here now each have their own page:</p><ul class="landing-list">{items}</ul>'
        out = page_shell(slug=old, title="This page has moved", desc="The advanced topics are now separate pages.",
                         body=body, toc=toc_html([], None), crumbs=[("Docs", "/docs/"), ("Moved", f"/docs/{old}")],
                         uses=set(), robots="noindex, follow", canonical=f"{SITE}/docs/{target}",
                         extra_body_attrs=f' data-legacy-page="{old}" data-legacy-default="{target}"')
        write(os.path.join(ROOT, "docs", f"{old}.html"), out)
        written.append(old)

    # Docs home
    start = (
        '<div class="dh-start">'
        '<a class="is-first" href="/docs/quickstart"><b>Quickstart</b><span>A fresh VPS to a Laravel app on HTTPS, step by step.</span></a>'
        '<a href="/docs/installation"><b>Install Cipi</b><span>Requirements, SSH keys, the installer and first login.</span></a>'
        '<a href="/docs/create-app"><b>Create an app</b><span>Laravel, Octane, Node or custom PHP, each isolated.</span></a>'
        '</div>')
    groups_html = []
    for g in GROUPS:
        links = "".join(f'<li><a href="/docs/{p["slug"]}">{esc(p["title"])}</a></li>' for p in g["pages"])
        groups_html.append(f'<section class="dh-group"><h2 id="{slugify(g["title"])}"><a href="/docs/{g["landing"]}">{esc(g["title"])}</a></h2><p>{esc(g["intro"])}</p><ul>{links}</ul></section>')
    body = start + '<div class="docs-home-grid">' + "".join(groups_html) + "</div>"
    out = page_shell(slug="index", title="Documentation",
                     desc="Everything about Cipi: install it, create and deploy apps, domains and SSL, backups, security, the web panel and the API.",
                     lead="Install Cipi, create and deploy apps, and run them in production. Press / anywhere to search.",
                     body=body, toc=toc_html([], None), crumbs=[("Docs", "/docs/")], uses=set(),
                     extra_body_attrs=' data-legacy-page="index"')
    write(os.path.join(ROOT, "docs", "index.html"), out)

    # Search index + legacy anchors
    write(os.path.join(ROOT, "docs", "search-index.json"), json.dumps(search, ensure_ascii=False, separators=(",", ":")))
    allmap: dict[str, str] = {}
    for old in sorted(ANCHORS):
        for k, v in ANCHORS[old].items():
            allmap.setdefault(k, v)
    write(os.path.join(ROOT, "assets", "js", "docs-anchors.js"),
          "window.CIPI_ANCHORS=" + json.dumps({"pages": ANCHORS, "all": allmap}, separators=(",", ":")) + ";\n")
    print(f"docs: {len(written)} pages, {len(search)} search entries")
    return written


# --------------------------------------------------------------------------- home + chrome sync

def build_home() -> None:
    tpl = read(SRC, "pages", "index.html")
    body, _ = expand_components(tpl)
    out = (body.replace("{{HEAD}}", PARTIALS["head"].rstrip())
           .replace("{{JSONLD}}", read(SRC, "pages", "home-jsonld.html").rstrip())
           .replace("{{NAV}}", "<!-- site:nav -->\n" + chrome("nav") + "<!-- /site:nav -->")
           .replace("{{FOOTER}}", "<!-- site:footer -->\n" + chrome("footer") + "<!-- /site:footer -->")
           .replace("{{SEARCH}}", PARTIALS["search"].rstrip())
           .replace("</body>", PARTIALS["analytics"].replace("{{PATH}}", "/") + "</body>"))
    write(os.path.join(ROOT, "index.html"), out)
    print("home: index.html")


def build_404() -> None:
    tpl = read(SRC, "pages", "404.html")
    out = (tpl.replace("{{HEAD}}", PARTIALS["head"].rstrip())
           .replace("{{NAV}}", "<!-- site:nav -->\n" + chrome("nav") + "<!-- /site:nav -->")
           .replace("{{FOOTER}}", "<!-- site:footer -->\n" + chrome("footer") + "<!-- /site:footer -->")
           .replace("{{SEARCH}}", PARTIALS["search"].rstrip()))
    write(os.path.join(ROOT, "404.html"), out)
    print("404: 404.html")


def sync_chrome() -> None:
    """Keep nav/footer identical on hand-written pages (guides, comparisons, …)."""
    files = [f for f in glob.glob(os.path.join(ROOT, "*.html")) + glob.glob(os.path.join(ROOT, "guides", "*.html"))
             if os.path.basename(f) != "index.html" or "guides" in f]
    n = 0
    for f in files:
        s = read(f)
        if "<!-- site:nav -->" not in s:
            continue
        s2 = re.sub(r"<!-- site:nav -->.*?<!-- /site:nav -->", lambda m: "<!-- site:nav -->\n" + chrome("nav") + "<!-- /site:nav -->", s, flags=re.S)
        s2 = re.sub(r"<!-- site:footer -->.*?<!-- /site:footer -->", lambda m: "<!-- site:footer -->\n" + chrome("footer") + "<!-- /site:footer -->", s2, flags=re.S)
        if s2 != s:
            write(f, s2)
            n += 1
    print(f"chrome: {n} pages updated")


if __name__ == "__main__":
    what = sys.argv[1:] or ["home", "docs", "chrome"]
    if "home" in what:
        build_home()
        build_404()
    if "docs" in what:
        build_docs()
    if "chrome" in what:
        sync_chrome()
