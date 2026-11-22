@section cli-deploy

A deploy builds the new release next to the live one and switches traffic with a single atomic symlink. Visitors never see a half-deployed app, and the previous five releases stay ready for an instant rollback.

<cipi-term name="deploy"></cipi-term>

## The pipeline {#pipeline}

```flow
Stop workers | no old code on new data
Clone | into releases/N
Composer | --no-dev, app's PHP
Link shared | .env, storage
Migrate & optimize | migrate --force, optimize
Swap | current → releases/N
Restart & verify | workers, health check
```

Deployer and Composer always use **the app's PHP version**, whatever started the deploy. Old releases beyond the last five are pruned. Octane apps reload Octane; apps with a [front-end build](/docs/manage-apps#edit) run it before the swap.

## Commands {#commands}

| Command | Does |
| --- | --- |
| `cipi deploy myapp` | Deploy the latest commit of the branch |
| `cipi deploy myapp --rollback` | Back to the previous release, instantly |
| `cipi deploy myapp --status` | Is a deploy running, queued or interrupted? (safe to poll) |
| `cipi deploy myapp --history` | Past deploys and rollbacks: result, release, duration, trigger |
| `cipi deploy --last` | The last deploy of every app |
| `cipi deploy myapp --releases` | Releases on disk with date, duration, commit |
| `cipi deploy myapp --log=200` | Timestamped deploy log |
| `cipi deploy myapp --audit` | Who deployed what, from where ([audit ledger](/docs/deploy-audit)) |
| `cipi deploy myapp --snapshot` | Dump the database first ([safe deploy](/docs/safe-deploy)) |
| `cipi deploy myapp --rollback-on-unhealthy` | Undo the release if the [health check](/docs/health-checks) fails |
| `cipi deploy myapp --key` / `--webhook` | Show the deploy key / webhook URL and token |
| `cipi deploy myapp --unlock` | Clear the lock of an interrupted deploy |
| `cipi deploy myapp --trust-host=git.example.com:2222` | Trust a self-hosted Git server |

## Know whether it worked {#outcome}

| Signal | Detail |
| --- | --- |
| Exit code | Non-zero on failure, so CI and scripts can react |
| Email / alerts | Success and failure, with branch, release, commit, author, duration and health verdict ([notifications](/docs/notifications)) |
| Log | `~/logs/deploy.log`: every line timestamped, each run framed by trigger, branch, release and duration |
| History | `--history` reads rotated logs too, so last month's webhook deploy still shows how long it took |

The success notice is sent only **after** the post-deploy health check, so it never announces a release that returns errors.

## Status values {#status}

| `--status` | Meaning |
| --- | --- |
| `running` | Building (`deploy`) or verifying (`post-deploy`); shows trigger, branch and elapsed time |
| `queued` | A push arrived; the deploy starts within a minute |
| `interrupted` | The process died (reboot, kill); clear with `--unlock` |
| `idle` | Nothing running; shows how the last run ended |

A failed deploy releases its own lock; only an interrupted one needs `--unlock`.
