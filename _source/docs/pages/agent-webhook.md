@section agent-webhook

## Push-to-deploy webhook {#webhook}

`POST /cipi/webhook` verifies the push, checks the branch and drops a trigger file; within a minute the server deploys as the app user. The HTTP answer is instant, and the deploy never runs inside a web request. Full flow: [Auto-deploy on push](/docs/auto-deploy).

| Provider | Authentication | Event |
| --- | --- | --- |
| GitHub | `X-Hub-Signature-256` (HMAC-SHA256, secret = `CIPI_WEBHOOK_TOKEN`) | `push` (`ping` answers `pong`) |
| GitLab | `X-Gitlab-Token` | Push Hook |
| Bitbucket Cloud | `X-Hub-Signature` (HMAC) | `repo:push` |
| Gitea / Forgejo | `X-Gitea-Signature` (HMAC) | `push` |
| Azure DevOps | `X-Gitlab-Token` (set by Cipi's service hook) | `git.push` |

Only pushes to `CIPI_DEPLOY_BRANCH` deploy (others answer `skipped`); other events answer `202 ignored`. Get URL and token with `cipi deploy myapp --webhook`.

Each trigger records what the push claimed (provider, pusher, commit, delivery ID, IP) for the [deploy audit](/docs/deploy-audit):

```json
{"source":"github","actor":"octocat","ip":"140.82.115.3","ref":"main@abcdef123456","request_id":"8d2f…"}
```

@section agent-health

## Health endpoint {#health}

`GET /cipi/health` returns the state of app, database, cache, queue, storage and the deploy. Plug it into UptimeRobot, Better Stack, Grafana or a simple cron.

```bash
$ php artisan cipi:generate-token health
$ curl -H "Authorization: Bearer $CIPI_HEALTH_TOKEN" https://myapp.com/cipi/health
```

```json
{
  "status": "healthy",
  "environment": "production",
  "checks": {
    "app": { "ok": true, "debug": false, "maintenance": false },
    "database": { "ok": true, "driver": "mysql" },
    "cache": { "ok": true, "driver": "database" },
    "queue": { "ok": true, "pending_jobs": 0, "failed_jobs": 0 },
    "storage": { "ok": true, "disk_free_gb": 31.2, "disk_used_percent": 41 },
    "deploy": { "ok": true, "short_commit": "0123456", "in_progress": false,
                "last_deploy": { "status": "ok", "trigger": "webhook", "duration_seconds": 42 } }
  }
}
```

| Field | Use |
| --- | --- |
| `status` | `degraded` (HTTP 503) if database, cache, queue or storage fails |
| `checks.queue.failed_jobs` / `pending_jobs` | Alert on stuck jobs or backlog |
| `checks.storage.disk_used_percent` | Disk pressure |
| `checks.deploy` | Live release and commit; a failed last deploy is informational (the previous release is still serving) |

Token order: `CIPI_HEALTH_TOKEN`, then `CIPI_WEBHOOK_TOKEN`. Disable with `php artisan cipi:service health --disable`.
