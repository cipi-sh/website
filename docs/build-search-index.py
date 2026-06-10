#!/usr/bin/env python3
"""Regenerate docs/search-index.js from HTML doc sections."""

from __future__ import annotations

import glob
import html
import json
import os
import re

DOCS_DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(DOCS_DIR, "search-index.js")

PAGE_TITLES = {
    "index": "Docs",
    "getting-started": "Getting Started",
    "agent": "Cipi Agent",
    "apps": "Apps",
    "deploy": "Deploy & CI/CD",
    "infrastructure": "Infrastructure",
    "cli-client": "CLI Client",
    "advanced": "Advanced",
    "about": "About Cipi",
}


def strip_tags(s: str) -> str:
    s = re.sub(r"<script[^>]*>.*?</script>", " ", s, flags=re.DOTALL | re.IGNORECASE)
    s = re.sub(r"<style[^>]*>.*?</style>", " ", s, flags=re.DOTALL | re.IGNORECASE)
    s = re.sub(r"<pre[^>]*>.*?</pre>", " ", s, flags=re.DOTALL | re.IGNORECASE)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def page_chapter(content: str, page: str) -> str:
    match = re.search(r'class="doc-section-label"[^>]*>([^<]+)', content)
    if match:
        return html.unescape(re.sub(r"\s+", " ", match.group(1)).strip())
    return PAGE_TITLES.get(page, page.replace("-", " ").title())


def extract_entries() -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []

    for filepath in sorted(glob.glob(os.path.join(DOCS_DIR, "*.html"))):
        page = os.path.basename(filepath).replace(".html", "")
        with open(filepath, encoding="utf-8") as handle:
            content = handle.read()

        chapter = page_chapter(content, page)
        main_match = re.search(
            r'<main class="docs-content"[^>]*>(.*)</main>', content, re.DOTALL
        )
        if not main_match:
            continue

        parts = re.split(r'<div class="doc-section" id="([^"]+)">', main_match.group(1))
        index = 1
        while index < len(parts) - 1:
            section_id = parts[index]
            body = parts[index + 1]
            body = re.split(r'<div class="(?:doc-section|page-nav)"', body)[0]

            h2 = re.search(r"<h2[^>]*>(.*?)</h2>", body, re.DOTALL)
            heading = strip_tags(h2.group(1)) if h2 else section_id
            text = strip_tags(body)
            blob = f"{chapter} {heading} {text}"
            if len(blob) > 4000:
                blob = blob[:4000]

            entries.append(
                {
                    "p": page,
                    "c": chapter,
                    "id": section_id,
                    "h": heading,
                    "t": blob,
                }
            )
            index += 2

    return entries


def main() -> None:
    entries = extract_entries()
    with open(OUT, "w", encoding="utf-8") as handle:
        handle.write("window.CIPI_DOCS = ")
        json.dump(entries, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write(";\n")
    print(f"Wrote {len(entries)} entries to {OUT}")


if __name__ == "__main__":
    main()
