---
title: "cipi.yml: keep your server settings in the repository"
description: Version PHP, workers, scheduler, domains, databases, health checks, backups and deploy options next to your Laravel code, review them in pull requests, and apply them safely.
category: cipi-yml
order: 1
published: 2026-06-02
updated: 2026-11-23
howto: yes
keywords: cipi.yml, infrastructure as code laravel, laravel server config in git, laravel forge alternative config
related:
  - cipi-yml-staging-production
  - cipi-yml-recipes
  - laravel-ci-cd-git-workflow
faq:
  - Can a commit break production? | The server plans every change first and applies all or nothing. An invalid file, an out-of-range value or a missing required variable blocks the plan and nothing changes.
  - Do secrets go in cipi.yml? | No. `env.required` lists variable names only; values stay in the server's `.env`. Basic-auth users are names or bcrypt hashes, never passwords.
  - Do I have to use it? | No. Every setting also works from the CLI or the panel. `cipi yml generate` writes a file from what an app already has, so adopting it later is one command.
---
Most panels keep an app's server settings in a database you can't review. Cipi lets you put them in **`cipi.yml`**, a file at the root of your repository. It travels with each release: you review it in a pull request, see exactly what it would change, and apply it in one step.

```flow
Commit cipi.yml | reviewed like code
Deploy | the file ships with the release
Plan | every change listed first
Apply | all or nothing
```

## 1. Start from what the app already has

```bash
$ sudo cipi yml generate shop --save
$ cat /home/shop/cipi.yml
```

Commit that file at the root of the repository. After the next deploy, `cipi yml plan shop` should say there's nothing to do: the file describes the server as it is.

## 2. Describe the app

A typical Laravel app:

```yaml
version: 1

app:
  php: "8.6"
  aliases: ["www.shop.example.com"]
  www: to-root
  ini: { upload_max_filesize: 50M }

workers:
  horizon: true
  reverb: true

schedule: true
search: true

health:
  url: "https://shop.example.com/up"
  rollback_on_unhealthy: true

deploy:
  branch: main
  predeploy_snapshot: true
  node_build: "npm ci && npm run build"
  post:
    - artisan cache:clear

env: { required: [STRIPE_KEY, STRIPE_SECRET, MAIL_HOST] }

backup:
  profiles:
    - { name: shop-nightly, scope: all, cron: "0 2 * * *", keep_days: 14, destinations: [s3], encrypt: true }
```

| Block | Replaces |
| --- | --- |
| `app` | `cipi php`, `cipi alias`, `cipi www`, `cipi ini`, `cipi app limits` |
| `workers`, `schedule` | `cipi worker`, `cipi app reverb`, the scheduler cron |
| `search` | `cipi search enable` |
| `health` | `cipi health set` |
| `deploy` | `cipi deploy-config` |
| `backup.profiles` | `cipi backup profile` |

The full list, with routes, proxies, crons and Node apps, is in the [cipi.yml reference](/docs/yml).

## 3. Validate before you push

Install the [Cipi Agent](/docs/agent) in the app and validate with the same rules as the server, locally or in CI:

```bash
$ composer require cipi/agent
$ php artisan cipi:yml validate
```

Add `# yaml-language-server: $schema=./cipi.schema.json` at the top of the file (after `php artisan cipi:yml schema --write`) for autocompletion in VS Code or PhpStorm.

## 4. Plan and apply

After deploying the release that contains the file:

<cipi-term name="yml"></cipi-term>

`plan` lists every change and every blocker. `apply` performs them as one transaction: if anything fails, nothing is left half done.

## 5. Apply on every deploy

```bash
$ sudo cipi yml auto shop on
```

From now on each successful deploy (CLI, webhook or panel) applies the file. **Anyone who can push can now change this app's server settings**, which is the point: protect the branch and review the file like code.

## Why it's safe

| Guard | Effect |
| --- | --- |
| Plan before apply | You see every change; blockers stop everything |
| Namespaced resources | Databases must be `shop` or `shop_*`, backup profiles `shop` or `shop-*`: a file can't touch another app |
| No secrets | Required variables are names; credentials are written to `shared/`, never to the repo |
| Allowlisted commands | `deploy.post` and `crons` accept known runners only (`artisan`, `php`, `composer`, `npm`…) |
| Server picks the file | The app's environment decides between `cipi.yml` and `cipi-staging.yml`; a commit can't redirect production |

Next: one repository, two servers or two apps, with [staging and production files](/guides/cipi-yml-staging-production).
