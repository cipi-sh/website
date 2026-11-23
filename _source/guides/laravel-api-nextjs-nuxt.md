---
title: A Laravel API with a Next.js or Nuxt front end on one server
description: Run a Laravel API and a server-rendered Next.js or Nuxt front end side by side, each with its own domain, zero-downtime deploys and HTTPS, plus Sanctum for authentication.
category: laravel
order: 9
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel api nextjs same server, laravel nuxt deploy, next.js self-hosted vps, laravel sanctum spa
related:
  - laravel-octane-frankenphp
  - deploy-laravel-ubuntu-vps
  - cipi-yml-recipes
---
Two apps, one server: `api.acme.app` (Laravel) and `acme.app` (Next.js or Nuxt in SSR mode). Both deploy from Git with zero downtime; the Node app restarts blue/green.

```stack
acme.app | Node app, SSR, blue/green restarts
api.acme.app | Laravel app, FPM or Octane
Server | one Cipi install
```

## 1. The API

```bash
$ sudo cipi app create --user=api --domain=api.acme.app \
    --repository=git@github.com:acme/api.git --php=8.6
$ sudo cipi deploy api && sudo cipi ssl install api
```

For cookie-based auth from the front end, configure Sanctum: `SANCTUM_STATEFUL_DOMAINS=acme.app`, `SESSION_DOMAIN=.acme.app`, and CORS for `https://acme.app`:

```bash
$ sudo cipi app env api --set=SANCTUM_STATEFUL_DOMAINS=acme.app
$ sudo cipi app env api --set=SESSION_DOMAIN=.acme.app
```

## 2. The front end

```bash
$ sudo cipi app create --user=web --domain=acme.app \
    --repository=git@github.com:acme/web.git --node=ssr --framework=next --node-version=24
$ sudo cipi deploy web && sudo cipi ssl install web
```

Use `--framework=nuxt` for Nuxt. Each deploy installs from your lockfile, builds, starts the new process, checks the health path and only then switches traffic.

| Mode | For |
| --- | --- |
| `ssr` | Next.js, Nuxt, SvelteKit, Remix, Astro SSR |
| `static` | Pre-rendered sites (Astro, `nuxt generate`) |
| `spa` | Vite single-page apps |

## 3. Point the front end at the API

Build-time variables go in the Node app's `shared/.env`, read at build:

```bash
$ sudo cipi app env web --set=NEXT_PUBLIC_API_URL=https://api.acme.app
$ sudo cipi deploy web
```

## 4. Keep both in their repositories

Each repository can carry its own `cipi.yml`: workers, schedule and health for the API, `node:` settings for the front end. Examples in [cipi.yml recipes](/guides/cipi-yml-recipes).
