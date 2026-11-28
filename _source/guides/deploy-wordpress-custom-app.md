---
title: Host WordPress on your own VPS next to Laravel apps
description: Run WordPress as an isolated custom app with its own PHP pool, database, HTTPS, backups and Git or SFTP deploys, on the same server as your Laravel apps.
category: php
order: 1
published: 2026-04-09
updated: 2026-11-28
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
  - Which caching? | OPcache is on by default; add Cipi's own page cache with `cipi cache blog on`: Nginx answers public pages without running PHP. The Cipi Cache plugin purges the pages each change touches, so pages can be kept for hours. A Valkey object cache helps busy WooCommerce shops for the pages that still reach PHP.
  - Do I need a cache plugin like WP Rocket or W3 Total Cache? | Not for page caching: Nginx does it before PHP starts. The only plugin worth adding is Cipi Cache, which tells Nginx which pages to drop when you edit something.
  - What if a step fails? | Read the troubleshooting table above first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community. Most commands print the fix when they refuse something.
  - Do I need the web panel for this? | No. Every step works from the CLI. The optional [web panel](/web-panel) shows the same things in a browser.
docs:
  - custom-apps
  - page-cache
  - databases
  - ssl
  - backups
---
WordPress isn't Laravel, but it's PHP, and Cipi hosts it as a **custom app**: its own user, PHP pool, Nginx vhost and certificate, isolated from everything else on the server.

| | Laravel app | Custom app (WordPress) |
| --- | --- | --- |
| Code | Zero-downtime releases | `~/htdocs`, from Git or SFTP |
| Database | Created | `--db` when creating it |
| Workers, scheduler | Yes | Use the app user's crontab |

## 1. Create the app and its database

```bash
$ sudo cipi app create --custom --user=blog --domain=blog.example.com --db=blog
```

`--db=blog` makes its database with the app: save the password from the summary — it is shown once. On an app that already exists, `sudo cipi db create --name=blog --app=blog` does the same. The [web panel](/docs/gui-overview) has the same choice (*New database*) in its create form. For a site in Git (a theme or Bedrock), add `--repository=git@github.com:acme/blog.git` and, with Bedrock, `--docroot=web`.

## 2. Upload WordPress

SFTP as the app user to `~/htdocs` (the credentials are in the create summary), or from SSH:

```bash
$ ssh blog@203.0.113.10
$ cd ~/htdocs
$ curl -sO https://wordpress.org/latest.tar.gz && tar xzf latest.tar.gz --strip-components=1 && rm latest.tar.gz
```

Until then the domain shows a [Coming soon page](/docs/custom-apps#coming-soon); WordPress takes its place as soon as its `index.php` is there. On an app created with an older Cipi, remove its placeholder first: `rm -f ~/htdocs/index.html`.

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

## 6. Make it fast: the page cache

OPcache is already on, so PHP doesn't parse its files at every request — but WordPress still boots, loads its plugins and asks the database for every visitor. Turn on Nginx's page cache and public pages are answered **without running PHP at all**:

```bash
$ sudo cipi cache blog on                # pages kept 10 minutes
$ sudo cipi cache blog on --ttl=1h       # or longer
$ curl -sI https://blog.example.com/ | grep -i x-cache-status    # MISS, then HIT
```

Signed-in users, `/wp-admin`, previews, searches, comments being posted and carts are never cached, so the dashboard works as before and no cache plugin is needed. A post you edit shows up when its page expires — or at once, with the plugin below. A deploy run by Cipi empties the cache by itself; `sudo cipi cache blog clear` and the panel's button empty it by hand.

A page of your own that must never be kept — one a plugin makes different for each visitor without a cookie, a feed — is a path you add: `sudo cipi cache blog exclude add '/wishlist*' '/feed'` ([paths of your own](/docs/page-cache#exclude)).

What the page cache is next to OPcache, what it never caches and how to check a page: [Page cache](/docs/page-cache).

## 7. Purge only what changed: the Cipi Cache plugin {#plugin}

The [Cipi Cache](https://github.com/cipi-sh/cache-wp) plugin tells Nginx which pages to drop when something changes in WordPress: a post you update takes its own page, its categories and tags, its author, the home page, the feeds and the sitemaps along — and nothing else. The rest of the site stays cached.

```bash
$ ssh blog@203.0.113.10
$ cd ~/htdocs
$ wp plugin install https://github.com/cipi-sh/cache-wp/releases/latest/download/cipi-cache.zip --activate
$ wp cipi-cache status
```

Or upload [`cipi-cache.zip`](https://github.com/cipi-sh/cache-wp/releases/latest/download/cipi-cache.zip) under **Plugins → Add New → Upload Plugin**. There is nothing to configure: **Tools → Cipi Cache → Check the connection** says whether it reaches Cipi. The toolbar gets *Purge this page*, and the list of posts *Purge from cache*.

Now pages can be kept far longer, since an edit no longer waits for them to expire:

```bash
$ sudo cipi cache blog ttl 8h
```

To purge some pages by hand, from the server or the panel's **Purge some pages**: `sudo cipi cache blog purge /hello-world/ '/category/news/*'` ([purge some pages](/docs/page-cache#purge)). Everything the plugin purges, and when: [the WordPress plugin](/docs/page-cache#wordpress).

## 8. Back it up

```bash
$ sudo cipi backup profile add blog-nightly --scope=all --cron='0 3 * * *' --keep-days=14 --dest=s3 --encrypt
```

`all` covers the database and the files. More in [backups to S3](/guides/backup-vps-s3) — or to a [Hetzner Storage Box over SFTP](/guides/sftp-backups-hetzner-storage-box), often the cheapest place to keep them. Running a shop? See [WooCommerce on a VPS](/guides/woocommerce-vps).

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| "Error establishing a database connection" | Credentials in `wp-config.php` don't match `cipi db create` output |
| Upload size limit | `sudo cipi ini set upload_max_filesize=64M --app=blog` and `post_max_size` |
| Permalinks 404 | Cipi's vhost already routes to `index.php`; resave permalinks |
| Mixed content after HTTPS | Update `siteurl`/`home` to `https://` |
| An edit doesn't show up | `curl -sI <page> \| grep -i x-cache-status` says `HIT`: install the [Cipi Cache plugin](#plugin), or `sudo cipi cache blog purge <path>` |
| The plugin says `sudo: a password is required` | The app predates purging by page: `sudo cipi self-update` adds the rule |
