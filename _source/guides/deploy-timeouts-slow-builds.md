---
title: When a deploy runs out of time — slow builds, long migrations, npm on a small VPS
description: Find the step that makes a Laravel or Node deploy fail on time, decide whether it needs more time or a fix, and set per-app limits from the CLI, cipi.yml, the web panel or the API — with the previous release serving throughout.
category: ops
order: 4
published: 2026-11-28
updated: 2026-11-28
howto: yes
keywords: deploy timeout laravel, npm run build timeout vps, vite build killed, deployer timeout, laravel migration timeout deploy, nuxt build out of memory vps
related:
  - laravel-ci-cd-git-workflow
  - laravel-zero-downtime-migrations
  - server-monitoring-alerts
faq:
  - Is the site down while a deploy fails? | No. The previous release keeps serving; the new one never goes live, and the lock is released.
  - What are the default limits? | 5 minutes for each step (clone, Composer, a migration, `optimize`), 30 minutes for the front-end build — for a Node app, 30 for the install and 30 for the build.
  - What are the maximums? | 1 hour for the build, 30 minutes for every other step. A deploy started from the panel, the API, cipi-cli or the SDK is followed for 2 hours in all.
  - Where do I set them? | `sudo cipi app deploy-config`, `deploy.build_timeout` and `deploy.step_timeout` in cipi.yml, the panel's Deploy pipeline, the API or the SDK.
  - Does a custom app have limits? | It deploys with a `git pull`, with no steps to time.
  - What if a step fails? | Read the table below first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community.
docs:
  - deploying
  - deploy-script
  - node-apps
  - yml
---
Every command of a deploy runs against a clock: a step that hangs — a migration waiting on a lock, an `npm install` stuck on a registry, a build that asks a question — can't hold the deploy and its lock for ever. When the clock runs out, the deploy fails like any other: **the previous release keeps serving**, and Cipi says which step it was.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Step** | One command of the deploy: clone, `composer install`, a migration, `optimize`, a task of yours |
| **Build** | The front-end build (`npm run build`), the step that is long by nature |
| **`step_timeout`** | How long any step may take: 300 seconds by default, up to 1800 |
| **`build_timeout`** | How long the build may take: 1800 seconds by default, up to 3600 |

## 1. Find the step {#find}

`sudo cipi deploy` names it, right under the failure:

```bash
$ sudo cipi deploy shop
…
[ERROR] Deploy failed (exit 1)
[WARN] The step artisan:migrate was stopped after 300 seconds, the most Deployer gives a command.
```

The log has a time on every line: the gap before the error is the step that took it.

```bash
$ sudo cipi deploy shop --log=200
$ sudo cipi deploy shop --history          # how long the last deploys took
```

The panel shows the same in the app's **Deploy** tab and in each deploy's log. A deploy failed on time is also in the failure notification.

## 2. More time, or a fix? {#decide}

| The slow step | Usually | Do |
| --- | --- | --- |
| A migration rewriting a large table | Legitimately long | More `step_timeout`, and consider a [migration that doesn't lock](/guides/laravel-zero-downtime-migrations) |
| `composer install` on a slow disk or first deploy | Legitimately long | More `step_timeout` |
| `npm ci` / `npm run build` that passes some days and not others | Close to the limit; the server is the variable | See [below](#flaky) before raising anything |
| A build that never ends | It waits for an answer | `CI=true` in front of the script in `package.json` |
| A step that stops with `Killed` | Out of memory, not out of time | More RAM or swap; more time won't help |

## 3. Give the app more time {#raise}

```bash
$ sudo cipi app deploy-config shop                         # the current limits
$ sudo cipi app deploy-config shop --step-timeout=900      # 15 minutes for every step
$ sudo cipi app deploy-config shop --build-timeout=2700    # 45 minutes for the build
```

Or in the repository, so it travels with the code:

```yaml
# cipi.yml
version: 1
deploy:
  step_timeout: 900
  build_timeout: 2700
```

From the **web panel**: the app → **Deploy** → *Deploy pipeline*, two fields with the minutes beside them. Over the API: `PUT /api/apps/shop/deploy-config` with `step_timeout`, `build_timeout`; `cipi-cli deploy config set shop --step-timeout 900`. The change counts from the next deploy. A value outside the range is refused, and nothing changes.

## 4. A build that passes some days and not others {#flaky}

| Cause | Check | Fix |
| --- | --- | --- |
| The server swaps during the build | Memory and swap in the [metrics](/docs/metrics); deploys are marked on the charts | More RAM; or build in CI |
| A backup or another deploy at the same time | The time of the failures | Move the nightly work, or deploy at another time |
| A slow registry | The install step is the long one | A lockfile in the repository; it still fits the 30 minutes |
| An interactive script | The log stops at a question | `CI=true` |

## 5. Or don't build on the server {#ci}

A build that can't finish in an hour on the server is better done elsewhere: run `npm run build` in CI and commit the built assets to the branch Cipi deploys (or a release branch), and leave the front-end build off the app. The server then only pulls and links. See [CI/CD workflows](/guides/laravel-ci-cd-git-workflow).

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| The panel stopped following a deploy | It follows one for 2 hours; the deploy itself goes on. `sudo cipi deploy shop --status` |
| `--build-timeout` refused | 60 to 3600 seconds; `--step-timeout` 60 to 1800 |
| The limit in cipi.yml is ignored | The file is applied with its plan: `sudo cipi yml plan shop` shows whether it's pending, `sudo cipi yml apply shop` applies it (or turn on auto-apply). A value outside the range blocks the plan |
| The deploy is locked after the failure | It isn't: a timed-out deploy releases its lock. An interrupted one (reboot) does with `sudo cipi deploy shop --unlock` |
