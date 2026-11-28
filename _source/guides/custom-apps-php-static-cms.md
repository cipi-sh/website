---
title: Host plain PHP, static sites and other CMSs as custom apps
description: Run a legacy PHP site, a static site built by Hugo, Astro or Eleventy, or a CMS such as Joomla, Drupal, Grav or Kirby on the same server as your Laravel apps — from Git or SFTP, with its own user, database, HTTPS, page cache and backups.
category: php
order: 3
published: 2026-11-28
updated: 2026-11-28
howto: yes
keywords: host php site vps, static site nginx vps, host drupal joomla vps, legacy php hosting, sftp only website vps, astro hugo static hosting nginx
related:
  - deploy-wordpress-custom-app
  - deploy-symfony
  - nginx-page-cache-purge
faq:
  - What can a custom app run? | Anything PHP-FPM and Nginx can serve from a folder: plain PHP, WordPress, Drupal, Joomla, Grav, Kirby, PrestaShop, a Symfony app, or static files.
  - Git or SFTP? | Git when the site lives in a repository (`cipi deploy` pulls it); SFTP when files are uploaded or the CMS updates itself.
  - Are deploys zero-downtime? | No: a custom app pulls into `htdocs` in place. For atomic releases use a Laravel app, or build elsewhere and publish the result.
  - Can it have a database? | Yes: `--db=NAME` when creating it, or `cipi db create --name=… --app=…` later. MariaDB, MySQL or PostgreSQL.
  - Can it run cron jobs? | Yes, in the app user's crontab. Long-running workers are for Laravel apps.
  - Does Node build a static site here? | A custom app doesn't build. Build in CI and push the output, or use a Node app (SPA or static), which builds on every deploy.
  - What if a step fails? | Read the troubleshooting table below first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community.
docs:
  - custom-apps
  - create-app
  - page-cache
  - databases
---
Not everything on a server is Laravel. The marketing site from 2014, the client's Joomla, a static site built by Astro, a PHP script that just works: Cipi hosts them as **custom apps** — each with its own Linux user, PHP-FPM pool, Nginx vhost, certificate and (if wanted) database, isolated from your Laravel apps on the same machine.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Custom app** | A folder (`~/htdocs`) served by Nginx and PHP, with no Laravel pipeline |
| **Document root** | The folder the domain serves: `htdocs` itself, or `public`, `dist`, `web`… inside it |
| **SFTP-only** | No repository: you upload the files as the app's user |
| **Coming soon page** | What the domain shows until the first files arrive |

## 1. Pick the shape

| Site | Create it with |
| --- | --- |
| Plain PHP, uploaded | `--custom` |
| Plain PHP in Git | `--custom --repository=…` |
| A CMS with a database (Joomla, Drupal, PrestaShop) | `--custom --db=NAME` (plus `--docroot=web` for Drupal from Composer) |
| A flat-file CMS (Grav, Kirby) | `--custom` |
| A static site built in CI and committed | `--custom --repository=… --docroot=dist` |
| A static site to build on the server | A [Node app](/docs/node-apps) (static), not a custom one |

## 2. Create it

```bash
# A legacy PHP site, uploaded over SFTP, with a database
$ sudo cipi app create --custom --user=legacy --domain=old.example.com --db=legacy --php=8.3

# A static site from Git, serving dist/
$ sudo cipi app create --custom --user=docs --domain=docs.example.com \
    --repository=git@github.com:acme/docs.git --docroot=dist

# Drupal from Composer, PostgreSQL
$ sudo cipi app create --custom --user=portal --domain=portal.example.com \
    --repository=git@github.com:acme/portal.git --docroot=web --db=portal --engine=pgsql
```

The summary prints the app user's SSH/SFTP password and, with `--db`, the database password — once. The [web panel](/docs/gui-overview)'s *New app* → *Custom* does the same, with *New database* in the form.

Until files arrive, the domain shows a neutral **Coming soon** page with the site's own name — nothing loaded from elsewhere, nothing mentioning Cipi. It disappears by itself when an `index.php` or `index.html` is in the document root ([Coming soon](/docs/custom-apps#coming-soon)).

## 3. Put the files there

**SFTP** (FileZilla, Transmit, `scp`, `rsync`) as the app user, into `~/htdocs` — or the document root inside it:

```bash
$ rsync -avz ./site/ legacy@203.0.113.10:htdocs/
```

**Git**: the deploy key is in the summary (`cipi deploy docs --key`); add it to the repository, then:

```bash
$ sudo cipi deploy docs
```

Push-to-deploy works as for Laravel apps: [auto-deploy](/docs/auto-deploy). Steps to run after a pull — `composer install`, a cache clear, a migration — go in `deploy.post` of a `cipi.yml` in the repository:

```yaml
version: 1
deploy:
  post:
    - composer install --no-dev --optimize-autoloader --no-interaction
    - php vendor/bin/drush cache:rebuild
```

## 4. HTTPS, PHP and settings

```bash
$ sudo cipi ssl install legacy
$ sudo cipi app edit legacy --php=8.4               # when the code is ready for it
$ sudo cipi ini set memory_limit=256M --app=legacy
```

Each app picks its own PHP among those installed on the server — 8.3 to 8.6 (`sudo cipi php install 8.5`). A site that only runs on an older PHP has to be brought to 8.3 first: Cipi doesn't install older ones, which no longer get security fixes. Behaviours of your own in Nginx — headers, a redirect, `location` blocks — go in the app's [own directives](/docs/nginx#custom).

## 5. Make it fast

Static files are served by Nginx directly. PHP pages that are the same for every visitor can skip PHP entirely with the page cache:

```bash
$ sudo cipi cache legacy on --ttl=30m
$ sudo cipi cache legacy purge /news/ '/news/*'     # after an edit
```

What it never caches, how to purge on change from code, and the [`cipi/cache`](/docs/page-cache#php) package for plain PHP: [Nginx page cache and purging](/guides/nginx-page-cache-purge).

## 6. Cron, backups, logs

```bash
$ sudo su - legacy -c 'crontab -e'                   # */10 * * * * php ~/htdocs/cron.php
$ sudo cipi backup profile add legacy-nightly --scope=all --apps=legacy --cron='0 3 * * *' --keep-days=14 --dest=s3 --encrypt
$ sudo cipi app logs legacy
```

`--scope=all` takes the files and the database. Big upload folders can be left out with `--exclude-paths`; backups can go to [S3](/guides/backup-vps-s3) or a [Storage Box over SFTP](/guides/sftp-backups-hetzner-storage-box).

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Still *Coming soon* after the upload | The files aren't in the document root: `cipi app show legacy` says which folder it is |
| 404 on pretty URLs | The vhost already routes unknown paths to `/index.php`; check the CMS's base URL setting |
| A blank page | PHP errors: `cipi app logs legacy`. Code written for an older PHP than 8.3 is the usual reason |
| `Permission denied` writing files | Upload as the app user, not root; `cipi app fix-permissions legacy` repairs ownership |
| `cipi.yml` downloaded by visitors | It can't be: every vhost refuses `/cipi.yml` and `/cipi-*.yml` |
