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

Deployer and Composer always use **the app's PHP version**, whatever started the deploy. Old releases beyond the last five are pruned. Octane apps reload Octane; apps with a [front-end build](/docs/manage-apps#edit) run it right after Composer, well before the swap, with [more time than the other steps](#time-limits).

Workers are not stopped before the swap: the deploy never waits for a long job, and jobs keep running on the previous release until it is live. Write migrations the previous release can live with for a minute — add columns before using them, drop them a release later — as you would for any zero-downtime deploy. See [workers during deploys](/docs/workers#deploys).

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

A failed deploy releases its own lock, and the lock of an interrupted one is removed by the next deploy, automatic or by hand, when no deploy of the app is alive (the deploy log says so). `--unlock` is only for clearing it right away.

## How long a step may take {#time-limits}

Every command of a deploy runs against a clock, so one that hangs cannot hold the deploy, and its lock, for ever. The front-end build is the step that is long by nature, and has a clock of its own. Both have a default that suits most apps, and [each app can have its own](#change-limits).

| Step | May run for | Setting |
| --- | --- | --- |
| Clone, Composer, migrations, `optimize`, every other command | 5 minutes each | `step_timeout` |
| The front-end build of a Laravel app ([`--node-build`](/docs/deploy-script#options)) | **30 minutes** | `build_timeout` |
| A [Node app](/docs/node-apps): installing the packages, and building | **30 minutes** each | `build_timeout` |
| A deploy started from the [web panel](/docs/gui), the [REST API](/docs/api), [cipi-cli](/docs/cli-client) or the [PHP SDK](/docs/php-sdk), from start to end | 2 hours | fixed |

When a step runs out of time the deploy fails like any other failed deploy: **the previous release keeps serving**, the lock is released, and `cipi deploy` says which step it was, right under `Deploy failed`:

```bash
$ cipi deploy myapp
…
[ERROR] Deploy failed (exit 1)
[WARN] The step artisan:migrate was stopped after 300 seconds, the most Deployer gives a command.
[WARN] What it was doing when it stopped: cipi deploy myapp --log
```

The log has a time on every line: the gap before the error is the step that took it.

### Give an app more time, or less {#change-limits}

The two clocks are settings of the app, in seconds:

```bash
$ cipi app deploy-config myapp                          # shows build_timeout and step_timeout
$ cipi app deploy-config myapp --build-timeout=2700     # 45 minutes for the build
$ cipi app deploy-config myapp --step-timeout=900       # 15 minutes for every other command
$ cipi app deploy-config myapp --build-timeout=1800 --step-timeout=300   # back to the defaults
```

| Setting | Times | Default | From – to |
| --- | --- | --- | --- |
| `--build-timeout` | The front-end build: `cipi:node_build` of a Laravel app; the install and the build of a Node app, each | 1800 (30 min) | 60 – 3600 (1 hour) |
| `--step-timeout` | Every other command of the deploy: clone, Composer, a migration, `optimize`, a task of your own | 300 (5 min) | 60 – 1800 (30 min) |

The change is in effect from the next deploy. A number outside the range is refused and nothing is changed. The same two settings from everywhere else:

| Where | How |
| --- | --- |
| [cipi.yml](/docs/yml#file) | `deploy.build_timeout` and `deploy.step_timeout`, in the repository |
| [Web panel](/docs/gui-overview) | App → Deploy → *Deploy pipeline*: two fields, with the minutes beside them |
| [REST API](/docs/api) | `PUT /api/apps/{name}/deploy-config` with `build_timeout`, `step_timeout` |
| [cipi-cli](/docs/cli-client) | `cipi-cli deploy config set myapp --build-timeout 2700 --step-timeout 900` |
| [PHP SDK](/docs/php-sdk) | `$cipi->deployConfig()->update('myapp', ['build_timeout' => 2700])` |

Both apply to Laravel apps (PHP-FPM and Octane) and to Node apps. A custom app deploys with a `git pull`, which has no steps to time.

> [!tip] Raise `step_timeout` for a migration that rewrites a large table, or a Composer install on a slow disk. Raise `build_timeout` only after looking at *why* the build is slow: more time lets a build that swaps finish, it does not make it healthy.

### A build that passes some days and not others {#flaky-build}

It is a build that is close to its limit, and what tips it over is the server. The usual reasons, most common first:

| Reason | What to do |
| --- | --- |
| The build needs more memory than the server has free, and the server swaps | Memory and swap at the time of the deploy are in the [metrics](/docs/metrics), and the panel marks each deploy on their charts. More RAM is the fix that lasts |
| It runs next to something heavy: a backup, another app's deploy, a queue at full load | Deploy at another moment, or move the nightly work |
| `npm ci` downloads every package again on each deploy, from a registry that is slow that day | Nothing to fix: it is inside the 30 minutes. A lockfile in the repository keeps the install the same every time |
| The build asks a question and waits for an answer nobody gives | Make the script non-interactive: `CI=true` in front of it in `package.json` (Node apps are built with it already) |

> [!note] A build that cannot finish in an hour on the server is better done in CI, with the built assets committed to the branch Cipi deploys — or on a server with more memory. The guide [When a deploy runs out of time](/guides/deploy-timeouts-slow-builds) walks through finding the slow step.

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
| `The command "… node-build.sh …" exceeded the timeout of 300 seconds` at `cipi:node_build` | The recipe was written by an old release, which gave the build the 5 minutes of every other step: `cipi self-update` gives every app's recipe the build's own [clock](#time-limits). A recipe you edited by hand is left alone — `cipi deploy` then names the command that regenerates it |
| `exceeded the timeout` at another step | That command ran for its [5 minutes](#time-limits). `cipi deploy myapp --log` shows what it was doing. If the step is simply long — a migration on a large table — [give the app more](#change-limits): `cipi app deploy-config myapp --step-timeout=900`. A migration that takes longer than half an hour is better taken out of the deploy (`--no-migrate`) and run by hand once the release is live: `cipi app artisan myapp migrate --force` |
| The build is stopped at 30 minutes | Look at [why it is slow](#flaky-build) first; then `cipi app deploy-config myapp --build-timeout=3600` gives it up to an hour |
| Migration fails | The old release keeps serving; fix the migration and deploy again |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Does a failed deploy take the site down? | No. The new release goes live only after every step succeeded. |
| Do I have to unlock after a failure? | No. A failed deploy releases its lock, an interrupted one is cleared by the next deploy, and a new push deploys even after a failed commit. |
| How do I go back? | `cipi deploy myapp --rollback`, instant. |
| How long can a deploy take? | Each step has [its own limit](#time-limits): 5 minutes, 30 for the front-end build, and [both can be changed per app](#change-limits). A deploy from the panel, the API, cipi-cli or the SDK has two hours in all. |
| Can I change the limits for every app at once? | They are per app. Put `deploy.build_timeout` and `deploy.step_timeout` in each repository's [cipi.yml](/docs/yml), or run `cipi app deploy-config` for each app. |
| My build takes more than 5 minutes. Is that a problem? | No: the build has 30. |
| Are migrations rolled back too? | No: rollback restores code. Use a [pre-deploy snapshot](/docs/safe-deploy) for data. |
