---
title: The Laravel ecosystem in 2026, mapped to production
description: Octane, Horizon, Reverb, Scout, Pulse, Livewire, Filament, Inertia, Pest and the rest, grouped by the job they do, with what each one needs from your server.
category: laravel
order: 10
published: 2026-01-20
updated: 2026-11-23
keywords: laravel ecosystem 2026, laravel octane horizon reverb, laravel tools list, laravel production stack
related:
  - laravel-developer-stack-2026
  - laravel-octane-frankenphp
  - laravel-reverb-websockets
docs:
  - how-cipi-works
  - services
faq:
  - Do I need all of these? | No. Most apps run fine with PHP-FPM, MariaDB, the database queue and the scheduler. Add pieces when a real need shows up.
  - Which of these does Cipi set up? | Octane, Horizon, Reverb, Meilisearch, Valkey, PostgreSQL, the scheduler and workers are one command each. UI and testing tools live in your code.
  - What if a step fails? | Check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community. Most commands print the fix when they refuse something.
  - Do I need the web panel for this? | No. Every step works from the CLI. The optional [web panel](/web-panel) shows the same things in a browser.
  - Can I run these commands from my laptop? | Many of them, through [cipi-cli](/docs/cli-client) and the [API](/api), with a scoped token. Otherwise `ssh cipi@your-server` and use `sudo cipi …`.
  - Will this affect other apps on the server? | No, unless the step says it's server-wide (installing a PHP version, firewall, Cloudflare tunnel). Each app has its own user, PHP pool, database and Valkey.
  - Why do commands start with `sudo cipi`? | You log in as the `cipi` admin user, which may run `cipi` with `sudo` without a password. Root login is disabled for safety.
---
Laravel is a framework plus a family of first-party and community tools. Choosing them is easy; running them in production is where projects stall. This map groups them by job and says what each needs from the server.

## Runtime

| Tool | Job | Needs on the server | On Cipi |
| --- | --- | --- | --- |
| PHP-FPM | Classic request handling | A pool per app | Default |
| [Octane](/guides/laravel-octane-frankenphp) (FrankenPHP) | App kept in memory, much faster responses | A long-running process, a proxy | `--octane` |
| [Horizon](/guides/laravel-horizon-queues) | Queues with a dashboard | Redis, a supervised process | `cipi worker horizon enable` |
| Queue workers | Background jobs | Supervisor | One per app by default |
| Scheduler | Cron-like tasks | One cron line | Built in |
| [Reverb](/guides/laravel-reverb-websockets) | WebSockets | A process, a WebSocket proxy, open-file limits | `cipi app reverb enable` |

## Data and search

| Tool | Job | On Cipi |
| --- | --- | --- |
| MariaDB / MySQL | Default relational store | Default |
| [PostgreSQL](/guides/laravel-postgresql) | JSONB, extensions, analytics | `cipi db install pgsql` |
| Valkey (Redis) | Cache, sessions, queues for Horizon | Included |
| [Scout + Meilisearch](/guides/laravel-scout-meilisearch) | Full-text search | `cipi search install` |

## UI

| Tool | Good for |
| --- | --- |
| Blade + Livewire | Full-stack reactive apps in PHP |
| Filament | Admin panels and back offices |
| Inertia (Vue, React, Svelte) | SPA feel with Laravel routing |
| Vite | Asset builds, run on deploy with `node_build` |

## Quality and observability

| Tool | Job |
| --- | --- |
| Pest / PHPUnit | Tests; run them in [CI before deploying](/guides/laravel-ci-cd-git-workflow) |
| Larastan, Pint, Rector | Static analysis, style, upgrades |
| Pulse | Performance overview inside the app |
| Telescope | Local and staging debugging (off in production) |
| Health checks | `/up` and the [agent's `/cipi/health`](/guides/cipi-agent-health-monitoring) |

## Hosting choices

You can rent all of this as a managed platform, rent a dashboard to manage your own VPS, or run it yourself for free. That trade-off is the subject of [our comparisons](/alternatives); the [developer stack guide](/guides/laravel-developer-stack-2026) does the cost math.

## Where to go next {#next}

| Need | Guide |
| --- | --- |
| Cache, sessions, queues on Valkey | [Valkey guide](/guides/laravel-valkey-cache-sessions) |
| Scheduled tasks | [Scheduler and cron](/guides/laravel-scheduler-cron) |
| Many customers on subdomains | [Multi-tenant SaaS](/guides/laravel-multi-tenant-wildcard) |
| Secrets and `.env` | [.env and secrets](/guides/laravel-env-secrets) |
