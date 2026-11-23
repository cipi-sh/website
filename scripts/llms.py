#!/usr/bin/env python3
"""Write llms.txt (index) and llms-full.txt (all docs, guides and comparisons as plain Markdown)."""
from __future__ import annotations
import os, re, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B  # noqa
import content as C  # noqa

SITE = B.SITE

INTRO = """# Cipi

> Cipi is a free, open-source (MIT) platform that turns a fresh Ubuntu 24.04 or 26.04 VPS into a hardened hosting server for Laravel and PHP apps, with zero-downtime Git deploys, an optional self-hosted web panel, a REST API and MCP servers for AI assistants. A self-hosted alternative to Laravel Forge, Ploi and Vito Deploy: no subscription, nothing leaves your server.

Install: `wget -O - https://cipi.sh/setup.sh | bash` (as root on a fresh server). Then log in as `cipi` and run `sudo cipi …`.

## Key facts

- **Free and self-hosted.** MIT licence. No account, no SaaS control plane, no telemetry. The only cost is the VPS.
- **Isolated apps.** Each app gets its own Linux user, PHP-FPM pool (`open_basedir`), database user, Nginx vhost, certificate and deploy key.
- **App types.** Laravel (PHP-FPM or Octane with FrankenPHP), Node apps (SPA, static, SSR with Next.js, Nuxt, SvelteKit, Astro, Remix, Vite), and custom PHP apps (WordPress, Symfony, static sites).
- **Zero-downtime deploys.** Deployer releases with one atomic symlink swap, `cipi deploy <app> --rollback`, pre-deploy DB snapshots, health-checked automatic rollback, a hash-chained deploy audit trail. Push-to-deploy from GitHub, GitLab, Bitbucket, Azure DevOps (automatic setup with a token) or any Git server.
- **cipi.yml.** An app's server settings in its repository: PHP version and ini, aliases, www/apex, workers, Horizon, Reverb, scheduler, Meilisearch, health check, deploy options and post-deploy steps, extra databases, crons, backup profiles, redirects, proxies, Node settings. `cipi yml plan` shows every change; `apply` is all-or-nothing; `auto on` applies after every deploy. `cipi-<env>.yml` per environment (the server chooses the file). Fail-closed: namespaced resources, allowlisted runners, no secrets.
- **Runtime.** Several PHP versions side by side (8.3–8.6; new servers default to 8.6), MariaDB (default) and optional PostgreSQL, one Valkey instance per app, optional Meilisearch, Node runtimes, Supervisor workers, Horizon, Reverb behind the app's own domain, Octane with pinned FrankenPHP builds, per-app JIT.
- **Security.** SSH keys only, UFW, fail2ban (configurable attempts), optional CrowdSec, Cloudflare Zero Trust (tunnel, Access, close ports), encrypted vault (AES-256) for credentials, nightly PHP patching from packages.sury.org at 03:30 with alerts while a version is vulnerable, nginx from nginx.org mainline with `cipi autoupdate`, HTTP/2 never enabled, hardened PHP-FPM admin flags, malware scans, compliance reports.
- **Operations.** Backup profiles to local and S3-compatible destinations (encrypted, retention, verification), `cipi sync` to move or replicate apps between servers, server monitor, health checks, disk usage per app and database, notifications by e-mail, Slack, Discord, Telegram, Mattermost, Google Chat, ntfy, Pushover or webhook.
- **Interfaces.** CLI first. Optional web panel (`cipi gui <domain>`): fleet view of many servers, roles and per-app permissions, invite links, TOTP 2FA, OpenID Connect SSO. REST API (`cipi api <domain>`) with Sanctum tokens and abilities, IP allowlist, Swagger. cipi-cli (Go binary for your laptop), PHP SDK (`cipi/sdk`), WHMCS module.
- **AI.** Two MCP servers: the Cipi Agent's per-app MCP (`composer require cipi/agent`, `/cipi/mcp`: health, logs, DB schema and capped queries, Artisan, deploy, cipi.yml validation; SQL and Artisan guards, secret redaction) and the server MCP of the API (`/mcp`). Plus a GDPR-safe database anonymizer.
- **Requirements.** Full VM or bare metal (KVM, VMware, Hyper-V, Xen HVM), Ubuntu 24.04 or 26.04 LTS, public IPv4, ports 22, 80, 443. Not for local Docker, WSL or LXC.

## Site

English only, unprefixed URLs. Web panel: https://cipi.sh/web-panel — REST API: https://cipi.sh/api — MCP for AI: https://cipi.sh/mcp — Docs: https://cipi.sh/docs/ — Guides: https://cipi.sh/guides/ (RSS: https://cipi.sh/guides/feed.xml) — Comparisons: https://cipi.sh/alternatives — cipi.yml: https://cipi.sh/cipi-yml — Source: https://github.com/cipi-sh — News: https://t.me/cipicloud

Full plain-text content: https://cipi.sh/llms-full.txt
"""


