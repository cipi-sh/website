---
title: cipi.yml recipes for common Laravel setups
description: 18 copy-paste cipi.yml recipes, each with when to use it and what to change: a first app, SaaS with Horizon and Reverb, Octane API, online shop, multi-tenant, staging, redirects, Next.js, Nuxt, static sites, long jobs, AI apps, backups and tuning.
category: cipi-yml
order: 3
published: 2026-11-23
updated: 2026-11-23
keywords: cipi.yml examples, laravel server config examples, laravel horizon reverb config
related:
  - manage-apps-with-cipi-yml
  - cipi-yml-staging-production
  - laravel-octane-frankenphp
docs:
  - yml
  - agent-yml
faq:
  - Can I mix recipes? | Yes. Sections are independent: take `workers` from one and `backup` from another.
  - Will a recipe overwrite settings I made by hand? | Only for the sections it contains. Run `cipi yml plan` first: it lists every change.
  - Where do I put the passwords these setups need? | In the server's `.env` (`cipi app env --set`). `env.required` only lists the names so a missing one blocks the plan.
---
Start from the recipe closest to your app, run `php artisan cipi:yml validate`, commit, then `sudo cipi yml plan <app>` after the deploy. Every key is documented in the [reference](/docs/yml).

## All recipes {#all}

