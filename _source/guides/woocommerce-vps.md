---
title: WooCommerce on your own VPS: fast, isolated and backed up
description: Host a WooCommerce shop on an Ubuntu VPS with an isolated PHP pool, tuned PHP limits, real cron, HTTPS, frequent database backups and a staging copy.
category: php
order: 3
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: woocommerce vps hosting, woocommerce nginx php-fpm, woocommerce performance server, self-hosted woocommerce
related:
  - deploy-wordpress-custom-app
  - php-ecommerce-vps
  - backup-vps-s3
---
A shop has stricter needs than a blog: orders arrive all day, so backups must be frequent, cron must be real, and updates must be tried somewhere safe first. Start from [WordPress on a VPS](/guides/deploy-wordpress-custom-app), then add the steps below.

## 1. Size the server

| Shop | Starting point |
| --- | --- |
| Small catalogue, few orders a day | 2 GB RAM |
| Thousands of products, steady traffic | 4 GB+ RAM, more PHP workers |

```bash
$ sudo cipi app limits shop --fpm-max-children=12
```

## 2. PHP limits for imports and big carts

```yaml
# cipi.yml in htdocs
version: 1
app:
  php: "8.4"
  ini: { memory_limit: 512M, max_execution_time: 120, upload_max_filesize: 64M, post_max_size: 64M }
```

## 3. Real cron

WooCommerce schedules emails, stock holds and webhooks through Action Scheduler. With `DISABLE_WP_CRON` set to true in `wp-config.php`, run it every minute as the app user:

```text
* * * * * php ~/htdocs/wp-cron.php >/dev/null 2>&1
```

## 4. Backups that match your orders

```bash
$ sudo cipi backup profile add shop-db --scope=db --databases=shop --every=30m --keep=48 --dest=local
$ sudo cipi backup profile add shop-nightly --scope=all --cron='0 3 * * *' --keep-days=30 --dest=s3 --encrypt
$ sudo cipi backup verify
```

Half-hourly database dumps limit what you could lose to thirty minutes of orders.

## 5. A staging copy for updates

```bash
$ sudo cipi app create --custom --user=shopstg --domain=staging.shop.example.com
$ sudo cipi db create --name=shopstg
$ sudo cipi basicauth enable shopstg
```

Copy the files (`rsync` between the two `htdocs` as root) and restore last night's dump into `shopstg`, then point `wp-config.php` and the site URLs at staging. Update plugins and themes there first. Turn off payment webhooks and outgoing e-mail on staging.

## 6. Security basics

| Item | How |
| --- | --- |
| HTTPS everywhere | `sudo cipi ssl install shop && sudo cipi ssl force shop` |
| Admin brute force | fail2ban is on; add Cloudflare Access on `/wp-admin` if you can ([guide](/guides/cloudflare-zero-trust-laravel)) |
| Malware | `sudo cipi scan shop` |
| PHP patched | Nightly, automatically |
