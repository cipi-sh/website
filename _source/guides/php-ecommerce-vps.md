---
title: Self-host PHP e-commerce (PrestaShop, Sylius, Bagisto and more) on a VPS
description: What each PHP shop platform needs from a server, which ones fit a Cipi VPS as they are, and how to set up the document root, database, cron, HTTPS and backups.
category: php
order: 4
published: 2026-11-23
updated: 2026-11-23
keywords: prestashop vps, sylius hosting, bagisto hosting, php ecommerce self-hosted, magento server requirements
related:
  - woocommerce-vps
  - deploy-symfony
  - deploy-laravel-ubuntu-vps
---
PHP runs a large part of online commerce. Here's how the main open-source platforms map onto a Cipi server: Laravel-based ones run as Laravel apps with zero-downtime deploys, the rest as custom apps.

| Platform | Built on | Run on Cipi as | Document root | Extra services |
| --- | --- | --- | --- | --- |
| **Bagisto** | Laravel | Laravel app | (managed) | Queue, scheduler: built in |
| **Lunar** | Laravel package | Laravel app | (managed) | Search via [Meilisearch](/guides/laravel-scout-meilisearch) |
| **Aimeos** | Laravel package | Laravel app | (managed) | Queue, scheduler |
| **Sylius** | Symfony | Custom app | `public` | Messenger via cron ([Symfony guide](/guides/deploy-symfony)) |
| **PrestaShop** | Symfony + legacy | Custom app | root | Cron for modules |
| **WooCommerce** | WordPress | Custom app | root | [Real cron](/guides/woocommerce-vps) |
| **Magento / Adobe Commerce** | Laminas/Symfony | Possible as custom app | `pub` | Needs OpenSearch, which Cipi doesn't install: host it elsewhere |

## Laravel-based shops (Bagisto, Lunar, Aimeos)

They get everything Laravel apps get: atomic releases, workers, scheduler, `cipi.yml`, health checks with rollback.

```bash
$ sudo cipi app create --user=store --domain=store.example.com \
    --repository=git@github.com:acme/store.git --php=8.4
$ sudo cipi deploy store && sudo cipi ssl install store
```

## Custom-app shops (PrestaShop, Sylius)

```bash
$ sudo cipi app create --custom --user=store --domain=store.example.com --docroot=public   # Sylius
$ sudo cipi db create --name=store
```

Then follow the platform's installer. Build steps after each Git deploy go in `cipi.yml` `deploy.post` (Composer, migrations, cache), as in the [Symfony guide](/guides/deploy-symfony).

## What every shop should set

| Need | Command |
| --- | --- |
| HTTPS, forced | `sudo cipi ssl install store && sudo cipi ssl force store` |
| Frequent database backups | A `--every=30m` profile plus a nightly encrypted one to S3 ([guide](/guides/backup-vps-s3)) |
| PHP limits | `app.ini` in `cipi.yml`: `memory_limit`, `max_execution_time`, upload sizes |
| Enough PHP workers | `sudo cipi app limits store --fpm-max-children=12` |
| A staging copy | Laravel shops: `sudo cipi app clone store --name=store-stg --domain=… --env=staging`; others: a second custom app with a restored dump |
| Alerts | [Telegram, Slack or e-mail](/guides/server-monitoring-alerts) |

> [!note] Check each platform's PHP version support before you pick a version per app. Cipi runs several PHP versions side by side, so a shop on PHP 8.3 and another on 8.5 can share a server.
