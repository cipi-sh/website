---
title: Push-to-deploy Laravel from GitHub, GitLab, Bitbucket or Gitea
description: Deploy on every git push with signed webhooks verified inside your app, branch filtering, an audit trail of who pushed, and deploys that never run inside a web request.
category: agent
order: 3
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel deploy webhook github, laravel gitlab webhook deploy, laravel bitbucket deploy, gitea webhook laravel
related:
  - laravel-ci-cd-git-workflow
  - cipi-agent-laravel-mcp
  - laravel-zero-downtime-migrations
---
With a token, Cipi sets up the webhook on GitHub, GitLab, Bitbucket and Azure DevOps by itself. This guide shows what happens behind it, and how to wire Gitea or Forgejo by hand.

```flow
git push | to the deploy branch
Webhook | POST /cipi/webhook, signed
Verify | signature, branch
Trigger file | instant HTTP answer
Deploy | within a minute, as the app user
```

The request never runs the deploy itself: it verifies the push and drops a trigger. A cron picks it up and deploys with zero downtime. A slow build can't time out a webhook, and a forged request can't start anything.

## 1. Get the URL and token

```bash
$ sudo cipi deploy shop --webhook
```

## 2. Add the webhook

| Provider | Payload URL | Secret / token | Events |
| --- | --- | --- | --- |
| GitHub | `https://shop.example.com/cipi/webhook` | Secret = token (HMAC-SHA256), content type JSON | Just the push event |
| GitLab | same | Secret token | Push events |
| Bitbucket Cloud | same | Secret (HMAC) | Repository push |
| Gitea / Forgejo | same | Secret (HMAC) | Push events |

Only pushes to the app's branch (`CIPI_DEPLOY_BRANCH`) deploy; others answer `skipped`. GitHub's ping answers `pong`.

## 3. Push and watch

```bash
$ git push origin main
$ sudo cipi deploy shop --status      # running, queued or idle
$ sudo cipi deploy shop --log
```

## 4. Know who pushed

Each trigger records what the push claimed (provider, pusher, commit, delivery ID, IP) in the [deploy audit](/docs/deploy-audit). It's recorded as a claim, not a fact: the ledger is hash-chained, so it can't be quietly edited later.

```bash
$ sudo cipi deploy shop --audit
```

## Rotate the secret

```bash
$ sudo cipi app webhook recreate shop --rotate-secret
```

Need tests before deploying? Turn the webhook off and use [a pipeline](/guides/laravel-ci-cd-git-workflow).
