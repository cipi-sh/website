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
  - Is Octane always faster? | For most apps, yes: requests skip the framework boot. Apps dominated by slow database queries or external APIs gain less; fix those first.
  - What breaks under Octane? | Code that keeps per-request data in static properties, singletons resolved once with the request inside, or global state. Test with `php artisan octane:start --watch` locally.
  - How much memory does it use? | Each Octane worker keeps the app in memory, often 60–150 MB. Workers × memory must fit alongside your database and queues.
  - How do I reload Octane after changing .env? | Rebuild the config cache and restart: `cipi app artisan shop config:cache`, then `cipi worker restart shop`. A deploy does both.
docs:
  - octane
  - php
  - limits
  - stack-upgrades
---
[Laravel Octane](https://laravel.com/docs/octane) boots your app once and keeps it in memory, so each request skips the framework bootstrap. With FrankenPHP as the server, a typical app answers several times faster on the same hardware. Cipi runs it natively, without containers, next to your PHP-FPM apps.

<cipi-term name="octane"></cipi-term>

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **PHP-FPM** | The classic way: PHP boots Laravel for **every** request |
| **Octane** | Boots Laravel **once** and keeps it in memory; requests reuse it |
| **FrankenPHP** | A modern PHP server (one binary with PHP inside) that Octane runs on |
| **Octane worker** | One long-lived process handling requests in turn |
| **State leak** | Data from one request still in memory during the next: the main thing to avoid |

```flow
PHP-FPM | boot, handle, forget: every request
> Classic PHP: for every request, Laravel boots (config, providers, routes), handles the request, then everything is thrown away.
Octane | boot once, handle many
> Octane: Laravel boots once per worker and stays in memory; each request skips the boot. Faster, but data you leave in memory carries over to the next request.
```

## Before you start {#before}

- A Laravel app on Cipi ([first deploy](/guides/deploy-laravel-ubuntu-vps)) with a test suite.
- About 150 MB of free RAM per Octane worker you plan to run.

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
> Nginx handles HTTPS and serves static files from `public/` itself.
Octane on 127.0.0.1 | a port in 8100–8999
> Other requests go to Octane on a local port (8100–8999), unreachable from outside.
FrankenPHP build | pinned for this app
> The app runs on its own pinned FrankenPHP build, so PHP never changes by surprise.
Supervisor | restarts, reloads on deploy
> Supervisor keeps Octane alive and reloads it on every deploy.
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

## Avoid state leaks {#state}

| Risky | Safer |
| --- | --- |
| `static $cache = []` in a service | Laravel's cache, or reset it per request |
| Injecting `Request` into a singleton's constructor | Resolve the request inside the method |
| Singletons holding the logged-in user | Bind as `scoped()` instead of `singleton()` |
| Growing arrays in long-lived objects | Octane recycles each worker after 500 requests by default, which limits the damage, not the cause |

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| 502 Bad Gateway | Octane isn't running: `sudo cipi worker list shop`, then `sudo cipi app logs shop --type=worker` |
| One user sees another's data | A state leak: see the table above |
| `.env` change ignored | `cipi app artisan shop config:cache`, then `cipi worker restart shop` |
| Memory climbs until restart | A leak in a long-lived object: find it (static arrays, listeners added per request); lower the worker count meanwhile |
| `cipi php upgrade` lists the app | Its FrankenPHP build is behind: `sudo cipi frankenphp upgrade shop` |
| Uploads larger than a few MB fail | Raise `client_max_body_size` and `upload_max_filesize` with `cipi ini` |
