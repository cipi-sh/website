---
title: WooCommerce on your own VPS, step by step
description: Host a WooCommerce shop on an Ubuntu VPS from zero, explained for beginners: an isolated app, the database, HTTPS, PHP limits for a shop, real cron for Action Scheduler, caching, frequent backups, a staging copy and security.
category: php
order: 3
published: 2026-11-23
updated: 2026-11-26
howto: yes
keywords: woocommerce vps hosting, woocommerce nginx php-fpm, woocommerce performance server, self-hosted woocommerce, woocommerce cron action scheduler
docs:
  - custom-apps
  - page-cache
  - databases
  - ssl
  - backups
  - basic-auth
  - malware-scan
related:
  - deploy-wordpress-custom-app
  - php-ecommerce-vps
  - backup-vps-s3
faq:
  - How big a server do I need? | For a small shop with up to a few hundred orders a day, 2 GB of RAM and 2 vCPU are comfortable. Large catalogues, many concurrent shoppers or heavy plugins need 4 GB or more. Watch `cipi status` and add RAM before CPU.
  - Can WooCommerce share the server with my Laravel apps? | Yes. Each app runs as its own Linux user with its own PHP pool and `open_basedir`, so a vulnerable plugin can't read the other apps' files.
  - Why disable WP-Cron? | WP-Cron only runs when someone visits the site. Orders, stock holds, subscription renewals and webhooks scheduled by Action Scheduler can wait or pile up. A real cron runs them every minute, whatever the traffic.
  - Which payment plugins work? | All of them: the server doesn't restrict outgoing HTTPS. Make sure the shop is on HTTPS (`cipi ssl force`) before you enable live payments, and keep test keys on staging.
  - How do I update plugins safely? | On the staging copy first, then on production right after a fresh database backup (`cipi db backup shop`). Cipi patches PHP itself every night; plugins and WordPress core are updated by you from the dashboard.
  - Does Cipi have a page cache like Varnish? | Yes, since 5.17.0: `cipi cache shop on` turns on Nginx's own page cache. Catalogue pages are answered without running PHP; the cart, the checkout, the account and every signed-in visitor are never cached. No plugin needed.
  - What if the shop gets hacked? | Restore files and database from the last clean backup, rotate passwords (`cipi db password shop`), update every plugin, and run `cipi scan shop`. Backups every 30 minutes keep the loss small.
  - Can I send order e-mails from the server? | Send them through an SMTP or API provider (Postmark, Mailgun, SES, Brevo…) with an SMTP plugin. Direct mail from a VPS usually lands in spam, and many providers block port 25.
---
WooCommerce turns WordPress into a shop. A shop is more demanding than a blog: orders arrive all day, payment webhooks must never be missed, and losing a day of data means losing orders. This guide sets up a WooCommerce shop on your own server with Cipi, from an empty VPS to a protected, backed-up store, explaining each step.

## What you'll build

```stack
Visitors | https://shop.example.com
Nginx + PHP-FPM | isolated app "shop", its own PHP pool
WordPress + WooCommerce | files in /home/shop/htdocs
MariaDB | database "shop", its own user
Cron every minute | Action Scheduler: orders, e-mails, webhooks
Backups | DB every 30 min, everything nightly to S3
```

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Custom app** | How Cipi hosts any PHP software that isn't Laravel: code in `~/htdocs`, served by Nginx and PHP-FPM ([docs](/docs/custom-apps)) |
| **PHP-FPM pool** | The PHP processes that run your shop. Each app has its own, with its own limits |
| **Action Scheduler** | The queue WooCommerce uses for background tasks (e-mails, stock, webhooks, subscriptions) |
| **WP-Cron** | WordPress' built-in scheduler, triggered by visits. Not reliable for a shop |
| **Staging** | A private copy of the shop where you try updates first |

## Before you start {#before}

- A VPS with Cipi installed ([quickstart](/docs/quickstart)): 2 GB RAM or more.
- A domain, with an `A` record for `shop.example.com` pointing at the server.
- An account at an e-mail provider for order e-mails (SMTP credentials).

## 1. Create the app and its database {#create}

```bash
$ sudo cipi app create --custom --user=shop --domain=shop.example.com --php=8.4
$ sudo cipi db create --name=shop --app=shop
```

The first command creates a Linux user `shop`, the folder `/home/shop/htdocs`, a PHP pool and the Nginx site. The second creates the database `shop` with its own user and links it to the app. **Save the database password** from the output: it's shown once.

> [!tip] Check your plugins' PHP support before choosing the version. You can change it later with `sudo cipi app edit shop --php=8.5`.

## 2. Install WordPress {#wordpress}

Log in as the app user and download WordPress into the web folder:

```bash
$ ssh shop@203.0.113.10          # password and key from the create summary
$ cd ~/htdocs && rm -f index.html
$ curl -sO https://wordpress.org/latest.tar.gz
$ tar xzf latest.tar.gz --strip-components=1 && rm latest.tar.gz
```

Prefer a graphical tool? Connect with SFTP (FileZilla, Transmit, Cyberduck) as `shop` and upload the files to `htdocs`.

## 3. HTTPS before anything else {#https}

```bash
$ sudo cipi ssl install shop
$ sudo cipi ssl force shop
```

