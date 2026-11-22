@section cli-services

See and control every service Cipi runs. Nginx always reloads gracefully, so restarting it never drops a request.

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

| Name | Service |
| --- | --- |
| `nginx` | Web server |
| `php` or `php8.6-fpm` | All PHP-FPM versions, or one |
| `mariadb`, `postgresql` (`pgsql`) | Databases |
| `valkey-server` (`redis`, `valkey`) | Shared Valkey |
| `supervisor` | Workers, Octane, Horizon, Reverb |
| `fail2ban` | Brute-force protection |
| `meilisearch` (`search`), `cloudflared` | Only when installed |

`upgrade all` is refused on purpose: patch one service at a time and watch it come back. REST: `GET /api/services`, `POST /api/services/{name}/restart`.
