---
title: "Cipi metrics explained: server, application and uptime"
description: "What Cipi records every minute for the server and for each app, how uptime is measured, how long it's kept, and how to read the numbers to find the cause of a slowdown, from the CLI, the panel, Prometheus or an AI assistant."
lead: "Alerts tell you that something broke. Metrics tell you when it started, what else changed, and which app did it. Cipi keeps both on the server, in one small file."
category: ops
order: 3
published: 2026-11-24
updated: 2026-11-24
keywords: laravel server metrics, php-fpm max_children monitoring, laravel uptime history, vps metrics without prometheus, laravel 5xx monitoring, openmetrics laravel
related:
  - server-monitoring-alerts
  - cipi-agent-health-monitoring
  - boogle-laravel-monitoring
faq:
  - Which version do I need? | Cipi 5.11.0 or later for metrics, uptime and the heartbeat; panel 4.3.0 for the Metrics tab. `sudo cipi self-update`.
  - Does it slow the server down? | One cron job a minute, about 0.2 seconds of CPU, and a database of 20–30 MB for ten apps on the default retention. Nothing listens on a port unless you turn OpenMetrics on.
  - Does any data leave the server? | No. The heartbeat calls a URL of yours, and OpenMetrics is served only if you enable it, behind an IP allowlist and a token.
  - Is the uptime the same as an external monitor's? | Not exactly: the probe runs on the server itself, so it can't see a network or DNS problem between your users and the server. Pair it with the heartbeat and, for public services, an external monitor.
  - Why is there a gap in the chart? | The collector didn't run in those minutes: the server was off or rebooting, or metrics were disabled. If you didn't expect it, the heartbeat should have told you.
  - Can I keep data longer? | Yes: up to 90 days of minutes, 400 days of rollups and 730 days of events (`sudo cipi metrics retention`). Or scrape it into your Prometheus.
  - Does it replace an APM or an error tracker? | No. Metrics see the app from the outside (CPU, memory, requests, 5xx, pool usage). For slow routes and queries use Laravel Pulse or Telescope; for exceptions, [Boogle](/guides/boogle-laravel-monitoring) or a similar tracker.
docs:
  - metrics
  - monitor
  - health-checks
  - notifications
---
Cipi watches a server at three levels. The **server**: is the machine healthy? Each **application**: is this app healthy, and is it the one causing trouble? **Uptime**: can its URL be reached, and how fast does it answer? On top sits a timeline of **events**: deploys, incidents, alerts. This article explains what each number means, how it's measured, and how to use them together.

<cipi-term name="metrics"></cipi-term>

## Three layers, one timeline {#layers}

| Layer | Question | Recorded |
| --- | --- | --- |
| **Server** | Is the machine healthy? | CPU, load, memory, swap, disk, network |
| **Application** | Is this app healthy, and is it the noisy neighbour? | CPU and memory of its processes, PHP-FPM pool usage, requests, 5xx, queue workers |
| **Uptime** | Can it be reached, and how fast? | Status code and response time of its health URL, every minute |
| **Events** | What changed, and when? | Releases with their health verdict, monitor alerts and recoveries, incidents, heartbeat failures |

```flow
How | one cron | #how
Server | the machine | #server
Apps | each app | #app
Uptime | every minute | #uptime
Events | what changed | #events
Playbook | read together | #playbook
Outside | Prometheus, API | #outside
```

Metrics and alerts are separate on purpose. The [monitor](/docs/monitor) and the [health checks](/docs/health-checks) decide when to wake you up; metrics only record. Every state change of a monitor check is also written as an event, so the history explains the alert.

## How it's collected {#how}

```stack
Cron, every minute | /etc/cron.d/cipi-metrics
Read | /proc, one ps, new access-log lines, supervisorctl
Probe | each app's health URL
Write | one SQLite transaction
Store | /var/lib/cipi-metrics/metrics.db (root, 0600)
```

About 0.2 seconds of CPU per minute. Nothing listens on a port, nothing leaves the server. Compared with a Prometheus server and exporters on every VPS, that's hundreds of megabytes of RAM saved on the small machines most Cipi servers are; if you already run Prometheus, [scrape Cipi](#prometheus) instead.