The certificate is free (Let's Encrypt), covers every alias and renews itself. `force` redirects every `http://` request to `https://`, which payment providers require.

Now open `https://shop.example.com`, run the WordPress installer (database `shop`, user `shop`, the saved password, host `127.0.0.1`), then install **WooCommerce** from Plugins.

## 4. PHP limits for a shop {#php}

Product imports, big carts and payment callbacks need more than WordPress' defaults. Put the settings in a `cipi.yml` at the root of `htdocs` (Nginx never serves it):

```yaml
# /home/shop/htdocs/cipi.yml
version: 1
app:
  php: "8.4"
  ini:
    memory_limit: 512M
    max_execution_time: 120
    upload_max_filesize: 64M
    post_max_size: 64M
```

```bash
$ sudo cipi yml plan shop && sudo cipi yml apply shop
$ sudo cipi app limits shop --fpm-max-children=12     # parallel PHP workers
```

| Setting | Why a shop needs it |
| --- | --- |
| `memory_limit` | WooCommerce with a page builder and a few plugins easily exceeds 256 MB |
| `max_execution_time` | CSV imports and report generation take time |
| Upload sizes | Product images and import files |
| `fpm_max_children` | How many shoppers PHP serves at once. Each child uses ~60–120 MB: 12 children ≈ 1.5 GB |

## 5. A real cron for Action Scheduler {#cron}

Tell WordPress to stop running cron on page views. In `wp-config.php`, above "That's all, stop editing":

```php
define('DISABLE_WP_CRON', true);
```

Then add a real cron as the app user (`crontab -e`):

```text
* * * * * php ~/htdocs/wp-cron.php >/dev/null 2>&1
```

Check it: WooCommerce → Status → Scheduled Actions should show past-due actions going to zero.

## 6. Order e-mails that arrive {#mail}

Install an SMTP plugin (WP Mail SMTP, FluentSMTP…) and enter your provider's SMTP host, port 587 and credentials. Send a test e-mail from the plugin. Add your provider's SPF and DKIM records to your DNS.

## 7. Speed {#speed}

| Layer | What to do |
| --- | --- |
| PHP | OPcache is on by default. Keep PHP current: Cipi patches it every night |
| Page cache | `sudo cipi cache shop on` (5.17.0+): Nginx answers catalogue pages without running PHP. The cart, checkout, account and signed-in visitors are never cached; after a price or stock change, `sudo cipi cache shop clear` or wait for the pages to expire ([page cache](/docs/page-cache)) |
| Images | Serve WebP; the optional `image-optimizers` host package adds `cwebp`, `jpegoptim`, `pngquant` (`sudo cipi package install image-optimizers`) |
| CDN | Cloudflare in front (orange cloud) with SSL mode **Full (strict)** |
| Database | Keep `wp_options` autoload small; delete old transients |

## 8. Backups that match your orders {#backups}

A shop changes every few minutes, so back up the database often and everything nightly, to another place:

```bash
$ sudo cipi backup configure          # once: your S3-compatible bucket
$ sudo cipi backup profile add shop-db --scope=db --databases=shop --every=30m --keep=48 --dest=local
$ sudo cipi backup profile add shop-nightly --scope=all --cron='0 3 * * *' --keep-days=30 --dest=s3 --encrypt
$ sudo cipi backup verify
```

```flow
Every 30 min | database dump, kept 24 h
> A database-only backup every 30 minutes, kept for 24 hours: orders placed in the last half hour are the most you can lose.
Every night | files + database, encrypted
> Every night, files and database together, encrypted.
Off-site | S3-compatible bucket
> Archives go to an S3-compatible bucket at another provider or region.
Verify | archives checked automatically
> Cipi checks the archives can be opened and alerts you if a profile stops producing backups.
```

At worst you lose 30 minutes of orders. Full guide: [backups to S3](/guides/backup-vps-s3).

## 9. A staging copy for updates {#staging}

Never update WooCommerce, the theme or payment plugins straight on the live shop.

```bash
$ sudo cipi app create --custom --user=shopstg --domain=staging.shop.example.com --php=8.4
$ sudo cipi db create --name=shopstg --app=shopstg
$ sudo cipi basicauth enable shopstg
$ sudo cipi ssl install shopstg
```

Copy the files (`rsync -a /home/shop/htdocs/ /home/shopstg/htdocs/` as root, then `sudo cipi app fix-permissions shopstg`), restore last night's dump into `shopstg`, change the database name, user and password in `wp-config.php`, and set `WP_HOME` and `WP_SITEURL` to the staging URL. Then **turn off** payment gateways (or switch them to test mode) and outgoing e-mail on staging.

## 10. Security {#security}

| Item | How |
| --- | --- |
| HTTPS everywhere | Done in step 3 |
| Brute-force on `/wp-login.php` | fail2ban is on; add Cloudflare Access on `/wp-admin` for the team ([guide](/guides/cloudflare-zero-trust-laravel)) |
| File changes | `sudo cipi scan shop` finds known malware; run it after installing plugins |
| Isolation | Other apps on the server can't read `/home/shop` |
| Updates | PHP patched nightly by Cipi; WordPress, themes and plugins by you, after staging |
| Alerts | Backup failures and server problems on Telegram or Slack ([guide](/guides/notifications-alerts)) |

## Troubleshooting {#troubleshooting}

| Symptom | Likely cause and fix |
| --- | --- |
| "Error establishing a database connection" | Wrong DB credentials in `wp-config.php`, or host `localhost` instead of `127.0.0.1` |
| White page or 502 after a plugin install | PHP memory: raise `memory_limit`, check `sudo cipi app logs shop --type=php` |
| Uploads fail above 2 MB | `upload_max_filesize` and `post_max_size` not applied: `sudo cipi yml plan shop` |
| Orders stuck "pending payment" | Payment webhook blocked: the shop must be reachable over HTTPS; check the gateway's webhook log |
| Scheduled actions past due | Real cron missing: `crontab -l` as `shop` |
| Mixed-content warnings | Site URLs still `http://`: update them in Settings → General |
