---
title: Upgrade PHP for a Laravel app without downtime
description: How PHP versions work on a server, explained from zero: running several versions side by side, checking your code and Composer dependencies, moving one app at a time with zero downtime, rolling back, nightly security patches, end-of-life versions and Octane's own PHP.
category: ops
order: 5
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: upgrade php laravel server, php 8.5 laravel, php 8.6 laravel, multiple php versions ubuntu, php-fpm upgrade zero downtime, laravel php version production
docs:
  - php
  - stack-upgrades
  - octane
related:
  - php-nginx-cve-patching
  - laravel-octane-frankenphp
  - laravel-ci-cd-git-workflow
faq:
  - Can apps on one server use different PHP versions? | Yes. Each app has its own PHP-FPM pool with its own version. Deploys, Composer, cron and workers always use the app's version, never the server default.
  - Is the switch really without downtime? | Yes. Cipi starts the new pool, points the app's vhost at it and reloads Nginx; requests in flight finish on the old pool.
  - What if the new version breaks the app? | Move it back with the same command (`--php=` the old version). Both versions stay installed until you remove one.
  - Which versions can I install? | 8.3 to 8.6. Older versions on old servers are listed, patched by the distro if possible and can be removed, but aren't offered to apps.
  - Do I need to patch PHP myself? | No. Cipi applies PHP security releases every night at 03:30 and restarts only the affected pools. `cipi php upgrade` does it now.
  - What about Octane apps? | They run the PHP inside their FrankenPHP binary. `cipi frankenphp upgrade` updates it; `cipi php upgrade` lists them too.
  - A new PHP minor is out but an extension isn't. | Cipi installs what's available, records what's missing and adds it as soon as it's published. Assigning the version to an app that needs the missing extension is refused, with the list.
---
PHP has a new minor version every year (8.4, 8.5, 8.6…), each supported with security fixes for a few years. Moving apps forward keeps them fast and patched. On a Cipi server you can do it **one app at a time**, test it, and move back in seconds if needed.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Minor version** | 8.5, 8.6: new features, small breaking changes |
| **Patch version** | 8.5.3 → 8.5.4: bug and security fixes only |
| **PHP-FPM pool** | The PHP processes that serve one app's web requests |
| **Server default** | The version for `php` on the command line and new apps |
| **End of life (EOL)** | No more security fixes from PHP: move off it |

```stack
shop | PHP 8.6 pool
blog | PHP 8.4 pool
legacy | PHP 8.3 pool
Nginx | routes each domain to its app's pool
```

## Before you start {#before}

- Know your app's current version: `sudo cipi app show shop`.
- Read the PHP migration notes for the target version (php.net has one per minor).
- Have a [backup](/guides/backup-vps-s3) or a [pre-deploy snapshot](/docs/safe-deploy).

## 1. Check your code locally {#local}

```bash
$ php -v                                    # run the target version on your laptop
$ composer why-not php 8.6                  # which dependencies block it
$ composer update                           # within your constraints
$ php artisan test
```

Update `composer.json`'s `"php"` constraint (e.g. `"^8.3"`) only if you want to drop old versions. Commit the updated `composer.lock`.

## 2. Install the version on the server {#install}

```bash
$ sudo cipi php list
$ sudo cipi php install 8.6
```

<cipi-term name="php"></cipi-term>

The install adds the version next to the others. Nothing changes for running apps.

## 3. Try it on a copy first {#copy}

With a staging app (or a clone):

```bash
$ sudo cipi app clone shop --domain=shop-86.example.com --name=shop-86
$ sudo cipi app edit shop-86 --php=8.6
$ sudo cipi deploy shop-86
```

Click through, run the queue, check `sudo cipi app logs shop-86 --type=laravel` for deprecations.

## 4. Move the app {#switch}

```bash
$ sudo cipi app edit shop --php=8.6
```

```flow
New pool | PHP 8.6 for shop
Vhost | points to the new pool
Nginx reload | no dropped requests
Workers, cron | restarted on 8.6
Old pool | removed for this app
```

Then deploy once, so Composer installs dependencies under the new version:

```bash
$ sudo cipi deploy shop
```

If the lock file rejects the new version, the deploy fails and **the live release keeps running**: update the dependency, commit, deploy again.

## 5. Roll back if needed {#rollback}

```bash
$ sudo cipi app edit shop --php=8.5
$ sudo cipi deploy shop --rollback          # if a deploy changed the vendor folder
```

## 6. Change the server default and clean up {#cleanup}

```bash
$ sudo cipi php switch 8.6                  # CLI `php`, panel, new apps
$ sudo cipi php remove 8.3                  # refused while any app uses it
```

## Patches happen on their own {#patches}

| What | When | How |
| --- | --- | --- |
| PHP security releases | Every night at 03:30 | Only affected pools restart |
| Check now | Any time | `sudo cipi php upgrade` |
| Octane apps | With FrankenPHP | `sudo cipi frankenphp upgrade` |

`cipi php list` shows the state of each version: `patched`, `VULNERABLE` (a fix exists, not installed yet), `distro`, `END OF LIFE`, `prerelease`. [How CVEs are handled](/guides/php-nginx-cve-patching).

## php.ini settings survive {#ini}

Settings set with `cipi ini` move with the app. Check them after the switch:

```bash
$ sudo cipi ini list --app=shop
```

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `Your lock file does not contain a compatible set of packages` | A dependency doesn't support the version yet: `composer why-not php 8.6`, update or wait |
| Assigning is refused: missing extensions | The extension isn't published for that version yet; `--force` only if the app doesn't use it |
| Deprecation warnings flood the log | Set `LOG_DEPRECATIONS_CHANNEL=null` while you fix them |
| `php -v` shows the old version | That's the server default: `cipi php switch` (apps use their own anyway) |
| Worker still on the old version | `sudo cipi worker restart shop` |
