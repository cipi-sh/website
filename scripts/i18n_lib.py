"""Shared i18n configuration for cipi.sh (must stay in sync with netlify/edge-functions/i18n.js)."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://cipi.sh"

# Display order in the language dropdown
LANGUAGES = [
    ("en", "English", "EN"),
    ("de", "Deutsch", "DE"),
    ("fr", "Français", "FR"),
    ("it", "Italiano", "IT"),
    ("es", "Español", "ES"),
    ("pt", "Português", "PT"),
]

LANG_CODES = [code for code, _, _ in LANGUAGES]

OG_LOCALES = {
    "en": "en_US",
    "de": "de_DE",
    "fr": "fr_FR",
    "it": "it_IT",
    "es": "es_ES",
    "pt": "pt_PT",
}

# English canon → Italian path (must match netlify/edge-functions/i18n.js)
SLUGS_IT = {
    "/": "/",
    "/404": "/404",
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
    "/guides/deploy-wordpress-custom-app": "/guide/deploy-wordpress-app-custom-github",
}

SLUGS_EN = {it: en for en, it in SLUGS_IT.items()}


def localize_canon(en_canon: str, lang: str) -> str:
    if lang == "en":
        return en_canon
    if lang == "it":
        return SLUGS_IT.get(en_canon, en_canon)
    return en_canon


def lang_href(lang: str, localized_canon: str) -> str:
    if localized_canon == "/":
        return "/" if lang == "en" else f"/{lang}/"
    return f"/{lang}{localized_canon}"


def abs_href(lang: str, en_canon: str) -> str:
    return f"{BASE}{lang_href(lang, localize_canon(en_canon, lang))}"


def file_to_en_canon(path: Path) -> str | None:
    rel = path.relative_to(ROOT).as_posix()
    if rel.endswith("404.html"):
        return "/404"
    if rel == "index.html":
        return "/"
    if not (rel.startswith("en/") or rel.startswith("it/") or rel.startswith("de/")
            or rel.startswith("fr/") or rel.startswith("es/") or rel.startswith("pt/")):
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
    if lang == "it":
        return SLUGS_EN.get(bare, bare)
    return bare


def detect_page_lang(path: Path) -> str | None:
    rel = path.relative_to(ROOT).as_posix()
    if rel == "index.html" or rel == "404.html":
        return "en"
    if rel.startswith(("en/", "it/", "de/", "fr/", "es/", "pt/")):
        return rel.split("/", 1)[0]
    return None


def build_alternates(en_canon: str) -> str:
    lines = ["    <!-- i18n:alternates -->"]
    for code, _, _ in LANGUAGES:
        lines.append(
            f'    <link rel="alternate" hreflang="{code}" href="{abs_href(code, en_canon)}">'
        )
    lines.append(f'    <link rel="alternate" hreflang="x-default" href="{abs_href("en", en_canon)}">')
    lines.append("    <!-- /i18n:alternates -->")
    return "\n".join(lines)


def build_switch(current_lang: str, en_canon: str) -> str:
    summary = next(label for code, _, label in LANGUAGES if code == current_lang)
    links = []
    for code, name, _ in LANGUAGES:
        href = lang_href(code, localize_canon(en_canon, code))
        active = ' class="active"' if code == current_lang else ""
        links.append(
            f'<a{active} href="{href}" hreflang="{code}" lang="{code}" '
            f"onclick=\"document.cookie='cipi-lang={code};path=/;max-age=31536000;SameSite=Lax'\">{name}</a>"
        )
    menu = "".join(links)
    return (
        f'<!-- i18n:switch --><details class="lang-switch" '
        f'ontoggle="if(this.open){{const s=this;const c=e=>{{if(!s.contains(e.target)){{s.removeAttribute(\'open\');document.removeEventListener(\'pointerdown\',c)}}}};setTimeout(()=>document.addEventListener(\'pointerdown\',c),0)}}">'
        f'<summary aria-label="Language">{summary}</summary><div class="lang-menu">{menu}</div></details><!-- /i18n:switch -->'
    )


def build_og_locales(current_lang: str) -> str:
    primary = OG_LOCALES[current_lang]
    alternates = [OG_LOCALES[c] for c in LANG_CODES if c != current_lang]
    lines = [f'    <meta property="og:locale" content="{primary}">']
    for alt in alternates:
        lines.append(f'    <meta property="og:locale:alternate" content="{alt}">')
    return "\n".join(lines)
