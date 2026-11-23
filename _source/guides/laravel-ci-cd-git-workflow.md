---
title: CI/CD for Laravel with GitHub Actions or GitLab CI
description: Test on every push and deploy only when tests pass, with automatic rollback, a restricted CI key, an optional backup step and zero-downtime releases.
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
  - Can the CI key do anything else on the server? | The `cipi` user runs only `sudo cipi …` without a password. The CI key can deploy, not install software or read other users' files.
  - Webhook or CI? | The webhook deploys every push, fast and simple. CI deploys only when tests pass. You can also keep the webhook on staging and use CI for production.
  - Can I deploy without giving CI SSH access? | Yes: use `cipi-cli` with a scoped API token (`deploy` ability only), as shown in "Without SSH".
  - How do I run migrations in CI? | You don't: the deploy runs them on the server, inside the new release, before it goes live.
docs:
  - ci-pipelines
  - auto-deploy
  - safe-deploy
  - health-checks
  - cli-client
---
Push-to-deploy is great until a broken test reaches production. A pipeline adds the gate: test, optionally back up, deploy, and roll back if the deploy fails.

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
Test | php artisan test
Backup | optional
Deploy | ssh → cipi deploy
Roll back | on failure
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
          script: sudo cipi deploy shop || (sudo cipi deploy shop --rollback && exit 1)
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
    - ssh cipi@$SERVER_HOST "sudo cipi deploy shop || (sudo cipi deploy shop --rollback && exit 1)"
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