```bash
$ sudo cipi metrics status        # collector, database size, retention
$ sudo cipi metrics               # now, last hour, uptime per app
```

## Server metrics {#server}

| Metric | What it means | Worry when |
| --- | --- | --- |
| **CPU %** | Share of all cores busy | Sustained near 100%: requests queue behind each other |
| **Load (1 min)** | Processes running or waiting for CPU or disk | Above the number of cores for long; the monitor alerts at 4× the cores for two runs in a row |
| **Memory % and MB** | RAM in use, without cache | High *and* swap rising |
| **Swap %** | Memory pushed to disk | Any steady growth on a PHP server: too many FPM children or workers for the RAM |
| **Disk % of `/`** | The root filesystem | The monitor warns at 80% and goes critical at 90%; `sudo cipi disk` says who uses it |
| **Network in / out** | Bytes per second | Sudden outbound spikes: a crawler, a big export, or something that shouldn't be there |

Load and CPU together tell a story: high load with low CPU usually means processes are **waiting for disk**, not computing. On a database-heavy app, look at the slow queries before buying a bigger server.

## Application metrics {#app}

| Metric | How it's measured | Read it as |
| --- | --- | --- |
| **CPU** | CPU time of the app user's processes between two minutes, as % of **one core** | 100% = one core fully busy. FPM masters run as root and aren't counted; Octane and Node processes are |
| **Memory** | Sum of the resident memory of its processes | An upper bound: pages PHP-FPM children share are counted once per child. Watch the trend |
| **PHP-FPM children** / `pm.max_children` | Workers of the app's pool, against its cap | Close to the cap at peak is fine; at the cap is not |
| **Hit `max_children`** | How many times the pool reached its cap in the minute | **The most useful number for "the site is slow"**: requests waited for a free worker |
| **Requests / min** | New lines in the app's Nginx access log | Traffic, per minute |
| **5xx / min** | Responses 500–599 in the same lines | Errors your users saw |
| **Queue workers** | Programs running, against programs configured | Running < configured: a worker crashed and isn't back |
| **Healthcheck** | Status, expected or not, and response time | See [uptime](#uptime) |

```bash
$ sudo cipi metrics show --app=shop --range=7d     # min / avg / max and trend
$ sudo cipi metrics show --app=shop --range=24h --json | jq .
```

### The pool cap, in plain words {#pool}

Each app has a fixed number of PHP workers (`pm.max_children`). When all are busy, the next request waits. A few hits a day are normal; minutes in a row mean the app is too slow for its traffic or the cap is too low.

| CPU of the app | Hits `max_children` | Likely cause | Do |
| --- | --- | --- | --- |
| High | Yes | Code is CPU-bound | Profile the hot routes; more children won't help |
| Low | Yes | Workers are **waiting**: database, an external API, file locks | Find slow queries and calls; raise the cap only if memory allows |
| Low | No | The pool isn't the problem | Look at the database or the network |

```bash
$ sudo cipi app limits shop --fpm-max-children=20       # if RAM allows
```

## Uptime {#uptime}

When an app has a health URL ([`sudo cipi health set`](/docs/health-checks)), the collector calls it every minute and keeps the status code and response time.

```bash
$ sudo cipi health set shop --url=https://shop.example.com/up --expect=200
$ sudo cipi metrics uptime --range=30d
$ sudo cipi metrics uptime shop --range=30d
```

| Number | Definition |
| --- | --- |
| **Uptime %** | Share of successful per-minute probes over the range |
| **Minutes down** | Probes that failed |
| **Incident** | Opens at the 3rd failure in a row, closes at the first success: a single blip doesn't count |
| **Response time** | Time for the health URL to answer, from the server itself |
| **Day bars** | Green: all passed. Yellow: a few failed. Red: an incident. Grey: no data yet |

| 30-day uptime | Down per month (about) |
| --- | --- |
| 99% | 7 h 12 min |
| 99.9% | 43 min |
| 99.95% | 22 min |
| 99.99% | 4 min |

Choose the URL with care. Laravel's `/up` says the framework boots; the [Cipi Agent's `/cipi/health`](/guides/cipi-agent-health-monitoring) also checks the database, cache, queue and storage. An app behind basic auth answers 401 to the probe, like to any visitor: use a URL outside the protected area.

