#!/usr/bin/env python3
"""Repair broken translation placeholders in generated fr/de/es/pt pages."""
from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag

ROOT = Path(__file__).resolve().parent.parent
TARGET_LANGS = ["de", "fr", "es", "pt"]
SEARCH_INDEX_RE = re.compile(r"window\.CIPI_DOCS\s*=\s*(\[.*\])\s*;?\s*$", re.DOTALL)

_spec = importlib.util.spec_from_file_location(
    "generate_lang_pages", Path(__file__).resolve().parent / "generate-lang-pages.py"
)
_mod = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_mod)

BROKEN_PLACEHOLDER = _mod.BROKEN_PLACEHOLDER
META_TRANSLATE = _mod.META_TRANSLATE
SKIP_TAGS = _mod.SKIP_TAGS
TRANSLATABLE_ATTRS = _mod.TRANSLATABLE_ATTRS
collect_strings = _mod.collect_strings
in_lang_switch = _mod.in_lang_switch
repair_value = _mod.repair_value
should_skip_text = _mod.should_skip_text


def structural_path(node: NavigableString) -> tuple[tuple[str, int, str], ...]:
    el = node.parent
    parts: list[tuple[str, int, str]] = []
    while el and isinstance(el, Tag) and el.name not in ("[document]", "html"):
        parent = el.parent
        idx = 0
        if isinstance(parent, Tag):
            sibs = [c for c in parent.children if isinstance(c, Tag)]
            idx = sibs.index(el) if el in sibs else 0
        parts.append((el.name, idx, el.get("id") or ""))
        el = parent
    return tuple(reversed(parts))


def map_text_nodes(soup: BeautifulSoup) -> dict[tuple[tuple[str, int, str], ...], NavigableString]:
    nodes: dict[tuple[tuple[str, int, str], ...], NavigableString] = {}
    for node in soup.strings:
        if not isinstance(node, NavigableString):
            continue
        parent = node.parent
        if not parent or not isinstance(parent, Tag):
            continue
        if parent.name in SKIP_TAGS or in_lang_switch(node):
            continue
        if should_skip_text(str(node)):
            continue
        nodes[structural_path(node)] = node
    return nodes


def iter_translatable_tags(soup: BeautifulSoup) -> list[Tag]:
    tags: list[Tag] = []
    for tag in soup.find_all(True):
        if tag.name in SKIP_TAGS:
            continue
        if any(tag.has_attr(attr) and not should_skip_text(tag[attr]) for attr in TRANSLATABLE_ATTRS):
            tags.append(tag)
    return tags


def repair_remaining(en_html: str, text: str) -> tuple[str, int]:
    """Best-effort cleanup when DOM node counts differ after translation."""
    fixes = 0
    strings = sorted(collect_strings(en_html), key=len, reverse=True)
    result = text
    for _ in range(500):
        match = BROKEN_PLACEHOLDER.search(result)
        if not match:
            break
        start = max(0, match.start() - 120)
        end = min(len(result), match.end() + 120)
        window = result[start:end]
        best: str | None = None
        best_score = -1
        for src in strings:
            fixed = repair_value(src, window)
            if fixed == window:
                continue
            remaining = len(BROKEN_PLACEHOLDER.findall(fixed))
            score = len(BROKEN_PLACEHOLDER.findall(window)) - remaining
            if score > best_score:
                best_score = score
                best = fixed
        if best is None or best_score <= 0:
            break
        result = result[:start] + best + result[end:]
        fixes += 1
    return result, fixes


