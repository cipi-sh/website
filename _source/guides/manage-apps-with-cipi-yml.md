---
title: "cipi.yml: keep your server settings in the repository"
description: Keep PHP, workers, scheduler, domains, databases, health checks, backups and deploy options in a cipi.yml next to your Laravel code, explained from zero: generate it, edit it, validate it, review it in pull requests, plan and apply it safely.
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
  - What happens if I delete a section from the file? | Sections you don't write are left as they are on the server. Some lists are authoritative once present (for example `app.aliases`): `plan` shows any removal before it happens.
  - When does a change take effect? | When the release containing it is deployed and you run `cipi yml apply` (or automatically, with `cipi yml auto shop on`).
  - Can I see what would change before merging? | Yes. Validate in CI with `php artisan cipi:yml validate`, and after deploying to staging run `cipi yml plan` there.
  - Which file does staging use? | The app's environment decides: an app created with `--env=staging` reads `cipi-staging.yml` if present, otherwise `cipi.yml`.
docs:
  - yml
  - agent-yml
  - deploying
---
Most panels keep an app's server settings in a database you can't review. Cipi lets you put them in **`cipi.yml`**, a file at the root of your repository. It travels with each release: you review it in a pull request, see exactly what it would change, and apply it in one step.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **YAML** | A plain-text format of `key: value` lines, indented to nest |
| **Desired state** | The file says how the app *should* be; Cipi works out the steps |
| **Plan** | The list of changes Cipi would make, shown before anything happens |
| **Apply** | Making those changes, all of them or none |
| **Blocker** | A problem that stops the plan: an invalid value, a missing variable |

```flow
Edit cipi.yml | in a branch
Review | pull request
Merge, deploy | the file ships with the release
Plan | what would change
Apply | all or nothing
```

## Before you start {#before}

- A Laravel (or Node) app deployed with Cipi.
- Shell access as `cipi` for the first `generate` and `plan`.

```flow
Generate | from what the app has | #generate
Describe | PHP, workers, backups… | #describe
Validate | before you push | #validate
Plan & apply | all or nothing | #plan
Automatic | after every deploy | #auto
```

## 1. Start from what the app already has {#generate}
```bash
$ sudo cipi yml generate shop --save
$ cat /home/shop/cipi.yml
```

Commit that file at the root of the repository. After the next deploy, `cipi yml plan shop` should say there's nothing to do: the file describes the server as it is.

## 2. Describe the app {#describe}
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

## 3. Validate before you push {#validate}
Install the [Cipi Agent](/docs/agent) in the app and validate with the same rules as the server, locally or in CI:

```bash
$ composer require cipi/agent
$ php artisan cipi:yml validate
```

Add `# yaml-language-server: $schema=./cipi.schema.json` at the top of the file (after `php artisan cipi:yml schema --write`) for autocompletion in VS Code or PhpStorm.

## 4. Plan and apply {#plan}
After deploying the release that contains the file:

```bash
$ sudo cipi yml plan shop
Plan for 'shop' (/home/shop/current/cipi.yml)
  Would change
    → workers: add queue 'emails' (3 processes)
    → backup profile 'shop-nightly': cron 0 2 * * * to s3, keep 14 days
$ sudo cipi yml apply shop
✓ Applied 2 change(s) from cipi.yml
```

<cipi-term name="yml"></cipi-term>

`plan` lists every change and every blocker. `apply` performs them as one transaction: if anything fails, nothing is left half done.

## 5. Apply on every deploy {#auto}
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

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `plan` says nothing to do after an edit | The release with the edit isn't deployed yet: deploy first |
| Blocked: required variable missing | Add it to the server's `.env` with `cipi app env shop --set=…` |
| Blocked: database name | Extra databases must be named `shop` or `shop_*` |
| Blocked: command not allowed | `deploy.post` and `crons` accept known runners only (`artisan`, `php`, `composer`, `npm`…) |
| Validation passes locally, fails on server | Different Cipi Agent version: update `cipi/agent` |
