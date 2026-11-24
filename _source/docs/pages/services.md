@section cli-services

See and control every service Cipi runs. Nginx always reloads gracefully, so restarting it never drops a request.

## Commands {#commands}

```bash
$ cipi service list [nginx] [--json]
$ cipi service restart              # everything
$ cipi service restart nginx        # graceful reload
$ cipi service restart php          # every PHP-FPM version
$ cipi service start fail2ban
$ cipi service stop supervisor      # asks first
$ cipi service upgrade              # installed vs available versions
$ cipi service upgrade valkey [--yes]
```

## Service names {#names}

| Name | Service |
| --- | --- |
| `nginx` | Web server |
| `php` or `php8.6-fpm` | All PHP-FPM versions, or one |
| `mariadb` (or `mysql`, where [`cipi db switch mysql`](/docs/databases#mysql) ran), `postgresql` (`pgsql`) | Databases |
| `valkey-server` (`redis`, `valkey`) | Shared Valkey |
| `supervisor` | Workers, Octane, Horizon, Reverb |
| `fail2ban` | Brute-force protection |
| `meilisearch` (`search`), `cloudflared` | Only when installed |

`upgrade all` is refused on purpose: patch one service at a time and watch it come back. REST: `GET /api/services`, `POST /api/services/{name}/restart`.

## When to restart what {#when}

| Symptom | Restart | Effect on visitors |
| --- | --- | --- |
| Changed an Nginx setting by hand | `cipi service restart nginx` | None: graceful reload |
| Changed `php.ini` by hand | `cipi service restart php8.6-fpm` | A short pause for apps on that version |
| Workers ignore new code | `cipi worker restart myapp` (one app) | None |
| Database unresponsive | `cipi service restart mariadb` | Seconds of errors: last resort |

Prefer the narrowest restart: one app's workers before Supervisor, one PHP version before all of them.

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Does `restart nginx` drop connections? | No. Cipi reloads Nginx gracefully: open requests finish on the old workers. |
| Why is `upgrade all` refused? | One service at a time lets you see which one misbehaves after an upgrade. Nightly patches are covered by [stack upgrades](/docs/stack-upgrades). |
| Can the panel restart services? | Yes, through the [API](/docs/api) (`POST /api/services/{name}/restart`). Stopping services stays on the CLI. |
