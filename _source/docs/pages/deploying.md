@section cli-deploy

A deploy builds the new release next to the live one and switches traffic with a single atomic symlink. Visitors never see a half-deployed app, and the previous five releases stay ready for an instant rollback.

<cipi-term name="deploy"></cipi-term>

## The pipeline {#pipeline}

```flow
Stop workers | no old code on new data
> Queue workers stop first (each finishes its current job), so no job runs old code against a database the new release is about to migrate.
Clone | into releases/N
> The repository is cloned into a new folder, `releases/<timestamp>`. The live release is untouched and keeps serving visitors.
Composer | --no-dev, app's PHP
> `composer install --no-dev` runs with **the app's** PHP version, inside the new folder.
Link shared | .env, storage
> `.env` and `storage/` live in `shared/` and are linked into the release, so they survive every deploy and rollback.
Migrate & optimize | migrate --force, optimize
> `php artisan migrate --force` and `optimize` run in the new release. If something fails here, the deploy stops and the old release is still live.
Swap | current → releases/N
> The `current` link switches to the new folder in one atomic step. Requests before the switch got the old code; requests after get the new one. None fail.
Restart & verify | workers, health check
> Workers start again on the new code. With a health check set, Cipi probes the site and can roll back automatically.
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

## In the web panel {#in-the-panel}

Deploy, follow the release and read the audit from the browser. The [web panel](/docs/gui) is optional; everything here also works from the CLI.

<cipi-clips name="deploy"></cipi-clips>
