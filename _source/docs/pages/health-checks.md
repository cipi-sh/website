@section cli-health

Two different questions, two checks: *is the site up?* and *did the release I just shipped break it?* Combined with automatic rollback, a bad deploy can undo itself within seconds.

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
Grace period | 3 s, 8 s for Octane
Probe up to 5× | tolerant of warm-up
Verdict | in the deploy notice
Optional rollback | if unhealthy
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
