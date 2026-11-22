@section valkey

Valkey is the open-source (BSD, Linux Foundation) continuation of Redis: same protocol, same `phpredis` driver, same `REDIS_*` variables. Cipi gives **each Laravel app its own instance**, so no app can read or flush another's cache, sessions or jobs.

| Per-app instance | |
| --- | --- |
| Service | `cipi-valkey@myapp`, running as the app's user |
| Network | `127.0.0.1`, its own port (from 6400) and password |
| Config / data | `/etc/cipi-valkey/myapp.conf`, `/var/lib/cipi-valkey/myapp` |
| Cost | About 10 MB of RAM when idle |
| `.env` | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` already written |

## Use it in Laravel {#laravel}

New apps keep cache, sessions and queues in their database. Switch whatever you want to Valkey:

```bash
$ cipi app env myapp --set=CACHE_STORE=redis
$ cipi app env myapp --set=SESSION_DRIVER=redis
$ cipi app env myapp --set=QUEUE_CONNECTION=redis
$ cipi worker restart myapp            # or enable Horizon
```

## Manage instances {#manage}

```bash
$ cipi valkey list
$ cipi valkey isolate shop                     # move an app off the shared instance
$ cipi valkey isolate --all
$ cipi valkey isolate shop --maxmemory=256mb --policy=allkeys-lru
$ cipi valkey restart shop
$ cipi valkey flush-shared                     # once no app uses it: empty + new password
```

```flow
Maintenance on | app returns 503
Workers stop | nothing writes
Copy keys | with their expiry
Switch .env | config cache rebuilt
Back online | seconds later
```

If the copy fails, the app stays exactly where it was. Apps whose Redis points elsewhere are left alone. Clones and synced apps get their own instance. `cipi pending` lists apps still on the shared instance.

> [!note] `cipi app create --valkey=shared` keeps one app on the server-wide instance. Valkey is excluded from unattended upgrades; patch it with [stack upgrades](/docs/stack-upgrades).
