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
| PostgreSQL | JSONB, extensions, analytics | `cipi db install pgsql` |
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
