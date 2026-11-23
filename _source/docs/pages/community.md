@section companion-tools

## Companion tools {#companion}

Cipi deploys and runs your apps. Exception tracking, analytics or object storage are separate jobs, better done by separate tools. These projects cover the gaps around a Cipi server: same author, open source, all optional. Cipi depends on none of them.

### Around the server {#around-the-server}

| Tool | What it does | With Cipi |
| --- | --- | --- |
| [**conn**](https://conn.web.ap.it/) | SSH connection manager: save connections under aliases, connect with `conn to <alias>` | One alias for the `cipi` admin user and one per app user, instead of remembering hosts and ports |
| [**Johnny**](https://johnny.web.ap.it/) | S3-compatible object storage on your own VPS (Garage + Caddy), with a web panel, CLI and API | On a **separate** VPS, as the S3 destination for [`cipi backup`](/docs/backups) or a Laravel disk: off-site, still yours |

### Monitoring and analytics {#monitoring}

| Tool | What it does | With Cipi |
| --- | --- | --- |
| [**Boogle**](https://boogle.web.ap.it/) | Self-hosted exception tracker and uptime monitor for Laravel | [`cipi monitor`](/docs/monitor) watches the server, Boogle the application from outside. Error payloads stay on your infrastructure |
| [**IndieStats**](https://indiestats.web.ap.it/) | Privacy-friendly web analytics on Laravel: no cookies, no consent banner | Deploy it with `cipi app create` on a subdomain and track every site without sending visitor data anywhere |

### Application security {#security}

| Tool | What it does | With Cipi |
| --- | --- | --- |
| [**Checkpoint**](https://checkpoint.web.ap.it/) | Laravel security audit in one Artisan command: vulnerable dependencies, leaked secrets, injection risks | Cipi hardens the server, Checkpoint the code. Run it in CI before the deploy |
| [**Hackly**](https://hackly.web.ap.it/) | Authorized attack-surface and code scanning (Laravel/PHP SAST and SCA) with a Filament panel | A continuous vulnerability view across projects; runs on a Cipi server, pairs with [`cipi compliance`](/docs/compliance) |

### Building Laravel apps {#building}

| Tool | What it does | With Cipi |
| --- | --- | --- |
| [**init**](https://init.web.ap.it/) | One command for a complete local Laravel + Filament stack on macOS, with Docker, SSL and a real subdomain | Start locally, push to Git, and let Cipi take over: [Git setup](/docs/git), [`cipi.yml`](/docs/yml), zero-downtime deploys |
| [**Larapilot**](https://larapilot.web.ap.it/) | Spec-driven AI workflow for Laravel via Laravel Boost: from product idea to reviewed code | Larapilot shapes the code; the [agent's MCP server](/docs/mcp) and the [Cipi API](/docs/api) let the same AI see and operate the running app |
| [**Studio**](https://studio.web.ap.it/) | Self-hosted, browser-based hub for teams building Laravel: each person's Claude Code writes and ships code, admins decide per project who sees and approves what, with previews, Git repositories, connectors, passwords and backups | Runs on its own Ubuntu VPS. Studio is where the team writes and reviews code; Cipi is where it goes live |

@section telegram

## Telegram channel {#telegram}

<div class="tg-card"><div><strong>Cipi on Telegram</strong><p>Releases, security notes and new guides land there first. GitHub stays the place for issues and pull requests; the channel isn't a support inbox.</p></div><a class="btn btn-primary" href="https://t.me/cipicloud" target="_blank" rel="noopener">Join t.me/cipicloud</a></div>

## Contribute {#contribute}

| Where | For |
| --- | --- |
| [github.com/cipi-sh/cipi](https://github.com/cipi-sh/cipi) | Issues, pull requests, the changelog |
| [github.com/cipi-sh](https://github.com/cipi-sh) | Agent, API, panel, CLI client, SDK, WHMCS module, this website |
| [Telegram](https://t.me/cipicloud) | News and announcements |
