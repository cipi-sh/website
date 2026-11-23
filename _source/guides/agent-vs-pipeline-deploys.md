---
title: "Push to deploy or CI pipeline? Agent vs pipeline deploys for Laravel"
description: How Cipi's two deploy modes work, side by side, with an honest verdict on when to use the agent's push-to-deploy webhook, when to use a CI pipeline, and how to switch between them.
category: laravel
order: 17
published: 2026-11-23
updated: 2026-11-23
howto: no
keywords: laravel push to deploy vs ci, laravel deploy webhook or github actions, laravel auto deploy vs pipeline, cipi agent webhook, laravel continuous deployment self-hosted
related:
  - laravel-ci-cd-git-workflow
  - laravel-jenkins-deploy
  - laravel-aws-codedeploy
docs:
  - how-deploys-work
  - auto-deploy
  - ci-pipelines
  - agent-install
  - jenkins
  - aws-codedeploy
faq:
  - Is one mode faster? | Push to deploy starts within a minute of the push. A pipeline starts the deploy after your tests, so it takes as long as the tests plus the deploy. The deploy itself is the same in both.
  - Is one mode more secure? | Push to deploy gives nobody access to the server: the Git provider only calls a signed URL on your app. A pipeline needs a secret on the CI side; with an API token limited to `deploy-manage`, the exposure is small.
  - Can I use both on the same app? | Not on the same branch: both would deploy every push, and the second one hits the deploy lock. Use one mode per app, or the webhook on staging and a pipeline on production.
  - Do I need the agent for pipelines? | No. Pipelines work over SSH or the API for every app. The agent is needed for push to deploy in Laravel apps.
  - What does the agent install in my app? | A Composer package with a few routes under `/cipi`: the deploy webhook, a health endpoint and, if you turn them on, an MCP server and a database anonymizer. See [Install the agent](/docs/agent-install).
  - Which mode do most people use? | Start with push to deploy: it takes two minutes and covers most apps. Move to a pipeline when a broken test has reached production once, or when the team grows.
  - Does the mode change how migrations run? | No. In both modes the server runs migrations inside the new release, before it goes live.
  - Can I deploy a specific commit? | Neither mode pins a commit: the server deploys the latest commit of the app's branch. Keep one deploy per branch at a time and it's the commit you just pushed or tested.
---
Every Cipi deploy runs on your server and does the same thing: pull the branch from Git, build a new release, migrate, switch to it with zero downtime, check it. The only question is **who presses the button**: your Git provider, every time you push (agent mode), or your CI, when the tests pass (pipeline mode).

## In 30 seconds {#tldr}

| | Push to deploy (agent) | CI pipeline |
| --- | --- | --- |
| Starts | On every push to the branch | When the pipeline's deploy job runs |
| Tests before going live | No | Yes |
| Setup | 2 minutes, mostly automatic | 10 to 30 minutes, once |
| Secret outside the server | None | An API token or an SSH key in CI |
| Best for | Side projects, staging, small teams, fast iteration | Production with real users, teams, regulated apps |

**Our verdict:** push to deploy for staging and personal projects; a pipeline for production once other people depend on the app. Many teams run both: webhook on staging, pipeline on production.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Deploy branch** | The Git branch an app follows, `main` by default. Only pushes to it deploy |
| **Webhook** | A URL your Git provider calls after every push. Cipi's is `https://your-app/cipi/webhook` |
| **Agent** | [`cipi/agent`](/docs/agent-install), a Composer package that receives the webhook in a Laravel app |
| **Pipeline** | The steps your CI runs on each push: install, test, then deploy |
| **Deploy lock** | Cipi lets only one deploy per app run at a time |

## How push to deploy works {#agent}

```flow
git push | to main
> You push to the deploy branch.
Signed webhook | provider → your app
> GitHub, GitLab, Bitbucket, Gitea, Forgejo or Azure DevOps call `/cipi/webhook` on your app, signed with a secret only they and your server know.
Agent queues | answers in milliseconds
> The agent checks the signature and the branch, leaves a small trigger file for the server and answers immediately.
Server deploys | within a minute
> A cron job on the server picks up the trigger and runs the normal deploy as the app user.
```

What makes it good:

- **Nothing to configure.** With a Git provider token saved on the server, Cipi creates the webhook and its secret when it creates the app. You add `composer require cipi/agent` once.
- **No access for anyone.** No SSH key, no API token leaves the server. The provider only calls your app over HTTPS.
- **Fast feedback.** Push, and about a minute later it's live.

What it doesn't do: it deploys every push to the branch, **including a push with a failing test**. Cipi's [health check](/docs/health-checks) can roll back a release that doesn't answer, but it can't know your tests failed.

## How a pipeline works {#pipeline}

```flow
git push | to main
> You push. The webhook is off for this app, so nothing deploys yet.
Tests | on CI machines
> Your CI installs the app and runs `php artisan test`. Red tests stop everything here.
Deploy | SSH or API
> The deploy job asks the server to deploy, over SSH or through the Cipi API, and waits for the result.
Check | health URL
> The job calls the app's health URL. If the new release doesn't answer, the job rolls back and turns red.
```

What makes it good:

- **A gate.** Only code that passes the tests reaches production.
- **More steps.** A backup before the release, an approval, a message to the team, a deploy to several servers in order.
- **Visible.** Every deploy is a green or red job in the tool your team already watches.

What it costs: a secret in CI, a workflow file to maintain, and slower releases (your tests run first).

