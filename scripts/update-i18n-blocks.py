#!/usr/bin/env python3
"""Update i18n:alternates, i18n:switch, and og:locale blocks on all HTML pages."""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_lib import (  # noqa: E402
    ROOT,
    build_alternates,
    build_og_locales,
    build_switch,
    detect_page_lang,
    file_to_en_canon,
)

ALT_RE = re.compile(r"<!-- i18n:alternates -->.*?<!-- /i18n:alternates -->", re.DOTALL)
SWITCH_RE = re.compile(r"<!-- i18n:switch -->.*?<!-- /i18n:switch -->", re.DOTALL)
OG_LOCALE_RE = re.compile(
    r'<meta property="og:locale" content="[^"]*">\s*(?:<meta property="og:locale:alternate" content="[^"]*">\s*)*'
)


def update_file(path: Path) -> bool:
    lang = detect_page_lang(path)
    if lang is None:
        return False

    en_canon = file_to_en_canon(path)
    if en_canon is None:
        return False

    text = path.read_text(encoding="utf-8")
    original = text

    if ALT_RE.search(text):
        text = ALT_RE.sub(build_alternates(en_canon), text, count=1)
    if SWITCH_RE.search(text):
        indent = ""
        m = re.search(r"(\s*)<!-- i18n:switch -->", original)
        if m:
            indent = m.group(1)
        text = SWITCH_RE.sub(indent + build_switch(lang, en_canon), text, count=1)
    if OG_LOCALE_RE.search(text):
        text = OG_LOCALE_RE.sub(build_og_locales(lang), text, count=1)

    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    updated = 0
    for path in sorted(ROOT.rglob("*.html")):
        if update_file(path):
            updated += 1
            print(f"updated {path.relative_to(ROOT)}")
    print(f"Done: {updated} files updated")


if __name__ == "__main__":
    main()
