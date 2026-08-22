#!/usr/bin/env python3
"""Re-apply structural i18n fixes to generated language pages (canonical, lang, og)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_lib import (  # noqa: E402
    OG_LOCALES,
    ROOT,
    build_alternates,
    build_og_locales,
    build_switch,
    file_to_en_canon,
    lang_href,
    localize_canon,
)

ALT_RE = re.compile(r"<!-- i18n:alternates -->.*?<!-- /i18n:alternates -->", re.DOTALL)
SWITCH_RE = re.compile(r"<!-- i18n:switch -->.*?<!-- /i18n:switch -->", re.DOTALL)
OG_LOCALE_RE = re.compile(
    r'<meta[^>]*property="og:locale"[^>]*>\s*(?:<meta[^>]*property="og:locale:alternate"[^>]*>\s*)*',
    re.DOTALL,
)


def fix_page(path: Path, lang: str) -> None:
    en_canon = file_to_en_canon(path)
    if en_canon is None:
        return
    text = path.read_text(encoding="utf-8")
    canon_path = lang_href(lang, localize_canon(en_canon, lang))
    canon_url = f"https://cipi.sh{canon_path}"

    text = re.sub(r'(<html\b[^>]*\blang=")[^"]*(")', rf"\1{lang}\2", text, count=1)
    text = re.sub(r'"inLanguage": "en"', f'"inLanguage": "{lang}"', text)

    text = re.sub(
        r'(<link\b[^>]*rel="canonical"[^>]*href=")[^"]*(")',
        rf"\1{canon_url}\2",
        text,
        count=1,
    )
    text = re.sub(
        r'(<link\b[^>]*href=")[^"]*("[^>]*rel="canonical")',
        rf"\1{canon_url}\2",
        text,
        count=1,
    )
    text = re.sub(
        r'(<meta\b[^>]*property="og:url"[^>]*content=")[^"]*(")',
        rf"\1{canon_url}\2",
        text,
        count=1,
    )
    text = re.sub(
        r'(<meta\b[^>]*content=")[^"]*("[^>]*property="og:url")',
        rf"\1{canon_url}\2",
        text,
        count=1,
    )

    if ALT_RE.search(text):
        text = ALT_RE.sub(build_alternates(en_canon), text, count=1)
    if SWITCH_RE.search(text):
        m = re.search(r"(\s*)<!-- i18n:switch -->", text)
        indent = m.group(1) if m else ""
        text = SWITCH_RE.sub(indent + build_switch(lang, en_canon), text, count=1)
    if OG_LOCALE_RE.search(text):
        text = OG_LOCALE_RE.sub(build_og_locales(lang), text, count=1)

    path.write_text(text, encoding="utf-8")


def main() -> None:
    for lang in ("de", "fr", "es", "pt"):
        for path in sorted((ROOT / lang).rglob("*.html")):
            fix_page(path, lang)
            print(f"fixed {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
