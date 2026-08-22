#!/usr/bin/env python3
"""Generate sitemap.xml from en/it HTML pages + hreflang slug map."""
from __future__ import annotations

from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://cipi.sh"
TODAY = date.today().isoformat()

# English canon → Italian path (must match netlify/edge-functions/i18n.js)
SLUGS_IT = {
    "/": "/",
    "/whats-new": "/novita",
    "/discovery": "/discovery",
    "/alternatives": "/alternative",
    "/best-laravel-forge-alternatives": "/migliori-alternative-a-laravel-forge",
    "/alternative-to-cleavr": "/alternativa-a-cleavr",
    "/alternative-to-cloudpanel": "/alternativa-a-cloudpanel",
    "/alternative-to-coolify": "/alternativa-a-coolify",
    "/alternative-to-cpanel": "/alternativa-a-cpanel",
    "/alternative-to-directadmin": "/alternativa-a-directadmin",
    "/alternative-to-dokku": "/alternativa-a-dokku",
    "/alternative-to-easypanel": "/alternativa-a-easypanel",
    "/alternative-to-kamal": "/alternativa-a-kamal",
    "/alternative-to-laravel-cloud": "/alternativa-a-laravel-cloud",
    "/alternative-to-laravel-forge": "/alternativa-a-laravel-forge",
    "/alternative-to-moss": "/alternativa-a-moss",
    "/alternative-to-plesk": "/alternativa-a-plesk",
    "/alternative-to-ploi": "/alternativa-a-ploi",
    "/alternative-to-runcloud": "/alternativa-a-runcloud",
    "/alternative-to-serverpilot": "/alternativa-a-serverpilot",
    "/alternative-to-vito-deploy": "/alternativa-a-vito-deploy",
    "/docs/": "/docs/",
    "/docs/getting-started": "/docs/primi-passi",
    "/docs/agent": "/docs/agent",
    "/docs/apps": "/docs/app",
    "/docs/deploy": "/docs/deploy",
    "/docs/infrastructure": "/docs/infrastruttura",
    "/docs/cli-client": "/docs/client-cli",
    "/docs/gui": "/docs/gui",
    "/docs/advanced": "/docs/avanzato",
    "/docs/about": "/docs/informazioni",
    "/guides/": "/guide/",
    "/guides/deploy-laravel-ubuntu-vps": "/guide/deploy-laravel-su-ubuntu-vps",
    "/guides/laravel-security-checklist": "/guide/checklist-sicurezza-laravel",
    "/guides/laravel-ecosystem-2026": "/guide/ecosistema-laravel-2026",
    "/guides/laravel-ci-cd-git-workflow": "/guide/ci-cd-workflow-git-laravel",
    "/guides/spec-driven-development-ai-laravel": "/guide/sviluppo-spec-driven-ai-laravel",
    "/guides/laravel-developer-stack-2026": "/guide/stack-developer-self-hosted-2026",
}


def file_to_canon(path: Path) -> str | None:
    rel = path.relative_to(ROOT).as_posix()
    if rel.endswith("404.html") or rel == "index.html":
        return None
    if not (rel.startswith("en/") or rel.startswith("it/")):
        return None
    lang, rest = rel.split("/", 1)
    if rest.endswith("/index.html"):
        bare = "/" + rest[: -len("index.html")]
    elif rest == "index.html":
        bare = "/"
    else:
        bare = "/" + rest[: -len(".html")]
    if lang == "en":
        return bare
    for en, it in SLUGS_IT.items():
        if it == bare:
            return en
    return bare


def priority_for(canon: str) -> tuple[str, str]:
    if canon == "/":
        return "1.0", "weekly"
    if canon in ("/alternatives", "/best-laravel-forge-alternatives", "/whats-new"):
        return "0.9", "weekly"
    if canon in ("/docs/", "/guides/"):
        return "0.9", "weekly"
    if canon.startswith("/docs/") or canon.startswith("/guides/"):
        return "0.8", "weekly"
    if canon.startswith("/alternative-to-") or canon == "/discovery":
        return "0.8", "monthly"
    return "0.8", "monthly"


def href(lang: str, canon: str) -> str:
    if canon == "/":
        return f"{BASE}/" if lang == "en" else f"{BASE}/{lang}/"
    return f"{BASE}/{lang}{canon}"


def url_entry(loc: str, en_canon: str, it_canon: str, priority: str, freq: str, image: bool = False) -> str:
    en_href = href("en", en_canon)
    it_href = href("it", it_canon)
    lines = [
        "  <url>",
        f"    <loc>{loc}</loc>",
        f'    <xhtml:link rel="alternate" hreflang="en" href="{en_href}"/>',
        f'    <xhtml:link rel="alternate" hreflang="it" href="{it_href}"/>',
        f'    <xhtml:link rel="alternate" hreflang="x-default" href="{en_href}"/>',
        f"    <lastmod>{TODAY}</lastmod>",
        f"    <changefreq>{freq}</changefreq>",
        f"    <priority>{priority}</priority>",
    ]
    if image:
        lines += [
            "    <image:image>",
            f"      <image:loc>{BASE}/og.png</image:loc>",
            "      <image:title>Cipi — Free Open-Source Laravel Deployment CLI</image:title>",
            "    </image:image>",
        ]
    lines.append("  </url>")
    return "\n".join(lines)


def main() -> None:
    canons: set[str] = set()
    for path in sorted(ROOT.rglob("*.html")):
        c = file_to_canon(path)
        if c is not None:
            canons.add(c)

    canons.update(SLUGS_IT.keys())

    def sort_key(c: str):
        pri, _ = priority_for(c)
        return (0 if c == "/" else 1, -float(pri), c)

    ordered = sorted(canons, key=sort_key)

    chunks = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml"',
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ]

    for canon in ordered:
        it = SLUGS_IT.get(canon, canon)
        pri, freq = priority_for(canon)
        chunks.append(url_entry(href("en", canon), canon, it, pri, freq, image=(canon == "/")))
        chunks.append(url_entry(href("it", it), canon, it, pri, freq, image=False))

    chunks.append("</urlset>")
    chunks.append("")

    out = ROOT / "sitemap.xml"
    out.write_text("\n".join(chunks), encoding="utf-8")
    print(f"Wrote {out} ({len(ordered) * 2} URLs, homepage first)")


if __name__ == "__main__":
    main()