| Recipe | Use it for |
| --- | --- |
| [A first, simple Laravel app](#starter) | Your first `cipi. |
| [SaaS: Horizon, Reverb, search, backups](#saas) | A product with paying users: Horizon for queues, Reverb for live updates, Meilisearch for search, frequent database backups and automatic rollback if a release breaks. |
| [API on Octane with a reporting database](#api-octane) | A JSON API served by Octane, a separate PostgreSQL database for reports, a busy webhook queue and a cleanup task. |
| [Online shop: busy queues, big uploads, frequent backups](#shop) | A Laravel shop (Bagisto, Lunar or your own): order e-mails on their own queue, larger product image uploads, a database snapshot before every deploy and a backup every 30 minutes. |
| [Multi-tenant SaaS on a wildcard domain](#tenants) | Every customer on their own subdomain (`acme. |
| [Moving to a new domain](#move-domain) | You renamed the product. |
| [Marketing site: redirects and a proxied blog](#marketing) | Old URLs redirected after a redesign, docs moved to their own subdomain, and a blog served from another local service under `/blog/`. |
| [Staging next to production](#staging) | The staging app reads `cipi-staging. |
| [Internal tool behind a password](#private) | A back-office tool only your team should reach, with HTTPS forced and two named users. |
| [Next.js front end (SSR)](#nextjs) | A server-rendered Next. |
| [Nuxt front end (SSR) with a health path](#nuxt) | Nuxt in SSR mode, started from its build output, with a health path checked before traffic switches. |
| [Static site or SPA (Vite, Astro)](#static) | A built site served by Nginx, with no Node process running in production. |
| [Long-running jobs (imports, exports, video)](#heavy-jobs) | Exports and imports that run for minutes on their own queue, so they never delay e-mails. |
| [AI app with embeddings on PostgreSQL](#ai-app) | An app that embeds documents in the background and stores vectors in a PostgreSQL database. |
| [Custom steps after every deploy](#deploy-steps) | Commands to run after each successful deploy, plus extra Artisan caches during the build. |
| [Extra scheduled commands without touching code](#crons) | Commands on a timer, declared in the file instead of `routes/console. |
| [Backups for a database that grows](#backups-pro) | Frequent database backups that skip noisy tables, plus weekly full backups kept for months. |
| [A busy PHP-FPM app, tuned](#tuned) | More PHP processes and memory for an app with a lot of traffic. |

## How to use a recipe {#how}

```flow
Copy | into cipi.yml at the repo root
> Pick the recipe closest to your app and paste it into `cipi.yml` at the root of the repository.
Adapt | names, domains, sizes
> Replace `shop` with your app's name everywhere, and adjust domains, process counts and schedules.
Validate | php artisan cipi:yml validate
> Run `php artisan cipi:yml validate` (Cipi Agent) locally or in CI. It uses the same rules as the server.
Deploy | the release carries the file
> Commit and deploy. The file travels inside the release.
Plan, apply | cipi yml plan / apply
> On the server, `cipi yml plan shop` shows the changes; `cipi yml apply shop` makes them, all or nothing.
```

Names inside the file (databases, backup profiles) must start with the app's name, so replace `shop` with yours. New to the file? Start with [the cipi.yml guide](/guides/manage-apps-with-cipi-yml).

<div class="rc-search" data-recipe-search>
<label for="rc-q">Find a recipe</label>
<input id="rc-q" type="search" placeholder="Try: horizon, staging, redirect, static, backups…" autocomplete="off">
<p class="rc-count" aria-live="polite"></p>
</div>

<div class="recipe" data-tags="starter small blog basic beginner">

## A first, simple Laravel app {#starter}

**When to use it.** Your first `cipi.yml`: one queue worker, the scheduler, a health check and nightly backups. Good for a blog, a small business site or an internal tool.

```yaml
version: 1
app:
  php: "8.6"
workers:
  queues:
    - { queue: default, processes: 1 }
schedule: true
health:
  url: "https://shop.example.com/up"
backup:
  profiles:
    - { name: shop-nightly, scope: all, cron: "0 2 * * *", keep_days: 14, destinations: [local] }
```

- `health.url` must be one of the app's own domains. Laravel 11+ answers `/up` out of the box.
- `destinations: [local]` keeps backups on the server; add `s3` once you have a bucket ([backups](/guides/backup-vps-s3)).

</div>

<div class="recipe" data-tags="saas horizon reverb websockets meilisearch scout backups">

## SaaS: Horizon, Reverb, search, backups {#saas}

**When to use it.** A product with paying users: Horizon for queues, Reverb for live updates, Meilisearch for search, frequent database backups and automatic rollback if a release breaks.

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

- The app is called `acme`, so backup profiles are `acme-…`.
- `search: true` needs `sudo cipi search install` once on the server.
- Horizon needs `laravel/horizon` in the app and `QUEUE_CONNECTION=redis` ([guide](/guides/laravel-horizon-queues)).

</div>

<div class="recipe" data-tags="api octane frankenphp postgres webhooks queues">

## API on Octane with a reporting database {#api-octane}

**When to use it.** A JSON API served by Octane, a separate PostgreSQL database for reports, a busy webhook queue and a cleanup task.

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

- The app itself must be created with `--octane`; the file sets how many Octane workers it runs.
- `engine: pgsql` needs `sudo cipi db install pgsql` first ([guide](/guides/laravel-postgresql)). Credentials go to `shared/cipi-databases.env`.

</div>

<div class="recipe" data-tags="ecommerce shop store bagisto lunar uploads orders backups">

## Online shop: busy queues, big uploads, frequent backups {#shop}

**When to use it.** A Laravel shop (Bagisto, Lunar or your own): order e-mails on their own queue, larger product image uploads, a database snapshot before every deploy and a backup every 30 minutes.

```yaml
version: 1
app:
  php: "8.6"
  ini: { upload_max_filesize: 32M, post_max_size: 40M, memory_limit: 512M }
workers:
  queues:
    - { queue: default, processes: 2 }
    - { queue: orders, processes: 2, tries: 5, timeout: 300 }
    - { queue: mail, processes: 1, tries: 5 }
schedule: true
health:
  url: "https://shop.example.com/up"
  rollback_on_unhealthy: true
deploy:
  predeploy_snapshot: true
  node_build: "npm ci && npm run build"
backup:
  profiles:
    - { name: shop-db, scope: db, every: 30m, keep: 48, destinations: [local, s3], encrypt: true }
    - { name: shop-nightly, scope: all, cron: "0 3 * * *", keep_days: 30, destinations: [s3], encrypt: true }
```

- With a 30-minute database backup, the most orders you can lose is half an hour's worth.
- More in [self-host PHP e-commerce](/guides/php-ecommerce-vps).

</div>

<div class="recipe" data-tags="multi-tenant wildcard subdomains saas tenants">

## Multi-tenant SaaS on a wildcard domain {#tenants}

**When to use it.** Every customer on their own subdomain (`acme.yourapp.com`), one app, one certificate.

```yaml
version: 1
app:
  aliases: ["*.yourapp.com"]          # covers www and every tenant
ssl: { force_https: true }
health:
  url: "https://www.yourapp.com/up"
```

- The wildcard certificate is issued over DNS: run `sudo cipi ssl install saas --dns=cloudflare` once ([multi-tenant guide](/guides/laravel-multi-tenant-wildcard)).
- `app.aliases` replaces the whole list: write every alias you want to keep.

</div>

<div class="recipe" data-tags="redirect domain rename rebrand seo 301">

## Moving to a new domain {#move-domain}

**When to use it.** You renamed the product. The old app keeps its domain only to send visitors (and search engines) to the new one, keeping the path.

```yaml
version: 1
redirect: { to: "https://newbrand.com", code: 301, keep_path: true }
```

- `keep_path: true` sends `/pricing` to `https://newbrand.com/pricing`, which keeps your SEO.
- Use 301 for a permanent move.

</div>

<div class="recipe" data-tags="redirects proxy blog seo marketing">

## Marketing site: redirects and a proxied blog {#marketing}

**When to use it.** Old URLs redirected after a redesign, docs moved to their own subdomain, and a blog served from another local service under `/blog/`.

```yaml
version: 1
redirects:
  - { from: /pricing-old, to: /pricing }
  - { from: /docs/, to: "https://docs.acme.app/", code: 308 }
proxies:
  - { prefix: /blog/, upstream: "http://127.0.0.1:3000", strip_prefix: true }
```

- Proxies to Cipi's own ports, link-local or cloud metadata addresses are refused on purpose.

</div>

<div class="recipe" data-tags="staging environment develop password preview">

## Staging next to production {#staging}

**When to use it.** The staging app reads `cipi-staging.yml` instead of `cipi.yml`: fewer workers, a password, the `develop` branch.

```yaml
# cipi-staging.yml
version: 1
app:
  basic_auth: { users: [preview] }
workers:
  queues: [{ queue: default, processes: 1 }]
deploy: { branch: develop, predeploy_snapshot: false }
```

- The staging app must be created (or cloned) with `--env=staging`.
- Step by step: [staging and production](/guides/cipi-yml-staging-production).

</div>

<div class="recipe" data-tags="internal admin tool password basic auth private">

## Internal tool behind a password {#private}

**When to use it.** A back-office tool only your team should reach, with HTTPS forced and two named users.

```yaml
version: 1
app:
  basic_auth:
    users:
      - admin
      - { name: ops, password_hash: "$2y$12$replace.with.a.real.bcrypt.hash" }
ssl: { force_https: true }
```

- `admin` keeps the password already set on the server; `ops` uses a bcrypt hash. Never write plain passwords in the file.
- Create a hash with `htpasswd -nbB ops 'your-password'`.

</div>

<div class="recipe" data-tags="node nextjs react ssr frontend">

## Next.js front end (SSR) {#nextjs}

**When to use it.** A server-rendered Next.js app as a Node app, on Node 24.

```yaml
version: 1
node:
  framework: next
  mode: ssr
  version: 24
deploy:
  branch: main
```

- The `node:` section is applied by the deploy itself and needs `sudo cipi yml auto web on`.

</div>

<div class="recipe" data-tags="node nuxt vue ssr frontend">

## Nuxt front end (SSR) with a health path {#nuxt}

**When to use it.** Nuxt in SSR mode, started from its build output, with a health path checked before traffic switches.

```yaml
version: 1
node:
  framework: nuxt
  mode: ssr
  version: 24
  start: node .output/server/index.mjs
  health_path: /health
```

- The new release must answer the health path before Nginx switches to it.

</div>

<div class="recipe" data-tags="node static spa vite astro docs frontend">

## Static site or SPA (Vite, Astro) {#static}

**When to use it.** A built site served by Nginx, with no Node process running in production.

```yaml
version: 1
node:
  framework: vite
  mode: static
  output: dist
```

- The deploy fails if `dist/` has no `index.html`, so a broken build never goes live.

</div>

<div class="recipe" data-tags="queues long jobs import export video ffmpeg timeout">

## Long-running jobs (imports, exports, video) {#heavy-jobs}

**When to use it.** Exports and imports that run for minutes on their own queue, so they never delay e-mails.

```yaml
version: 1
workers:
  queues:
    - { queue: default, processes: 2 }
    - { queue: exports, processes: 1, tries: 1, timeout: 7200 }
```

- Also set `public $timeout` on the job class, and `retry_after` above it in `config/queue.php` ([why](/guides/laravel-horizon-queues#timeouts)).
- Video work needs `sudo cipi package install ffmpeg` once.

</div>

<div class="recipe" data-tags="ai embeddings pgvector postgres llm queues">

## AI app with embeddings on PostgreSQL {#ai-app}

**When to use it.** An app that embeds documents in the background and stores vectors in a PostgreSQL database.

```yaml
version: 1
databases:
  - name: rag_vectors
    engine: pgsql
workers:
  queues:
    - { queue: default, processes: 2 }
    - { queue: embeddings, processes: 3, tries: 5, timeout: 600 }
env: { required: [OPENAI_API_KEY] }
```

- The app is called `rag`. pgvector must be created once by the database superuser ([PostgreSQL guide](/guides/laravel-postgresql#extensions)).

</div>

<div class="recipe" data-tags="deploy post steps artisan cache warm">

## Custom steps after every deploy {#deploy-steps}

**When to use it.** Commands to run after each successful deploy, plus extra Artisan caches during the build.

```yaml
version: 1
deploy:
  keep_releases: 10
  extra_artisan: [event:cache, icons:cache]
  post:
    - artisan scout:sync-index-settings
    - node scripts/warm-cache.mjs
  post_on_failure: warn
```

- Only allowlisted runners are accepted (`artisan`, `composer`, `npm`, `npx`, `yarn`, `pnpm`, `php`/`node` with a script in the release). No shells, no pipes.
- `post_on_failure: abort` makes the deploy fail if a step fails.

</div>

<div class="recipe" data-tags="cron schedule tasks prune">

## Extra scheduled commands without touching code {#crons}

**When to use it.** Commands on a timer, declared in the file instead of `routes/console.php`.

```yaml
version: 1
crons:
  - { every: 30m, run: artisan queue:prune-batches }
  - { cron: "15 4 * * *", run: artisan model:prune }
```

- Up to 20 entries. Your own crontab lines are left untouched. Most apps should prefer Laravel's scheduler ([guide](/guides/laravel-scheduler-cron)).

</div>

<div class="recipe" data-tags="backups large database exclude tables retention">

## Backups for a database that grows {#backups-pro}

**When to use it.** Frequent database backups that skip noisy tables, plus weekly full backups kept for months.

```yaml
version: 1
backup:
  profiles:
    - { name: shop-db, scope: db, every: 1h, keep: 72, exclude_tables: ["*.telescope_*", "*.jobs"], destinations: [s3], encrypt: true }
    - { name: shop-weekly, scope: all, cron: "0 4 * * 0", keep_weeks: 12, destinations: [s3], encrypt: true }
```

- `exclude_tables` keeps debug and queue tables out of the archive.
- Restore and verify: [backups to S3](/guides/backup-vps-s3).

</div>

<div class="recipe" data-tags="performance fpm memory limits tuning">

## A busy PHP-FPM app, tuned {#tuned}

**When to use it.** More PHP processes and memory for an app with a lot of traffic.

```yaml
version: 1
app:
  ini: { memory_limit: 512M, max_execution_time: 60 }
  limits: { fpm_max_children: 30, worker_procs: 6 }
```

- Bounds are enforced: `fpm_max_children` 1–50, `worker_procs` 1–20, `octane_workers` 1–16. Out-of-range values block the plan.
- Each PHP process can use up to `memory_limit`: 30 × 512M must fit in RAM.

</div>

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `search: true` blocked | Meilisearch isn't installed on the server: `sudo cipi search install` |
| Wildcard alias works, HTTPS doesn't | The wildcard certificate needs DNS-01: [wildcard guide](/guides/laravel-multi-tenant-wildcard) |
| `horizon: true` and queues both set | Horizon replaces the queues: keep one |
| Engine `pgsql` blocked | PostgreSQL isn't installed: `sudo cipi db install pgsql` ([guide](/guides/laravel-postgresql)) |
