---
title: CI/CD for Laravel with GitHub Actions or GitLab CI
description: Test on every push and deploy only when tests pass, with a health check that rolls back a broken release, a dedicated CI key, an optional backup step and zero-downtime releases.
category: laravel
order: 6
published: 2026-03-24
updated: 2026-11-23
howto: yes
keywords: laravel github actions deploy, laravel gitlab ci deploy, laravel ci cd vps, laravel deploy pipeline
related:
  - laravel-preview-environments
  - laravel-zero-downtime-migrations
  - deploy-laravel-ubuntu-vps
faq:
  - Webhook or pipeline? | Use the webhook when every push to a branch should deploy. Use a pipeline when deploys depend on tests, a backup or an approval; then turn the webhook off.
  - Can the CI key do anything else on the server? | The `cipi` user can run `sudo cipi …` without a password, which covers every Cipi command, deleting apps included, but not other programs as root. For the least privilege, use an API token with only `deploy-manage`.
  - Webhook or CI? | The webhook deploys every push, fast and simple. CI deploys only when tests pass. You can also keep the webhook on staging and use CI for production.
  - Can I deploy without giving CI SSH access? | Yes: use `cipi-cli` with an API token that has only the `deploy-manage` ability, as shown in "Without SSH". It's also the safer choice for production.
  - Why not roll back whenever the deploy command fails? | Because a deploy that fails while building publishes nothing: the previous release is still serving. Rolling back then would go one release further back. Roll back only when the new release is live and the health check fails.
  - How do I run migrations in CI? | You don't: the deploy runs them on the server, inside the new release, before it goes live.
  - What if a step fails? | Read the troubleshooting table above first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community. Most commands print the fix when they refuse something.
  - Do I need the web panel for this? | No. Every step works from the CLI. The optional [web panel](/web-panel) shows the same things in a browser.
docs:
  - ci-pipelines
  - auto-deploy
  - safe-deploy
  - health-checks
  - cli-client
---
Push-to-deploy is great until a broken test reaches production. A pipeline adds the gate: test, optionally back up, deploy, check that the app answers, and roll back only if it doesn't. For every other CI (Bitbucket, Azure, Forgejo, CircleCI, Jenkins, AWS CodeDeploy) see [CI/CD pipelines](/docs/ci-pipelines).

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **CI** | Continuous integration: tests run on every push |
| **CD** | Continuous delivery: a passing build deploys by itself |
| **Pipeline / workflow** | The list of steps GitHub Actions or GitLab CI runs |
| **Secret** | A value stored in the CI settings (a key, a token), never in the repository |

## Before you start {#before}

- A Laravel app deployed with Cipi, with tests (`php artisan test`).
- Admin access to the repository settings to add secrets.

```flow
Push | to main
> You push to `main`. The webhook is off, so only the pipeline can deploy.
Test | php artisan test
> The pipeline runs `php artisan test`. Red tests stop it here.
Backup | optional
> Optional: take a backup on the server first.
Deploy | ssh → cipi deploy
> The pipeline connects with the CI key and runs `sudo cipi deploy shop`.
Check | health URL
> If the deploy succeeded, the pipeline calls `/up`. A deploy that failed while building published nothing, so there is nothing to undo: the job just turns red.
Roll back | only if unhealthy
> If the new release is live but doesn't answer, the pipeline runs `--rollback` and fails visibly.
```

## 1. A dedicated key for CI

```bash
$ ssh-keygen -t ed25519 -C "ci-deploy" -f ~/.ssh/ci_deploy -N ""
$ cat ~/.ssh/ci_deploy.pub     # on the server: sudo cipi ssh add "<this line>"
$ cat ~/.ssh/ci_deploy         # → CI secret SERVER_SSH_KEY
```

Save `SERVER_SSH_KEY` and `SERVER_HOST` as repository secrets. Never reuse a personal key or the app's deploy key.

## 2. Turn the webhook off

So only the pipeline deploys. Remove the webhook from the repository settings, or recreate the app's webhook only when you need it again with `sudo cipi app webhook recreate shop`.

## 3. GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with: { php-version: "8.6" }
      - run: composer install --no-interaction && cp .env.example .env && php artisan key:generate
      - run: php artisan test
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: cipi
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: "sudo cipi deploy shop && { curl -fsS --retry 5 --retry-delay 5 --retry-all-errors https://shop.example.com/up >/dev/null || { sudo cipi deploy shop --rollback; exit 1; }; }"
```

## 4. GitLab CI

```yaml
# .gitlab-ci.yml
stages: [test, deploy]
test:
  stage: test
  image: php:8.6-cli
  script: [composer install, php artisan test]
deploy:
  stage: deploy
  only: [main]
  before_script:
    - eval $(ssh-agent -s) && echo "$SERVER_SSH_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh && ssh-keyscan -H $SERVER_HOST >> ~/.ssh/known_hosts
  script:
    - ssh cipi@$SERVER_HOST "sudo cipi deploy shop && { curl -fsS --retry 5 --retry-delay 5 --retry-all-errors https://shop.example.com/up >/dev/null || { sudo cipi deploy shop --rollback; exit 1; }; }"
```

## 5. Add a safety net

| Add | How |
| --- | --- |
| Database snapshot before migrations | `sudo cipi app edit shop --predeploy-snapshot` (every deploy) |
| Off-site backup step | `sudo cipi backup run --profile=shop-nightly` in a job before deploy |
| Validate `cipi.yml` | `php artisan cipi:yml validate --json` in the test job ([agent](/docs/agent-yml)) |
| Automatic rollback when the app is down | A [health check](/docs/health-checks) with `rollback_on_unhealthy: true` |
| Alerts | `sudo cipi notification add slack …` ([guide](/guides/server-monitoring-alerts)) |

## Without SSH

Prefer HTTPS to SSH from CI? Use [cipi-cli](/docs/cli-client) with an API token that only has `deploy-manage`:

```bash
$ cipi-cli prod deploy shop
```

Next: a live URL for every branch with [preview environments](/guides/laravel-preview-environments).

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `Permission denied (publickey)` in CI | The CI public key isn't on the server: `sudo cipi ssh add "…"` |
| `Host key verification failed` | Add the server's host key to `known_hosts` in the workflow (`ssh-keyscan`) |
| Deploys twice per push | The webhook is still on: remove it from the repository |
| CI passes, site broken | Add a [health check](/docs/health-checks) with `--rollback-on-unhealthy` |
