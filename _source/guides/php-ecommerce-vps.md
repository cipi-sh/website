---
title: Self-host PHP e-commerce on a VPS: Bagisto, Lunar, Sylius, PrestaShop and more
description: A practical map of open-source PHP shop platforms and how to run each on your own server with Cipi, explained for beginners, with full setups for a Laravel-based shop (Bagisto) and a Symfony-based one (Sylius), plus what every shop needs.
category: php
order: 4
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: prestashop vps, sylius hosting, bagisto hosting, lunar php hosting, php ecommerce self-hosted, magento server requirements
docs:
  - create-app
  - custom-apps
  - yml
  - workers
  - search
  - backups
related:
  - woocommerce-vps
  - deploy-symfony
  - laravel-scout-meilisearch
faq:
  - Which platform should I pick? | If your team knows Laravel, Bagisto (a full shop) or Lunar (a headless toolkit) run with every Cipi feature. If you know Symfony, Sylius. If you want a shop non-developers can run with many ready-made modules, PrestaShop or WooCommerce.
  - Why does it matter if a shop is built on Laravel? | Laravel apps get atomic releases, rollback, queue workers, the scheduler and `cipi.yml` on Cipi. Other PHP apps run as custom apps: they deploy in place and you schedule their background tasks with cron.
  - Can I run Magento on Cipi? | Magento 2 requires OpenSearch (or Elasticsearch) and benefits from Varnish, which Cipi doesn't install. You can run Magento's PHP part as a custom app and host OpenSearch on another server, but a dedicated Magento host is usually simpler.
  - Do I need Redis? | Not to start. Laravel shops on Cipi already have a Valkey (Redis-compatible) instance for cache, sessions and queues. Symfony and PrestaShop can use it too through their Redis cache adapters.
  - How do I handle product search? | Laravel shops can use Scout with the Meilisearch instance Cipi installs on the server. Sylius has plugins for Elasticsearch-compatible engines; small catalogues are fine with database search.
  - What PHP version? | Each platform documents the versions it supports. Cipi runs 8.3 to 8.6 side by side, so each shop can use the version it needs.
  - How do I avoid losing orders? | Back up the database every 30 minutes locally and everything nightly to S3, verify backups, and take a database snapshot before every deploy that migrates.
---
PHP runs a large share of the world's online shops. There's no single "right" platform: some are full shops you configure from an admin panel, others are toolkits developers build on. This guide explains the options and shows how to run each on your own server with Cipi, starting from zero.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Laravel app** on Cipi | Deploys as atomic releases with zero downtime and rollback; gets queue workers, the scheduler and `cipi.yml` |
| **Custom app** on Cipi | Any other PHP software: code in `~/htdocs`, deployed from Git (in place) or by SFTP |
| **Document root** | The folder the web server exposes: `public/` for Laravel and Symfony, `pub/` for Magento, the root for PrestaShop |
| **Queue / workers** | Background processes for e-mails, payments callbacks, imports |
| **Headless** | A shop engine with an API; you build the storefront separately (for example with Next.js or Nuxt) |

## Which platform runs how {#map}

| Platform | Built on | Runs on Cipi as | Document root | Background tasks | Search |
| --- | --- | --- | --- | --- | --- |
| **Bagisto** | Laravel | Laravel app | managed | Workers + scheduler, built in | Database or Meilisearch |
| **Lunar** | Laravel (package) | Laravel app | managed | Workers + scheduler | Scout + Meilisearch |
| **Aimeos** | Laravel (package) | Laravel app | managed | Workers + scheduler | Database |
| **Sylius** | Symfony | Custom app | `public` | Messenger via cron | Plugins |
| **PrestaShop** | Symfony + legacy | Custom app | root | Module crons | Built in |
| **WooCommerce** | WordPress | Custom app | root | Real cron ([guide](/guides/woocommerce-vps)) | Built in |
| **Magento 2** | Laminas/Symfony | Possible as custom app | `pub` | Cron | Needs OpenSearch, hosted elsewhere |

```flow
Laravel-based? | yes → Laravel app, full automation
> Bagisto, Lunar, Aimeos: create them as Laravel apps and get workers, scheduler, atomic deploys and `cipi.yml`.
Symfony or other PHP? | custom app + cipi.yml post-deploy steps
> Sylius, PrestaShop or other PHP: create a custom app; add the build steps in `deploy.post` of `cipi.yml`.
Needs OpenSearch/Varnish? | host those services separately
> Platforms that require OpenSearch or Varnish (e.g. Magento) need those services elsewhere: Cipi doesn't install them.
```

## Example 1: Bagisto, a Laravel shop {#bagisto}

Because Bagisto is a Laravel app, it gets everything: zero-downtime deploys, queue workers, the scheduler and Meilisearch.

**1. Create the project** (on your laptop), commit it to Git:

```bash
$ composer create-project bagisto/bagisto store
$ cd store && git init && git add . && git commit -m "Bagisto" && git push
```

**2. Create the app and deploy** (on the server):

