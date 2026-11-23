---
title: Laravel cache, sessions and queues on Valkey (Redis)
description: What Redis and Valkey are, when to move Laravel's cache, sessions and queues off the database, and how to do it on Cipi with one isolated Valkey instance per app: switching drivers, memory limits, eviction, moving off a shared instance, and debugging.
category: laravel
order: 14
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel valkey, laravel redis production, laravel cache redis vps, laravel session redis, valkey vs redis, phpredis laravel
docs:
  - valkey
  - environment
  - workers
related:
  - laravel-horizon-queues
  - laravel-reverb-websockets
  - laravel-octane-frankenphp
faq:
  - Is Valkey the same as Redis? | For Laravel, yes. Valkey is the open-source (BSD) continuation of Redis, maintained under the Linux Foundation. Same protocol, same `phpredis` driver, same `REDIS_*` variables, `redis` as the driver name.
  - Why not keep everything in the database? | You can, and new Cipi apps do. Valkey is faster for high traffic, lots of cache keys, Horizon, rate limiting and locks, and it takes that load off the database.
  - Do apps share one Valkey? | No. Each Laravel app gets its own instance, on its own port, with its own password, running as the app's user. One app can't read or flush another's data.
  - Will I lose sessions if Valkey restarts? | Each instance keeps data on disk in `/var/lib/cipi-valkey/<app>`, so a normal restart keeps it. Treat cache as disposable and don't store anything in it you can't rebuild.
  - How much memory does it use? | About 10 MB per idle instance, growing with your data. Set a cap and an eviction policy (step 3).
  - What does `cache:clear` clear? | Only the app's own instance (or prefix). With isolated instances it can't touch another app.
---
Laravel can keep **cache**, **sessions** and **queues** in several places. New apps on Cipi keep them in the database, which works fine at the start. As traffic grows, moving them to **Valkey**, an in-memory store, makes them much faster and lighter on the database.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Cache** | Saved results (`Cache::remember`) so you don't compute them again |
| **Session** | What the app remembers about a logged-in visitor between requests |
| **Queue** | Jobs waiting for a worker to process them |
| **Valkey / Redis** | An in-memory key-value store: very fast, data mostly in RAM |
| **Eviction** | What Valkey does when it's full: e.g. drop the least recently used keys |

```stack
Laravel app shop | CACHE_STORE, SESSION_DRIVER, QUEUE_CONNECTION
Valkey for shop | 127.0.0.1:64xx, own password, user shop
Valkey for blog | another port, another password
Ubuntu server | nothing exposed to the internet
```

## When to switch {#when}

| Sign | Move |
| --- | --- |
| Heavy `Cache::` use, slow pages under load | `CACHE_STORE=redis` |
| Many logged-in users, the `sessions` table grows | `SESSION_DRIVER=redis` |
| You want Horizon, or many jobs per minute | `QUEUE_CONNECTION=redis` with Horizon |
| Rate limiting, `Cache::lock()`, Reverb scaling | Already covered by `CACHE_STORE=redis` |

You can switch one at a time.

## Before you start {#before}

- A Laravel app on Cipi. `phpredis` is installed with every PHP version, and the `.env` already holds `REDIS_HOST`, `REDIS_PORT` and `REDIS_PASSWORD` for the app's own instance.

```bash
$ sudo cipi valkey list
$ sudo cipi app env shop --get=REDIS_PORT
```

## 1. Switch the drivers {#switch}

```bash
$ sudo cipi app env shop --set=CACHE_STORE=redis
$ sudo cipi app env shop --set=SESSION_DRIVER=redis
$ sudo cipi app artisan shop config:cache  # deploys cache the config: rebuild it
$ sudo cipi worker restart shop            # workers re-read the config
```

Queues on Valkey run under **Horizon** (plain workers read the `database` connection):

```bash
$ sudo cipi app env shop --set=QUEUE_CONNECTION=redis
$ sudo cipi app artisan shop config:cache
$ sudo cipi worker horizon enable shop     # needs laravel/horizon in the app
```