## Side by side {#compare}

| | Push to deploy (agent) | CI pipeline |
| --- | --- | --- |
| Who starts the deploy | The Git provider | Your CI job |
| Time from push to live | About a minute | Test time + about a minute |
| Failing tests | Still deployed | Never deployed |
| Bad release that crashes | Rolled back by Cipi if [automatic rollback](/docs/health-checks#auto-rollback) is on | Rolled back by the pipeline's health check, or by Cipi |
| Secret outside the server | None | API token (`deploy-manage` only) or SSH key |
| Network | Provider → your app over HTTPS | CI → server over SSH (port 22) or the API |
| Works with | GitHub, GitLab, Bitbucket, Gitea, Forgejo, Azure DevOps | Any CI: GitHub Actions, GitLab, Bitbucket, Azure, Jenkins, CircleCI, AWS CodeDeploy… |
| App requirement | `cipi/agent` (Laravel); built in for Node apps | None |
| Approvals before production | No | Yes, with your CI's environments |
| Several servers | One webhook per app on each server | One pipeline deploys them in order |
| Where you see the result | [Deploy notifications](/docs/deploy-notifications), panel, `cipi deploy --status` | The CI job, plus the same notifications |
| Audit ledger origin | `webhook`, with pusher and commit | `cipi-cli` (SSH) or `panel` (API), with the operator |

## When to choose push to deploy {#choose-agent}

- A personal project, a prototype, an internal tool.
- A **staging** app where fast feedback matters more than a gate.
- A team that deploys many times a day and has good tests running elsewhere (pull request checks), so `main` is always green.
- You don't want any server secret stored in a third-party CI.

Set it up: [Auto-deploy on push](/docs/auto-deploy).

## When to choose a pipeline {#choose-pipeline}

- Production with paying users.
- More than one person pushes to the deploy branch.
- You need a backup, an approval or a compliance trail before every release.
- Your company already standardised on a CI: [GitHub Actions, GitLab, Bitbucket, Azure, Forgejo, CircleCI](/docs/ci-pipelines), [Jenkins](/docs/jenkins) or [AWS CodeDeploy](/docs/aws-codedeploy).

Set it up: [CI/CD for Laravel](/guides/laravel-ci-cd-git-workflow).

## The hybrid most teams end up with {#hybrid}

Two Cipi apps from the same repository, one per environment, each with its own branch and its own mode.

| App | Branch | Mode |
| --- | --- | --- |
| `shop-staging` | `develop` | Push to deploy: every push is live on staging a minute later |
| `shop` | `main` | Pipeline: merge `develop` into `main`, tests run, then deploy |

```bash
# staging follows develop and keeps its webhook
$ cipi app create --user=shop-staging --domain=staging.shop.example.com \
    --repository=git@github.com:you/shop.git --branch=develop --env=staging
# production follows main; turn its webhook off and deploy from CI
$ cipi app edit shop --branch=main
```

Each app can read its own [`cipi-staging.yml`](/docs/yml) or `cipi.yml`, so workers, crons and limits can differ.

## Switching from one mode to the other {#switch}

### From push to deploy to a pipeline {#to-pipeline}

```flow
Add the pipeline | workflow file + secrets
> Add the workflow for your CI and its secrets. Don't push yet.
Turn the webhook off | in the Git provider
> GitHub: Settings → Webhooks → the `/cipi/webhook` hook → untick Active. Other providers: see the docs.
Push | first pipeline deploy
> Push a small change. Only the pipeline deploys now.
Verify | audit origin
> `cipi deploy shop --audit`: the newest entry should not say `webhook`.
```

Keep the agent installed: its health endpoint and MCP server are still useful.

### From a pipeline back to push to deploy {#to-agent}

```bash
$ composer require cipi/agent          # if the app doesn't have it yet; commit and push
$ sudo cipi deploy shop                # once, so the /cipi/webhook route exists
$ sudo cipi app webhook recreate shop  # re-create the webhook in the Git provider
```

Then remove the deploy job from your pipeline (keep the tests: they still protect pull requests).

## Mistakes to avoid {#mistakes}

| Mistake | What happens | Instead |
| --- | --- | --- |
| Webhook and pipeline both on | Two deploys per push; the second hits the lock and fails | One mode per app |
| Rolling back whenever the deploy command fails | A failed build publishes nothing; the rollback takes you to older code | Roll back only when the new release is live and unhealthy ([why](/docs/ci-pipelines#deploy-step)) |
| Giving CI a personal SSH key | Leaks your access with the CI | A dedicated key, or an API token with `deploy-manage` |
| Calling the agent webhook from CI and expecting a result | CI turns green before the deploy even starts | Use SSH or the API when CI must wait |
| No health URL | A release that returns 500 counts as deployed | Set `cipi health set shop --url=https://shop.example.com/up` |

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Push doesn't deploy (agent mode) | Wrong branch, or no webhook: `cipi git status`, then `cipi app webhook recreate shop` |
| 404 on `/cipi/webhook` | The agent isn't deployed yet: `sudo cipi deploy shop` once after adding it |
| Two deploys per push | Turn the webhook off for the app that uses a pipeline |
| "Deploy locked" in CI | Limit your CI to one deploy at a time; if nothing runs, `sudo cipi deploy shop --unlock` |
| Pipeline green, site broken | Add the health check step from the [recipes](/docs/ci-pipelines#recipes) |