```bash
$ sudo cipi app create --user=store --domain=store.example.com \
    --repository=git@github.com:acme/store.git --branch=main --php=8.4
$ sudo cipi deploy store
$ sudo cipi ssl install store
```

Cipi writes the `.env` with database credentials, creates the database, a queue worker and the scheduler cron. Run Bagisto's installer once:

```bash
$ sudo cipi app artisan store bagisto:install
```

**3. Describe the shop in `cipi.yml`** and commit it:

```yaml
version: 1
app:
  php: "8.4"
  aliases: ["www.store.example.com"]
  www: to-root
  ini: { memory_limit: 512M, upload_max_filesize: 64M, post_max_size: 64M }
workers:
  queues:
    - { queue: default, processes: 2 }
schedule: true
health:
  url: "https://store.example.com/"
  rollback_on_unhealthy: true
deploy:
  predeploy_snapshot: true
  node_build: "npm ci && npm run build"
backup:
  profiles:
    - { name: store-db, scope: db, every: 30m, keep: 48, destinations: [local] }
    - { name: store-nightly, scope: all, cron: "0 3 * * *", keep_days: 30, destinations: [s3], encrypt: true }
```

```bash
$ sudo cipi deploy store && sudo cipi yml plan store && sudo cipi yml apply store
```

From now on, every push deploys with a database snapshot first, and rolls back by itself if the shop stops answering.

## Example 2: Sylius, a Symfony shop {#sylius}

Sylius is Symfony, so it runs as a **custom app** with `public/` as document root. Build steps run after each pull through `cipi.yml`.

**1. Create the app and the database:**

```bash
$ sudo cipi app create --custom --user=sylius --domain=shop.example.com \
    --repository=git@github.com:acme/sylius-shop.git --branch=main --docroot=public --php=8.4
$ sudo cipi db create --name=sylius --app=sylius
$ sudo cipi ssl install sylius
```

**2. Configure the environment** as the app user, in `~/htdocs/.env.local` (never committed):

```bash
APP_ENV=prod
APP_SECRET=change-me-to-a-random-string
DATABASE_URL="mysql://sylius:PASSWORD@127.0.0.1:3306/sylius?serverVersion=mariadb-11.4.0"
MESSENGER_TRANSPORT_DSN=doctrine://default
```

**3. Build steps after each deploy** in `htdocs/cipi.yml`:

```yaml
version: 1
deploy:
  post:
    - composer install --no-dev --optimize-autoloader --no-interaction
    - php bin/console doctrine:migrations:migrate --no-interaction
    - php bin/console sylius:install:assets
    - php bin/console cache:clear
  post_on_failure: abort
```

```bash
$ sudo cipi deploy sylius
```

**4. Background messages:** as the app user (`crontab -e`):

```text
* * * * * php ~/htdocs/bin/console messenger:consume async --time-limit=55 --quiet
```

> [!note] Custom apps deploy in place (a `git pull` into `htdocs`), not as atomic releases. Keep migrations backward compatible and deploy at quiet times. Full Symfony walkthrough: [Deploy Symfony](/guides/deploy-symfony).

## Example 3: PrestaShop {#prestashop}

```bash
$ sudo cipi app create --custom --user=presta --domain=presta.example.com --php=8.3
$ sudo cipi db create --name=presta --app=presta
$ sudo cipi ssl install presta
```

Upload the PrestaShop release to `~/htdocs` by SFTP, open the domain and run the installer (database host `127.0.0.1`). Delete the `install` folder afterwards and rename the `admin` folder as the installer asks. Add the cron URLs of the modules you use to the app user's crontab.

## What every shop needs {#essentials}

| Need | How |
| --- | --- |
| HTTPS, forced | `sudo cipi ssl install <app> && sudo cipi ssl force <app>` |
| Database every 30 minutes | `--every=30m --keep=48` profile, local |
| Everything nightly, off-site | `--cron='0 3 * * *' --dest=s3 --encrypt` profile ([guide](/guides/backup-vps-s3)) |
| Verified backups | `sudo cipi backup verify` (alerts on failure) |
| Enough PHP workers | `sudo cipi app limits <app> --fpm-max-children=12` |
| A staging copy | Laravel shops: `sudo cipi app clone`; others: a second custom app with a restored dump |
| Alerts | [Telegram, Slack or e-mail](/guides/notifications-alerts) |
| Transactional e-mail | An SMTP or API provider, never direct from the VPS |

## Troubleshooting {#troubleshooting}

| Symptom | Fix |
| --- | --- |
| 404 on every page but the home (Symfony, PrestaShop) | Wrong document root: recreate with `--docroot=public`, or check the platform's Nginx rules |
| 500 after deploy (custom app) | Read `sudo cipi app logs <app> --type=php`; a `deploy.post` step may have failed |
| Assets missing after deploy | Run the asset build in `deploy.post` (Symfony) or `node_build` (Laravel) |
| Slow admin | Raise `memory_limit` and `fpm_max_children`; check slow queries |