[Horizon guide](/guides/laravel-horizon-queues).

| What happens | Effect |
| --- | --- |
| Cache | Starts empty: the first requests rebuild it |
| Sessions | Logged-in users are logged out once (old sessions were in the database) |
| Queue (with Horizon) | Jobs already in the `jobs` table stay there: drain them once with `queue:work database --stop-when-empty` |

Switch sessions at a quiet time, or tell users they'll need to log in again.

## 2. Check it works {#check}

```bash
$ sudo cipi app artisan shop tinker --execute="Cache::put('ping','pong',60); echo Cache::get('ping');"
pong
$ sudo cipi valkey list                    # shop: its own instance, running
```

## 3. Cap memory and pick an eviction policy {#memory}

Without a cap, an instance grows with your data. For an app that still uses the shared instance, set the cap while you isolate it (step 4):

```bash
$ sudo cipi valkey isolate shop --maxmemory=256mb --policy=allkeys-lru
```

For an app that already has its own instance (every new app), add the two lines to its config and restart it:

```bash
$ echo -e "maxmemory 256mb\nmaxmemory-policy allkeys-lru" | sudo tee -a /etc/cipi-valkey/shop.conf
$ sudo cipi valkey restart shop
```

| Policy | Use for |
| --- | --- |
| `allkeys-lru` | Mostly cache: drops the least used keys when full |
| `volatile-lru` | Cache plus data without expiry (sessions with TTL, queue): drops only keys with an expiry |
| `noeviction` | Queues only: refuses writes when full, so jobs are never dropped silently |

If you keep queues and cache in the same instance, `volatile-lru` is the safe middle: cache keys have a TTL, queued jobs don't.

<cipi-term name="valkey"></cipi-term>

## 4. Apps still on the shared instance {#isolate}

Older servers started with one Valkey for everybody. Move each app to its own:

```bash
$ sudo cipi pending                          # lists apps still on the shared instance
$ sudo cipi valkey isolate shop              # or --all
```

```flow
Maintenance on | app returns 503 for seconds
> The app returns 503 for a few seconds so nothing writes during the move.
Workers stop | nothing writes
> Its workers stop.
Copy keys | with their expiry
> Every key is copied to the app's own instance, with its expiry.
Switch .env | config cache rebuilt
> `.env` points at the new instance and the config cache is rebuilt.
Back online | on its own instance
> The app is back online on its own instance. If anything failed, it stays where it was.
```

If the copy fails, the app stays exactly where it was. Once nobody uses the shared instance, `sudo cipi valkey flush-shared` empties it and changes its password.

## 5. Look inside {#inspect}

```bash
$ sudo cipi app env shop --get=REDIS_PORT
$ valkey-cli -p 6401 -a "$(sudo cipi app env shop --get=REDIS_PASSWORD)" info memory
$ valkey-cli -p 6401 -a "…" --scan --pattern '*cache*' | head
```

Avoid `KEYS *` on a big instance: it blocks it. `--scan` doesn't.

## Good habits {#habits}

| Habit | Why |
| --- | --- |
| Always set a TTL on cache keys | Lets eviction work and memory stay flat |
| Don't treat cache as storage | Anything in it may disappear |
| Separate queue and cache Redis databases (`REDIS_CACHE_DB`) | `cache:clear` won't touch queued jobs |
| Restart workers after driver changes | They keep the old config in memory |

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `Connection refused` | Instance stopped: `sudo cipi valkey restart shop` |
| `NOAUTH` / `WRONGPASS` | `.env` and instance disagree: compare `REDIS_PASSWORD` with `requirepass` in `/etc/cipi-valkey/shop.conf` |
| Everyone logged out | Expected once after switching `SESSION_DRIVER` |
| Jobs stuck in the database | Drain the old `jobs` table (see step 1) |
| `OOM command not allowed` | Memory cap reached with `noeviction`: raise `--maxmemory` or change policy |
| `Class "Redis" not found` | Very rare: the app's PHP lacks `phpredis`; reinstall that PHP version |
