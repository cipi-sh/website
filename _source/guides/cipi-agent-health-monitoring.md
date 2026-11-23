---
title: Monitor a Laravel app's health with the Cipi Agent and any uptime service
description: Expose a token-protected health endpoint covering database, cache, queue, storage and the last deploy, and plug it into UptimeRobot, Better Stack, Grafana or a cron.
category: agent
order: 5
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel health check endpoint, laravel uptime monitoring, better stack laravel, uptimerobot laravel
related:
  - server-monitoring-alerts
  - cipi-agent-laravel-mcp
  - laravel-zero-downtime-migrations
docs:
  - health-checks
  - agent-config
  - monitor
  - notifications
faq:
  - `/up` or `/cipi/health`? | `/up` is public and only says Laravel boots. `/cipi/health` needs a token and checks database, cache, queue, storage and the live release. Use `/up` for public status pages and `/cipi/health` for alerting.
  - Which uptime services work? | Any that can send a custom header and check the status code or a keyword: UptimeRobot, Better Stack, Pingdom, Uptime Kuma, Boogle.
  - Will a failing check roll back a deploy? | With a Cipi health check set and `--rollback-on-unhealthy` (or `rollback_on_unhealthy: true` in `cipi.yml`), yes.
---
Laravel's `/up` route says the app boots. The agent's `/cipi/health` says whether the app actually works: database, cache, queue, storage and the deploy.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Health check** | A URL that answers "OK" only when the app really works |
| **Uptime monitor** | An outside service that calls it every minute and alerts you |
| **Degraded** | Up, but one dependency (queue, cache) has a problem |

## 1. Enable the endpoint

```bash
$ php artisan cipi:service health --enable
$ php artisan cipi:generate-token health
$ curl -H "Authorization: Bearer $CIPI_HEALTH_TOKEN" https://shop.example.com/cipi/health
```

```json
{
  "status": "healthy",
  "checks": {
    "database": { "ok": true, "driver": "mysql" },
    "cache": { "ok": true, "driver": "database" },
    "queue": { "ok": true, "pending_jobs": 0, "failed_jobs": 0 },
    "storage": { "ok": true, "disk_free_gb": 31.2, "disk_used_percent": 41 },
    "deploy": { "ok": true, "short_commit": "0123456", "in_progress": false }
  }
}
```

If the database, cache, queue or storage fails, `status` becomes `degraded` with **HTTP 503**, which is what uptime services watch.

## 2. Connect an uptime service

| Service | Set up |
| --- | --- |
| Better Stack, UptimeRobot, Pingdom | HTTP monitor on `/cipi/health`, header `Authorization: Bearer <token>`, alert on non-200 |
| Grafana / Prometheus | Blackbox exporter with the header; parse `checks.*.ok` with a JSON exporter |
| Plain cron | `curl -fsS -H "Authorization: Bearer …" https://…/cipi/health >/dev/null || notify` |

## 3. Combine with the server checks

| Layer | Watches | Alerts via |
| --- | --- | --- |
| `cipi monitor` | CPU, memory, disk, services, certificates | Your [Cipi channels](/guides/server-monitoring-alerts) |
| `cipi health` | One URL per app, every 5 minutes and after deploys; can roll back | Your Cipi channels |
| `/cipi/health` | Inside the app: DB, cache, queue, storage, deploy | Your uptime service, from outside |

The outside view catches what the server can't see about itself: DNS, network, a down server.

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Always 401 | Missing `Authorization: Bearer` header in the monitor |
| `queue` not ok | Failed or pending jobs above threshold: check workers and `queue:failed` |
| `storage` not ok | Disk full or permissions: `cipi app fix-permissions shop`, check disk |
| Monitor flaps | Increase its timeout; the check queries the database each time |
