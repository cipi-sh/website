---
title: Laravel Octane with FrankenPHP on your own server
description: Serve Laravel from memory with Octane and FrankenPHP, side by side with PHP-FPM apps, with pinned builds, safe upgrades and zero-downtime reloads.
category: laravel
order: 2
published: 2026-05-20
updated: 2026-11-23
howto: yes
keywords: laravel octane frankenphp, octane production vps, octane nginx supervisor, laravel performance
related:
  - laravel-reverb-websockets
  - laravel-horizon-queues
  - deploy-laravel-ubuntu-vps
faq:
  - Do I need Docker for FrankenPHP? | No. Cipi runs the FrankenPHP binary natively under Supervisor, behind Nginx, like any other process.
  - Can Octane and PHP-FPM apps share a server? | Yes. Each app picks its runtime; you can convert one back and forth with `cipi app convert`.
  - Will a deploy change my PHP version? | No. Each Octane app is pinned to a FrankenPHP build. PHP changes only when you run `cipi frankenphp upgrade` or switch the app's PHP version.
---
[Laravel Octane](https://laravel.com/docs/octane) boots your app once and keeps it in memory, so each request skips the framework bootstrap. With FrankenPHP as the server, a typical app answers several times faster on the same hardware. Cipi runs it natively, without containers, next to your PHP-FPM apps.

<cipi-term name="octane"></cipi-term>

## 1. Prepare the project

```bash
$ composer require laravel/octane
$ php artisan octane:install --server=frankenphp
```

Commit both changes. Octane apps keep state between requests: avoid storing per-request data in static properties or singletons. The [Octane docs](https://laravel.com/docs/octane#dependency-injection-and-octane) list the patterns to watch.

## 2. Create the app as Octane, or convert one

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:acme/shop.git --octane
$ sudo cipi deploy shop
```

An existing app moves over (and back) in one command; the certificate is kept:

```bash
$ sudo cipi app convert shop --to=octane
$ sudo cipi app convert shop --to=fpm
```

## 3. What runs on the server

```flow
Nginx | static files, TLS
Octane on 127.0.0.1 | a port in 8100–8999
FrankenPHP build | pinned for this app
Supervisor | restarts, reloads on deploy
```

| Piece | Setting |
| --- | --- |
| Nginx | Serves `current/public` directly and proxies the rest to the app's local port |
| Process | Supervisor program `shop-octane`, next to the queue workers |
| `.env` | `OCTANE_SERVER=frankenphp`, `OCTANE_HTTPS=true` |
| Deploys | The pinned binary is linked into the new release, then Octane reloads |

## 4. Tune the workers

```bash
$ sudo cipi app limits shop --octane-workers=4
```

Start with one worker per CPU core and watch memory with `sudo cipi status`. Long jobs belong on [queues or Horizon](/guides/laravel-horizon-queues), WebSockets on [Reverb](/guides/laravel-reverb-websockets).

## 5. Keep FrankenPHP patched, safely

```bash
$ sudo cipi frankenphp              # each app's build and PHP, patched or not
$ sudo cipi frankenphp upgrade shop  # newest build on the same PHP minor
```

| Guard | Effect |
| --- | --- |
| Upgrades stay on the app's PHP minor | No surprise PHP jump |
| Octane must answer after an upgrade | Otherwise the previous build comes back |
| Nightly patches via `cipi autoupdate` | Security fixes without manual work |

To move to a new PHP minor: `sudo cipi app edit shop --php=8.6`, then `sudo cipi frankenphp upgrade shop`.

## In cipi.yml

The runtime is chosen at creation or with `convert`; worker counts can live in the repository:

```yaml
app:
  limits: { octane_workers: 4 }
```
