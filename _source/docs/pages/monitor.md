@section cli-monitor

The server watches itself every 5 minutes and tells you when something actually breaks. No agent, no metrics database, no third-party service: a cron job, a few state files and your [notification channels](/docs/notifications).

<cipi-term name="monitor"></cipi-term>

```bash
$ cipi monitor                    # run every check now (exit 1 on warn/crit)
$ cipi monitor list               # checks, thresholds, state, last alert
$ cipi monitor set disk --warn=85 --crit=95
$ cipi monitor disable load
$ cipi monitor test               # sample alert to every channel
```

## Eight checks, on by default {#checks}

| Check | Watches | Alerts when |
| --- | --- | --- |
| `disk` | Every local filesystem | ≥80% warn, ≥90% critical |
| `app_disk` | Apps with a [soft disk limit](/docs/limits#disk) | ≥90% of the limit, then over it |
| `ssl` | Let's Encrypt certificates | ≤14 days to expiry, or expired |
| `services` | Nginx, databases, PHP-FPM, Valkey, Supervisor, Fail2ban… | Any unit not active |
| `workers` | Queue workers and Horizon | A process not running |
| `http_5xx` | New lines in each app's access log | ≥20 errors **and** ≥5% of requests |
| `fs` | `/etc/cipi`, `/var/log/cipi` | No longer writable (read-only remount) |
| `load` | 1-minute load | Above 4× the cores for 2 runs in a row |

Tune any threshold: `--ssl --days=21`, `http_5xx --count=50 --ratio=10`, `load --factor=6 --runs=3`, `app_disk --minutes=30`.

## Alerts without noise {#noise}

| State change | Message |
| --- | --- |
| ok → warn/critical | One alert |
| warn ↔ critical | One escalation |
| Still failing | A reminder every 4 hours (`set reminder --minutes=N`, min 15) |
| failing → ok | One recovery, with how long it lasted |

The 5xx check reads only what was written since the last run and starts with a baseline, so it never alerts on old errors. A check that can't run reports critical instead of crashing. Each check has its own trigger and can be muted (`cipi notifications disable monitor_load`).

## In the web panel {#in-the-panel}

The fleet dashboard and each server's health. The [web panel](/docs/gui) is optional; everything here also works from the CLI.

<cipi-clips name="server"></cipi-clips>

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| No alerts | Configure a channel: [notifications](/docs/notifications) |
| Too many disk alerts | Free space: `cipi disk` shows who uses it |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| What is checked? | Load, memory, disk, services, backups, certificates, security updates, health checks, every 5 minutes. |
| Errors inside my code? | Use an exception tracker such as [Boogle](/guides/boogle-laravel-monitoring). |