def md_clean(md: str) -> str:
    md = re.sub(r"^@section .*$", "", md, flags=re.M)
    md = re.sub(r"<cipi-(term|clips|panel)[^>]*></cipi-\1>", "", md)
    md = re.sub(r"\{#[^}]+\}", "", md)
    md = re.sub(r"<figure.*?</figure>", "", md, flags=re.S)
    md = re.sub(r'<div class="gui-shot-grid">\s*</div>', "", md)
    md = re.sub(r"<svg.*?</svg>", "", md, flags=re.S)
    md = re.sub(r"<[^>]+>", "", md)
    md = re.sub(r"\]\((/[^)]*)\)", lambda m: "](" + SITE + m.group(1) + ")", md)
    md = re.sub(r"\n{3,}", "\n\n", md)
    return md.strip()


def main() -> None:
    nav = json.loads(B.read(B.SRC, "docs", "nav.json"))
    idx = [INTRO, "## Documentation\n"]
    full = [INTRO, "\n---\n\n# Documentation\n"]
    for g in nav["groups"]:
        idx.append(f"\n### {g['title']}\n")
        for p in g["pages"]:
            idx.append(f"- [{p['title']}]({SITE}/docs/{p['slug']}): {p.get('desc', '')}")
            path = os.path.join(B.SRC, "docs", "pages", p["slug"] + ".md")
            if os.path.exists(path):
                full.append(f"\n## {p['title']}\n\nURL: {SITE}/docs/{p['slug']}\n\n{md_clean(B.read(path))}\n")
    guides = C.load_guides()
    idx.append("\n## Guides\n")
    full.append("\n---\n\n# Guides\n")
    for key, name, _ in C.GUIDE_CATS:
        items = [x for x in guides if x.get("category") == key]
        if not items:
            continue
        idx.append(f"\n### {name}\n")
        for x in items:
            idx.append(f"- [{x['title']}]({SITE}/guides/{x['slug']}): {x['description']}")
            full.append(f"\n## {x['title']}\n\nURL: {SITE}/guides/{x['slug']}\n\n{md_clean(x['md'])}\n")
    comps = C.load_compare()
    idx.append("\n## Comparisons\n")
    full.append("\n---\n\n# Comparisons\n")
    for x in comps:
        idx.append(f"- [{x['title']}]({SITE}{x['path']}): {x['description']}")
        full.append(f"\n## {x['title']}\n\nURL: {SITE}{x['path']}\n\n{md_clean(x['md'])}\n")
    meta, md = C.parse(os.path.join(B.SRC, "pages", "cipi-yml.md"))
    full.append(f"\n---\n\n# {meta['title']}\n\nURL: {SITE}/cipi-yml\n\n{md_clean(md)}\n")
    B.write(os.path.join(B.ROOT, "llms.txt"), "\n".join(idx) + "\n")
    B.write(os.path.join(B.ROOT, "llms-full.txt"), "\n".join(full) + "\n")
    print("llms: llms.txt, llms-full.txt")


if __name__ == "__main__":
    main()
