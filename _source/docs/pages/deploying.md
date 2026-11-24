@section cli-deploy

A deploy builds the new release next to the live one and switches traffic with a single atomic symlink. Visitors never see a half-deployed app, and the previous five releases stay ready for an instant rollback.

<cipi-term name="deploy"></cipi-term>

## The pipeline {#pipeline}

```flow
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
> Horizon and the queue workers finish the job in hand and start again on the new code; Octane and Reverb reload. With a health check set, Cipi probes the site and can roll back automatically.
```

Deployer and Composer always use **the app's PHP version**, whatever started the deploy. Old releases beyond the last five are pruned. Octane apps reload Octane; apps with a [front-end build](/docs/manage-apps#edit) run it before the swap.

Workers are not stopped before the swap (since 5.13.0): the deploy never waits for a long job, and jobs keep running on the previous release until it is live. Write migrations the previous release can live with for a minute — add columns before using them, drop them a release later — as you would for any zero-downtime deploy. See [workers during deploys](/docs/workers#deploys).

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
| `cipi deploy myapp --unlock` | Clear the lock of an interrupted deploy now, and resume a [paused commit](#paused) |
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
| `interrupted` | The process died (reboot, kill); the next deploy removes the lock it left |
| `idle` | Nothing running; shows how the last run ended |

`--status` also shows **Paused** when a commit's automatic deploy failed ([below](#paused)); `--status --json` has it as `paused_commit`.

A failed deploy releases its own lock, and since 5.13.0 the lock of an interrupted one is removed by the next deploy, automatic or by hand, when no deploy of the app is alive (the deploy log says so). `--unlock` is only for clearing it right away.

## Pushes during a deploy {#queue}

A push that arrives while the app is deploying is **queued, not lost**: it deploys as soon as the running deploy is over, post-deploy steps and health check included. Several pushes in the meantime make one deploy, of the branch as it is then. `cipi deploy myapp` by hand while a deploy runs stops at once with *A deploy of 'myapp' is running* (exit 1), before touching anything.

## A commit that fails is paused {#paused}

When an automatic deploy (webhook, agent retry) fails with the code in hand — Composer, a migration, the build — Cipi pauses **that commit**: a redelivered webhook or a retry does not build it again (`===== deploy skipped … commit=<sha> …` in the deploy log). Everything else keeps moving:

| What happens next | Result |
| --- | --- |
| You push a fix (a new commit) | Deploys as usual and clears the pause |
| `cipi deploy myapp` or the panel's **Deploy now**, and it succeeds | Clears the pause |
| `cipi deploy myapp --unlock` | Clears the pause: the next push or webhook may build the same commit again |
| The failure happened before the code was fetched (SSH, disk, Deployer) | Nothing is paused: it is not the commit's fault |

The failure alert names the paused commit; `cipi deploy myapp --status` shows it as **Paused**, and the [web panel](/docs/gui) shows it above the app's tabs with *Deploy now* and *Resume automatic deploys*.

## In the web panel {#in-the-panel}

Deploy, follow the release and read the audit from the browser. The [web panel](/docs/gui) is optional; everything here also works from the CLI.

<cipi-clips name="deploy"></cipi-clips>

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| `Permission denied (publickey)` | Deploy key missing on the repository: `cipi deploy myapp --key` |
| *A deploy of 'myapp' is running* | One is in flight: `cipi deploy myapp --status`. A push waits in the queue by itself |
| A push did not deploy | The same commit failed before and is [paused](#paused): push a fix, or `--unlock` to let it build again |
| Composer fails on PHP version | Align `--php` with what `composer.lock` needs |
| Migration fails | The old release keeps serving; fix the migration and deploy again |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Does a failed deploy take the site down? | No. The new release goes live only after every step succeeded. |
| Do I have to unlock after a failure? | No. A failed deploy releases its lock, an interrupted one is cleared by the next deploy, and a new push deploys even after a failed commit. |
| How do I go back? | `cipi deploy myapp --rollback`, instant. |
| Are migrations rolled back too? | No: rollback restores code. Use a [pre-deploy snapshot](/docs/safe-deploy) for data. |
