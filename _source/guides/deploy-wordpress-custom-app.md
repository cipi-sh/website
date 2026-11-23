---
title: Host WordPress on your own VPS next to Laravel apps
description: Run WordPress as an isolated custom app with its own PHP pool, database, HTTPS, backups and Git or SFTP deploys, on the same server as your Laravel apps.
category: php
order: 1
published: 2026-04-09
updated: 2026-11-23
howto: yes
keywords: wordpress vps hosting, wordpress nginx php-fpm, wordpress and laravel same server, self-hosted wordpress
related:
  - woocommerce-vps
  - php-ecommerce-vps
  - backup-vps-s3
faq:
  - Can WordPress affect my Laravel apps? | Each app runs as its own Linux user with its own PHP pool and `open_basedir`, so a compromised plugin can't read another app's files.
  - Git or SFTP? | Both work. Git suits a theme or a site under version control; SFTP suits a classic WordPress where plugins update from the dashboard.
  - Can WordPress update itself? | Yes, files in `~/htdocs` belong to the app user, so core, plugin and theme updates work from the dashboard.
  - Does WordPress get isolation like Laravel apps? | Yes: own Linux user, PHP pool and database. A compromised plugin can't read other apps.
  - Which caching? | A page cache plugin plus OPcache (on by default) is enough for most sites. Valkey object cache helps busy WooCommerce shops.
  - What if a step fails? | Read the troubleshooting table above first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community. Most commands print the fix when they refuse something.
  - Do I need the web panel for this? | No. Every step works from the CLI. The optional [web panel](/web-panel) shows the same things in a browser.
docs:
  - custom-apps
  - databases
  - ssl
  - backups
---
WordPress isn't Laravel, but it's PHP, and Cipi hosts it as a **custom app**: its own user, PHP pool, Nginx vhost and certificate, isolated from everything else on the server.

| | Laravel app | Custom app (WordPress) |
| --- | --- | --- |
| Code | Zero-downtime releases | `~/htdocs`, from Git or SFTP |
| Database | Created | One command |
| Workers, scheduler | Yes | Use the app user's crontab |

## 1. Create the app and its database

```bash
$ sudo cipi app create --custom --user=blog --domain=blog.example.com
$ sudo cipi db create --name=blog
```

Save the database password from the output. For a site in Git (a theme or Bedrock), add `--repository=git@github.com:acme/blog.git` and, with Bedrock, `--docroot=web`.

## 2. Upload WordPress

SFTP as the app user to `~/htdocs` (the credentials are in the create summary), or from SSH:

```bash
$ ssh blog@203.0.113.10
$ cd ~/htdocs && rm -f index.html
$ curl -sO https://wordpress.org/latest.tar.gz && tar xzf latest.tar.gz --strip-components=1 && rm latest.tar.gz
```

Open `https://blog.example.com` (after step 3) and run the installer with database `blog`, user `blog` and the saved password, host `127.0.0.1`.

## 3. HTTPS

```bash
$ sudo cipi ssl install blog
$ sudo cipi ssl force blog
```

Set both URLs to `https://` in **Settings → General**.

## 4. Real cron instead of WP-Cron

In `wp-config.php`: `define('DISABLE_WP_CRON', true);` then, as the app user (`crontab -e`):

```text
*/5 * * * * php ~/htdocs/wp-cron.php >/dev/null 2>&1
```

## 5. PHP settings and limits

```yaml
# cipi.yml in htdocs (vhosts never serve it)
version: 1
app:
  php: "8.4"
  ini: { upload_max_filesize: 64M, post_max_size: 64M, memory_limit: 256M }
```

Or from the CLI: `sudo cipi app edit blog --php=8.4`. Check plugin compatibility before moving to a newer PHP.

## 6. Back it up

```bash
$ sudo cipi backup profile add blog-nightly --scope=all --cron='0 3 * * *' --keep-days=14 --dest=s3 --encrypt
```

`all` covers the database and the files. More in [backups to S3](/guides/backup-vps-s3). Running a shop? See [WooCommerce on a VPS](/guides/woocommerce-vps).

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| "Error establishing a database connection" | Credentials in `wp-config.php` don't match `cipi db create` output |
| Upload size limit | `sudo cipi ini set upload_max_filesize=64M --app=blog` and `post_max_size` |
| Permalinks 404 | Cipi's vhost already routes to `index.php`; resave permalinks |
| Mixed content after HTTPS | Update `siteurl`/`home` to `https://` |
