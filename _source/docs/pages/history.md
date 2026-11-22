@section history

Cipi was created by [Andrea Pollastri](https://web.ap.it), a developer since 2005 working on Laravel, system administration and security, with experience at companies like Docebo and Musement. He built it out of a practical need: a fast, scriptable way to put Laravel apps on his own VPS without handing control to a SaaS panel. The private tool became an open-source project with over 1,000 GitHub stars and servers running it around the world.

Seven years, five major versions, one idea that never changed: **your server, your apps, no bill for the tool.**

<div class="timeline">
<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-body"><span class="timeline-version">v0.1</span><span class="timeline-date">June 2019</span><h3 class="timeline-title">The idea</h3><p>A handful of shell scripts that set up Nginx, PHP, MariaDB and Supervisor on a fresh Ubuntu VPS. No UI, no package. Just bash.</p></div></div>
<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-body"><span class="timeline-version">v1–v2</span><span class="timeline-date">2019–2020</span><h3 class="timeline-title">A Laravel control panel</h3><p>The scripts were wrapped in a Laravel web panel hosted on the same server: create apps, deploy, configure Nginx from the browser. A year of iteration added SMTP, database backups, service management and dozens of fixes, and Cipi became a stable choice for small-team Laravel hosting.</p></div></div>
<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-body"><span class="timeline-version">v3</span><span class="timeline-date">2021</span><h3 class="timeline-title">API, PHP 8, real-time UI</h3><p>Rebuilt on Laravel 8 with a documented REST API, PHP 8, live CPU and RAM charts, a cron editor, Supervisor and GitHub management. The 3.1 series was the most polished release of the web-UI era, and many teams ran it for years. It also raised the question that shaped what followed: was a browser panel still the right interface, when deploys were moving to SSH, CI pipelines and automation?</p></div></div>
<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-body"><span class="timeline-version">v4</span><span class="timeline-date">2026</span><h3 class="timeline-title">The rewrite: CLI-first, Laravel-first</h3><p>The web UI was dropped and Cipi became a CLI operated over SSH, with every part of the stack tuned for Laravel. MariaDB replaced MySQL, Deployer brought zero-downtime releases, each app got its own Linux user and deploy key, and GitHub and GitLab webhooks, S3 backups, encrypted server sync, a REST API and MCP servers for AI agents arrived. Late v4 added optional PostgreSQL and the return of a web panel, this time as an optional add-on.</p></div></div>
<div class="timeline-item timeline-item--current"><div class="timeline-marker"></div><div class="timeline-body"><span class="timeline-version">v5</span><span class="timeline-date">2026, today</span><h3 class="timeline-title">A complete, free platform on your own server</h3><p>v5 turned the CLI into a full replacement for paid server panels, without giving up what made it simple. One command installs a hardened server; apps are isolated cells with their own user, PHP pool, database and certificate; deploys are atomic, audited and rolled back in one step.</p></div></div>
</div>

## Cipi today {#today}

| Area | What you get |
| --- | --- |
| Apps | Laravel on PHP-FPM or Octane (FrankenPHP), Node apps (SPA, static, SSR), and custom PHP apps such as WordPress or Symfony |
| Deploy | Zero-downtime releases, Git push from six forges, preview environments, a hash-chained audit trail, health-checked rollbacks |
| `cipi.yml` | The app's server settings versioned in its repository: PHP, workers, schedule, domains, databases, backups, per environment |
| Runtime | Multiple PHP versions side by side, MariaDB and PostgreSQL, Valkey, Meilisearch, Horizon and Reverb |
| Operations | Backup profiles to S3 with verification, server monitor, health checks, disk usage, alerts by e-mail, Slack, Telegram and webhooks |
| Security | Per-app isolation, encrypted vault, firewall and CrowdSec, Cloudflare Zero Trust, malware scans, automatic PHP and Nginx security updates |
| Interfaces | The CLI, an optional web panel with roles and SSO, a REST API, cipi-cli, a PHP SDK, WHMCS and MCP servers for AI assistants |

Every version is listed in the [changelog](https://github.com/cipi-sh/cipi/blob/master/CHANGELOG.md). Announcements go out first on the [Telegram channel](https://t.me/cipicloud).
