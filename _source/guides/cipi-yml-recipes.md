---
title: cipi.yml recipes for common Laravel setups
description: Copy-paste cipi.yml files for a SaaS with Horizon and Reverb, an API with Octane, a multi-tenant app on a wildcard domain, a site with redirects and a Next.js front end.
category: cipi-yml
order: 3
published: 2026-11-23
updated: 2026-11-23
keywords: cipi.yml examples, laravel server config examples, laravel horizon reverb config
related:
  - manage-apps-with-cipi-yml
  - cipi-yml-staging-production
  - laravel-octane-frankenphp
---
Start from the recipe closest to your app, run `php artisan cipi:yml validate`, commit, then `sudo cipi yml plan <app>` after the deploy. Every key is documented in the [reference](/docs/yml).

## SaaS: Horizon, Reverb, search, backups

```yaml
version: 1
app:
  php: "8.6"
  aliases: ["www.acme.app"]
  www: to-root
workers:
  horizon: true
  reverb: true
schedule: true
search: true
health:
  url: "https://acme.app/up"
  rollback_on_unhealthy: true
deploy:
  predeploy_snapshot: true
  node_build: "npm ci && npm run build"
  post:
    - artisan scout:sync-index-settings
env: { required: [STRIPE_KEY, STRIPE_SECRET, POSTMARK_TOKEN] }
backup:
  profiles:
    - { name: acme-db, scope: db, every: 30m, keep: 48, destinations: [local] }
    - { name: acme-nightly, scope: all, cron: "0 2 * * *", keep_days: 30, destinations: [s3], encrypt: true }
```

## API on Octane, extra database, queues

```yaml
version: 1
app:
  php: "8.6"
  limits: { octane_workers: 4 }
databases:
  - name: api_reporting
    engine: pgsql
workers:
  queues:
    - { queue: default, processes: 2 }
    - { queue: webhooks, processes: 4, tries: 10, timeout: 120 }
schedule: true
crons:
  - { every: 30m, run: artisan queue:prune-batches }
```

## Multi-tenant on a wildcard domain

```yaml
version: 1
app:
  aliases: ["*.acme.app"]
ssl: { force_https: true }
health:
  url: "https://www.acme.app/up"
```

Wildcard certificates use DNS-01: see [wildcard domains](/docs/wildcard-domains).

## Marketing site moved: redirects and a proxied blog

```yaml
version: 1
redirects:
  - { from: /pricing-old, to: /pricing }
  - { from: /docs/, to: "https://docs.acme.app/", code: 308 }
proxies:
  - { prefix: /blog/, upstream: "http://127.0.0.1:3000", strip_prefix: true }
```

## Next.js front end (Node app)

```yaml
version: 1
node:
  framework: next
  mode: ssr
  version: 24
deploy:
  branch: main
```

## Staging overrides

```yaml
# cipi-staging.yml
version: 1
app:
  basic_auth: { users: [preview] }
workers:
  queues: [{ queue: default, processes: 1 }]
deploy: { branch: develop, predeploy_snapshot: false }
```