def repair_html(en_html: str, lang_html: str) -> tuple[str, int]:
    en_soup = BeautifulSoup(en_html, "html.parser")
    lang_soup = BeautifulSoup(lang_html, "html.parser")
    fixes = 0

    if en_soup.title and en_soup.title.string and lang_soup.title and lang_soup.title.string:
        src = str(en_soup.title.string)
        dst = str(lang_soup.title.string)
        fixed = repair_value(src, dst)
        if fixed != dst:
            lang_soup.title.string.replace_with(fixed)
            fixes += 1

    en_metas = [
        m
        for m in en_soup.find_all("meta")
        if (m.get("property") or m.get("name") or "") in META_TRANSLATE | {"og:title", "og:description"}
        and m.get("content")
    ]
    lang_metas = [
        m
        for m in lang_soup.find_all("meta")
        if (m.get("property") or m.get("name") or "") in META_TRANSLATE | {"og:title", "og:description"}
        and m.get("content")
    ]
    for en_meta, lang_meta in zip(en_metas, lang_metas):
        src = en_meta["content"]
        dst = lang_meta["content"]
        fixed = repair_value(src, dst)
        if fixed != dst:
            lang_meta["content"] = fixed
            fixes += 1

    en_nodes = map_text_nodes(en_soup)
    lang_nodes = map_text_nodes(lang_soup)
    for path, en_node in en_nodes.items():
        lang_node = lang_nodes.get(path)
        if lang_node is None:
            continue
        src = str(en_node)
        dst = str(lang_node)
        fixed = repair_value(src, dst)
        if fixed != dst:
            lang_node.replace_with(fixed)
            fixes += 1

    en_tags = iter_translatable_tags(en_soup)
    lang_tags = iter_translatable_tags(lang_soup)
    for en_tag, lang_tag in zip(en_tags, lang_tags):
        for attr in TRANSLATABLE_ATTRS:
            if not en_tag.has_attr(attr) or should_skip_text(en_tag[attr]):
                continue
            src = en_tag[attr]
            dst = lang_tag.get(attr, src)
            fixed = repair_value(src, dst)
            if fixed != dst:
                lang_tag[attr] = fixed
                fixes += 1

    result = str(lang_soup)
    extra, extra_fixes = repair_remaining(en_html, result)
    return extra, fixes + extra_fixes


def repair_search_index(en_path: Path, lang_path: Path) -> tuple[str, int]:
    en_text = en_path.read_text(encoding="utf-8")
    lang_text = lang_path.read_text(encoding="utf-8")
    en_match = SEARCH_INDEX_RE.search(en_text)
    lang_match = SEARCH_INDEX_RE.search(lang_text)
    if not en_match or not lang_match:
        return lang_text, 0

    en_data = json.loads(en_match.group(1))
    lang_data = json.loads(lang_match.group(1))
    if len(en_data) != len(lang_data):
        raise ValueError(f"search-index entry count mismatch: {len(en_data)} vs {len(lang_data)}")

    fixes = 0
    for en_entry, lang_entry in zip(en_data, lang_data):
        for key in ("c", "h", "t"):
            if key not in en_entry or key not in lang_entry:
                continue
            src = en_entry[key]
            dst = lang_entry[key]
            fixed = repair_value(src, dst)
            if fixed != dst:
                lang_entry[key] = fixed
                fixes += 1

    payload = json.dumps(lang_data, ensure_ascii=False, separators=(",", ":"))
    return f"window.CIPI_DOCS = {payload};\n", fixes


def main() -> None:
    total_fixes = 0
    for lang in TARGET_LANGS:
        for en_path in sorted((ROOT / "en").rglob("*.html")):
            rel = en_path.relative_to(ROOT / "en")
            lang_path = ROOT / lang / rel
            if not lang_path.exists():
                continue
            repaired, fixes = repair_html(
                en_path.read_text(encoding="utf-8"),
                lang_path.read_text(encoding="utf-8"),
            )
            if fixes:
                lang_path.write_text(repaired, encoding="utf-8")
                print(f"  {lang}/{rel}: {fixes} fixes")
                total_fixes += fixes

        search_en = ROOT / "en" / "docs" / "search-index.js"
        search_lang = ROOT / lang / "docs" / "search-index.js"
        if search_en.exists() and search_lang.exists():
            repaired, fixes = repair_search_index(search_en, search_lang)
            if fixes:
                search_lang.write_text(repaired, encoding="utf-8")
                print(f"  {lang}/docs/search-index.js: {fixes} fixes")
                total_fixes += fixes

    remaining = 0
    for lang in TARGET_LANGS:
        for path in (ROOT / lang).rglob("*"):
            if path.suffix not in {".html", ".js"}:
                continue
            remaining += len(BROKEN_PLACEHOLDER.findall(path.read_text(encoding="utf-8")))

    print(f"\nTotal fixes: {total_fixes}")
    print(f"Remaining broken placeholders: {remaining}")
    if remaining:
        sys.exit(1)


if __name__ == "__main__":
    main()
