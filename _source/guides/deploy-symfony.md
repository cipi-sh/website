---
title: Deploy a Symfony app on an Ubuntu VPS with Cipi
description: Host Symfony as a custom app with the public/ document root, Composer and cache warm-up after each deploy, a database, Messenger workers via cron, HTTPS and backups.
category: php
order: 2
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: deploy symfony vps, symfony nginx php-fpm ubuntu, symfony hosting self-hosted, symfony git deploy
related:
  - php-ecommerce-vps
  - deploy-wordpress-custom-app
  - backup-vps-s3
---
Cipi is Laravel-first, but any PHP framework runs as a **custom app**: Nginx serves the document root you pick, PHP-FPM runs in the app's own pool, and Git deploys pull into `~/htdocs`. Here's a Symfony app end to end.

## 1. Create the app and the database

```bash
$ sudo cipi app create --custom --user=billing --domain=billing.example.com \
    --repository=git@github.com:acme/billing.git --branch=main --docroot=public --php=8.4
$ sudo cipi db create --name=billing                 # or --engine=pgsql
```

Add the deploy key from the summary to the repository (read-only).

## 2. Configure the environment

As the app user, create `~/htdocs/.env.local` (never committed):

```bash
APP_ENV=prod
APP_SECRET=change-me
DATABASE_URL="mysql://billing:PASSWORD@127.0.0.1:3306/billing?serverVersion=mariadb-11.4.0"
```

## 3. Build after every deploy

Custom apps pull the code; `cipi.yml` runs the build steps from the live folder:

```yaml
# cipi.yml
version: 1
deploy:
  post:
    - composer install --no-dev --optimize-autoloader --no-interaction
    - php bin/console doctrine:migrations:migrate --no-interaction
    - php bin/console cache:clear
  post_on_failure: abort
```

```bash
$ sudo cipi deploy billing
```

> [!note] Custom apps deploy in place (a pull into `htdocs`), not as atomic releases like Laravel apps. Keep migrations backward compatible and deploy at quiet times, or put the app behind [Cloudflare](/guides/cloudflare-zero-trust-laravel) with a maintenance page.

## 4. Messenger and scheduled tasks

As the app user (`crontab -e`):

```text
* * * * * php ~/htdocs/bin/console messenger:consume async --time-limit=55 --quiet
```

Each run consumes for 55 seconds and exits, so a deploy never leaves an old worker running for long.

## 5. HTTPS, backups, alerts

```bash
$ sudo cipi ssl install billing
$ sudo cipi backup profile add billing-nightly --scope=all --cron='0 2 * * *' --keep-days=14 --dest=s3 --encrypt
$ sudo cipi health set billing --url=https://billing.example.com/ --expect=200
```

Everything else (firewall, PHP patches, monitoring) is server-wide and already on.