> [!info] The probe runs **on the server**. It sees a broken release, a dead database or an expired certificate, but not a DNS mistake or a network outage between your users and the server. For that, the [heartbeat](#heartbeat) and an external monitor complete the picture.

## Events {#events}

| Event | Source |
| --- | --- |
| Release live, with its post-deploy health verdict | Every deploy, from the CLI, the panel, a webhook or CI |
| Monitor state change | `ok → warn/critical`, escalations, recoveries |
| Healthcheck incident | Opened and closed |
| Heartbeat failure | A call to your heartbeat URL that didn't go through |

```bash
$ sudo cipi metrics events --range=7d
$ sudo cipi metrics events --source=deploy
```

In the panel, events are the dotted vertical lines on every chart: blue for releases, red for incidents, green for recoveries. Most investigations start by asking "what was the last marker before the line went up?".

## Read them together: a playbook {#playbook}

| Symptom | Look at | Likely cause | Next step |
| --- | --- | --- | --- |
| 5xx jump right after a release marker | App 5xx, events | The release | `sudo cipi deploy shop --rollback`, then read `sudo cipi app logs shop --type=laravel` |
| Site slow, app CPU high, pool at the cap | App CPU, `max_children` hits | CPU-bound code or a traffic spike | Compare requests/min with last week; profile; resize if it's real traffic |
| Site slow, app CPU low, pool at the cap | `max_children` hits, server load | Workers waiting on the database or an API | Slow query log, timeouts on outgoing calls |
| Memory climbs for days, swap grows | App memory, server swap | Too many workers for the RAM, or a leaking worker | Fewer workers (`sudo cipi app limits --worker-procs`); let leaking workers restart (`maxJobs` / `maxTime` in Horizon, `--max-jobs` / `--max-time` on `queue:work`) |
| Queue workers below configured | Queue workers | A worker crashing on start | `sudo cipi app logs shop --type=worker` |
| Uptime red, server and app metrics normal | Healthcheck status code | A dependency the health URL checks, or the certificate | Open the URL; `sudo cipi health check shop` |
| One app's CPU high, others slow | Every app's CPU on the server tab | A noisy neighbour | Limits: `sudo cipi app limits` ([docs](/docs/limits)), or move it with `sudo cipi sync` |
| Gap in every chart | Nothing recorded | The server was down or rebooting | Check the heartbeat service's history and `uptime` |
| Disk % climbing steadily | Server disk | Logs, local backups, uploads | `sudo cipi disk`, then [exclude big folders](/guides/exclude-files-from-backups) from local backups |

## Retention and size {#retention}

| Data | Default | Range |
| --- | --- | --- |
| Every minute | 7 days | `--raw=1d` … `90d` |
| Average and peak per 15 minutes | 30 days | `--rollup=` up to `400d` (never shorter than raw), `--resolution=5m` … `60m` |
| Events | 90 days | `--events=7d` … `730d` |

```bash
$ sudo cipi metrics retention
$ sudo cipi metrics retention --raw=14d --rollup=180d --resolution=30m
```

About 2 MB per app per week of minutes, and a third of that per month of rollups: 20–30 MB for ten apps on the defaults. Charts always ask for about 240 points, whatever the range: minutes inside the raw window, rollups beyond it. That's why a 30-day chart shows averages **and** peaks: a one-minute spike stays visible.

## Outside the server {#outside}

### Heartbeat: for the day the server goes quiet {#heartbeat}

A server that's down can't send an alert. The heartbeat calls a URL of yours every N minutes; when the calls stop, the service on the other end alerts you.

```bash
$ sudo cipi metrics heartbeat set https://hc-ping.com/<uuid> --every=1
$ sudo cipi metrics heartbeat test
```

Works with Healthchecks.io, Uptime Kuma (push monitor), Better Stack heartbeats, Cronitor or your own endpoint. Set the receiver's period to the interval plus a few minutes of grace.

### Prometheus and Grafana {#prometheus}

If you already run Prometheus, turn on OpenMetrics: the latest values on their own port, behind an IP allowlist and a bearer token.

```bash
$ sudo cipi metrics openmetrics on --allow=203.0.113.50 --port=9273
$ sudo cipi metrics openmetrics token --show
```

```yaml
# prometheus.yml
- job_name: cipi-production
  scrape_interval: 60s
  authorization: { credentials: <token> }
  static_configs: [{ targets: ['203.0.113.10:9273'] }]
```

| Server | Each app (`{app="shop"}`) |
| --- | --- |
| `cipi_host_cpu_percent`, `cipi_host_load1` | `cipi_app_cpu_percent`, `cipi_app_memory_rss_megabytes`, `cipi_app_processes` |
| `cipi_host_memory_percent`, `cipi_host_memory_used_megabytes`, `cipi_host_swap_percent` | `cipi_app_fpm_children`, `cipi_app_fpm_max_children`, `cipi_app_fpm_max_children_reached` |
| `cipi_host_disk_percent` | `cipi_app_requests_per_minute`, `cipi_app_http_5xx_per_minute` |
| `cipi_host_network_receive_bytes_per_second`, `cipi_host_network_transmit_bytes_per_second` | `cipi_app_healthcheck_up`, `cipi_app_healthcheck_status_code`, `cipi_app_healthcheck_duration_milliseconds` |
| `cipi_metrics_collected_timestamp_seconds` | `cipi_app_workers_up`, `cipi_app_workers_total` |

Example alert rules built on them:

```yaml
groups:
  - name: cipi
    rules:
      - alert: AppDown
        expr: cipi_app_healthcheck_up == 0
        for: 3m
      - alert: PoolSaturated
        expr: cipi_app_fpm_max_children_reached > 0
        for: 10m
      - alert: Many5xx
        expr: cipi_app_http_5xx_per_minute > 20
        for: 5m
      - alert: WorkerMissing
        expr: cipi_app_workers_up < cipi_app_workers_total
        for: 5m
      - alert: CollectorStale
        expr: time() - cipi_metrics_collected_timestamp_seconds > 300
```

> [!warning] The endpoint is plain HTTP: keep it on a private network or a tunnel (WireGuard, Tailscale). `0.0.0.0/0` is refused, and the panel API can't turn it on, because it opens a port.

### The panel, the API, the SDK and AI assistants {#api}

| Interface | What |
| --- | --- |
| [Web panel](/docs/gui-overview) 4.3+ | A Metrics tab per server and per app: charts from 1 hour to 30 days with markers, hover details, 30-day uptime bars, the events timeline, retention and heartbeat settings. Refreshes every 30 seconds while open |
| [REST API](/docs/api) | `GET /api/metrics`, `/api/metrics/series`, `/api/apps/{name}/metrics`, `/api/metrics/uptime`, `/api/metrics/events`; abilities `metrics-view`, `metrics-manage` |
| [PHP SDK](/docs/php-sdk) | `$cipi->metrics()->series('shop', ['req', 'http_5xx'], '7d')` |
| [cipi-cli](/docs/cli-client) | `cipi-cli metrics`, `metrics show --app shop`, `metrics uptime` |
| [MCP](/docs/mcp) | Ask your assistant *"when did the 5xx on shop start, and what was deployed just before?"* |

## What metrics don't do {#limits}

| Need | Use |
| --- | --- |
| Alerts | The [monitor](/docs/monitor), [health checks](/docs/health-checks) and [notifications](/guides/server-monitoring-alerts) |
| Slow routes, queries and jobs inside the app | Laravel Pulse or Telescope |
| Exceptions with stack traces | An error tracker such as [Boogle](/guides/boogle-laravel-monitoring) |
| Uptime seen from the internet | An external monitor, plus the heartbeat |
| Long-term history across a fleet | Prometheus or Grafana, scraping OpenMetrics |

```bash
$ sudo cipi metrics probe off     # stop the per-minute probe (the 5-minute check stays)
$ sudo cipi metrics disable       # stop collecting, keep the history
```
