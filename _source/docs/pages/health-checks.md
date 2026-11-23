@section cli-health

Two different questions, two checks: *is the site up?* and *did the release I just shipped break it?* Combined with automatic rollback, a bad deploy can undo itself within seconds.

<cipi-term name="health"></cipi-term>

| Check | Runs | Alerts |
| --- | --- | --- |
| Periodic probe | Every 5 minutes | After 3 consecutive failures (`health_fail`) |
| Post-deploy check | Right after every release, CLI and webhook alike | Immediately (`deploy_health_fail`) |

```bash
$ cipi health set myapp --url=https://myapp.com/up --expect=200
$ cipi health check myapp
$ cipi health list [--json]
$ cipi health unset myapp
```

Laravel 11+ serves `/up` when `health: '/up'` is set in `bootstrap/app.php`. The URL must belong to the app's own domains.

## After every deploy {#postdeploy}

```flow
Release live | symlink swapped
> The deploy swapped `current` to the new release: it's serving traffic now.
Grace period | 3 s, 8 s for Octane
> Cipi waits a moment (3 seconds, 8 for Octane, configurable with `--grace`) so caches and workers can warm up.
Probe up to 5× | tolerant of warm-up
> It calls your health URL up to five times, so one slow first request doesn't count as a failure.
Verdict | in the deploy notice
> The result goes into the deploy notification. A success message is only sent after a healthy verdict.
Optional rollback | if unhealthy
> With `--rollback-on-unhealthy` (or `rollback_on_unhealthy: true` in `cipi.yml`), an unhealthy release is replaced by the previous one within seconds.
```

```bash
$ cipi health set myapp --grace=15            # longer warm-up (max 120 s)
$ cipi health set myapp --no-postdeploy       # keep the 5-minute probe only
$ cipi health postdeploy myapp                # run the verification now
```

The success notification is sent **after** the verdict, so it never announces a release that returns errors. A failed verdict tells you where the check is configured and how to change it.

## Automatic rollback {#auto-rollback}

```bash
$ cipi health set myapp --rollback-on-unhealthy   # always, for this app
$ cipi deploy myapp --rollback-on-unhealthy       # this deploy only
```

| Outcome reported | Meaning |
| --- | --- |
| Recovered | The previous release answers healthy again |
| Rolled back, still unhealthy | The cause probably isn't the code (database, external service) |
| Rollback failed | The bad release is still live: act now |
| Nothing to roll back to | First release |

> [!warning] Off by default on purpose: **migrations are not undone**. Enable it for apps whose migrations are backwards-compatible, or pair it with [pre-deploy snapshots](/docs/safe-deploy).

Also in [cipi.yml](/docs/yml) (`health:`), the REST API and the panel. To watch the server rather than the app, see [Server monitor](/docs/monitor).

## Uptime history {#history}

Since Cipi 5.11.0 the URL is also probed **every minute** by the [metrics](/docs/metrics) collector, which keeps the status and response time: uptime over 24 hours, 7 and 30 days, minutes down, incidents and uptime per day.

```bash
$ cipi metrics uptime myapp --range=30d
```

The alerts above don't change: the history only records. `cipi metrics probe off` stops the per-minute probe.
