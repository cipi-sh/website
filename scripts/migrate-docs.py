#!/usr/bin/env python3
"""One-off migration: split the old long docs pages into the new page structure.

Reads docs/<old>.html (the pre-2026-11 layout) and _source/docs/nav.json, writes one
content fragment per new page to _source/docs/pages/<slug>.html and the old-anchor
map to _source/docs/anchors.json. Links in every fragment are rewritten to the new URLs.

Kept in the repo for reference; after the migration the fragments are the source.
"""
from __future__ import annotations

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "_source", "docs")
OLD_PAGES = ["getting-started", "apps", "deploy", "infrastructure", "advanced",
             "agent", "cli-client", "php-sdk", "gui", "about"]


def old_sections(page: str) -> list[tuple[str, str]]:
    html = open(os.path.join(ROOT, "docs", f"{page}.html"), encoding="utf-8").read()
    main = re.search(r'<main class="docs-content"[^>]*>(.*)</main>', html, re.S).group(1)
    parts = re.split(r'<div class="doc-section" id="([^"]+)"[^>]*>', main)
    out = []
    for i in range(1, len(parts), 2):
        body = parts[i + 1]
        body = re.split(r'<div class="page-nav"', body)[0]
        body = body.rstrip()
        # each chunk ends with the closing </div> of its section
        if body.endswith("</div>"):
            body = body[: -len("</div>")]
        out.append((parts[i], body))
    return out


def main() -> None:
    nav = json.load(open(os.path.join(SRC, "nav.json"), encoding="utf-8"))
    sections = {p: dict(old_sections(p)) for p in OLD_PAGES}
    order = {p: [s for s, _ in old_sections(p)] for p in OLD_PAGES}

    # page assignments
    plan: dict[str, list[tuple[str, str]]] = {}
    for g in nav["groups"]:
        for pg in g["pages"]:
            src = pg["from"]
            if isinstance(src, str):
                plan[pg["slug"]] = [(src, sid) for sid in order[src]]
            else:
                plan[pg["slug"]] = [tuple(x) for x in src]

    used = {(p, s) for v in plan.values() for p, s in v}
    missing = [(p, s) for p in OLD_PAGES for s in order[p] if (p, s) not in used]
    if missing:
        sys.exit(f"unassigned sections: {missing}")

    # anchor map: old page -> id -> new slug (every id inside a section)
    anchors: dict[str, dict[str, str]] = {p: {} for p in OLD_PAGES}
    for slug, srcs in plan.items():
        for p, sid in srcs:
            anchors[p][sid] = slug
            for inner in re.findall(r'\sid="([^"]+)"', sections[p][sid]):
                anchors[p].setdefault(inner, slug)

    def rewrite(html: str, ctx_page: str) -> str:
        def repl(m: re.Match) -> str:
            url = m.group(1)
            mm = re.match(r'^(?:https://cipi\.sh)?/docs/([a-z0-9-]+?)(?:\.html)?/?(#[^"]*)?$', url)
            if mm and mm.group(1) in anchors:
                page, frag = mm.group(1), (mm.group(2) or "")
                aid = frag[1:]
                if aid and aid in anchors[page]:
                    return f'href="/docs/{anchors[page][aid]}{frag}"'
                if page in ("cli-client", "php-sdk"):
                    return f'href="/docs/{page}{frag}"'
                return f'href="/docs/{page}{frag}"'
            if url.startswith("#") and len(url) > 1:
                aid = url[1:]
                if aid in anchors[ctx_page]:
                    return f'href="/docs/{anchors[ctx_page][aid]}{url}"'
            return m.group(0)
        return re.sub(r'href="([^"]*)"', repl, html)

    os.makedirs(os.path.join(SRC, "pages"), exist_ok=True)
    for slug, srcs in plan.items():
        chunks = []
        single = len(srcs) == 1
        for p, sid in srcs:
            body = sections[p][sid]
            body = re.sub(r'\s*<p class="doc-section-label">.*?</p>', "", body, flags=re.S)
            body = re.sub(r'\s*onclick="copyCode\(this\)"', "", body)
            body = re.sub(r'<button\s+class="code-copy-btn"\s*>', '<button class="code-copy-btn" type="button">', body)
            if single:
                body = re.sub(r'^\s*<h[12][^>]*>.*?</h[12]>', "", body, count=1, flags=re.S)
            else:
                body = re.sub(r'<h1([^>]*)>(.*?)</h1>', r'<h2\1>\2</h2>', body, flags=re.S)
            body = rewrite(body, p)
            body = re.sub(r'\n{3,}', "\n\n", body).strip("\n")
            chunks.append(f'<section class="doc-section" id="{sid}">\n{body}\n</section>')
        with open(os.path.join(SRC, "pages", f"{slug}.html"), "w", encoding="utf-8") as fh:
            fh.write("\n\n".join(chunks) + "\n")

    with open(os.path.join(SRC, "anchors.json"), "w", encoding="utf-8") as fh:
        json.dump(anchors, fh, indent=1, sort_keys=True)
    print(f"{len(plan)} pages written")


if __name__ == "__main__":
    main()
