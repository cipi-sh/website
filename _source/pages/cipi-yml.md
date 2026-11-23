---
title: "cipi.yml: your server settings, in your repository"
seo_title: "cipi.yml — Laravel server configuration as code, reviewed in pull requests | Cipi"
description: "cipi.yml puts an app's PHP version, workers, scheduler, domains, databases, health checks, backups and deploy steps in your Git repository. Every change is planned, reviewed and applied all-or-nothing."
lead: "One file next to your code describes how the server runs the app. Change it in a pull request; Cipi shows the plan and applies it, all or nothing."
eyebrow: Configuration as code
eyebrow_href: /docs/yml
crumb: cipi.yml
path: /cipi-yml
updated: 2026-11-23
keywords: cipi.yml, laravel infrastructure as code, laravel server configuration git, laravel forge alternative config as code
faq:
  - Is it like Docker Compose or Terraform? | Smaller and safer. It configures one app on a Cipi server (runtime, workers, domains, backups), can't create or delete apps, and refuses anything outside the app's own namespace.
  - What happens with an invalid file? | Nothing is applied. The plan reports the error; with auto-apply on you get a `yml_fail` notification and the deploy itself still succeeds.
  - Can I start using it on an existing app? | Yes. `cipi yml generate <app> --save` writes the current setup as a file; commit it and the next plan shows nothing to change.
  - Do secrets end up in Git? | No. `env.required` lists names only; credentials Cipi creates go to `shared/`, and basic-auth users are names or hashes.
---
```flow
Edit cipi.yml | in a branch
Review | in the pull request
Deploy | the file ships with the release
Plan | every change listed
Apply | all or nothing
```

## The whole app, in one file {#file}

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
  predeploy_snapshot: true
  node_build: "npm ci && npm run build"
  post:
    - artisan scout:sync-index-settings

env: { required: [STRIPE_KEY, MAIL_HOST] }

backup:
  profiles:
    - { name: shop-nightly, scope: all, cron: "0 2 * * *", keep_days: 14, destinations: [s3], encrypt: true }
```

| Block | What it controls |
| --- | --- |
| `app` | PHP version, aliases, www/apex, `php.ini` values, resource limits, basic auth |
| `workers`, `schedule` | Queues, Horizon, Reverb, the scheduler |
| `search` | Meilisearch for Laravel Scout |
| `health` | URL probed every 5 minutes and after each deploy, with automatic rollback |
| `deploy` | Branch, releases kept, DB snapshot, asset build, post-deploy steps |
| `databases`, `backup` | Extra databases and backup profiles for this app |
| `redirects`, `proxies`, `crons`, `node` | Routes, scheduled commands, Node apps |

Full reference: [cipi.yml docs](/docs/yml). Ready-made files: [recipes](/guides/cipi-yml-recipes).

## See the plan before anything changes {#plan}

<cipi-term name="yml"></cipi-term>

`plan` lists each change and each blocker. `apply` performs them in one transaction. `auto on` applies the file after every successful deploy, from the CLI, the webhook or the panel.

## Safe to accept from Git {#safe}

Anyone who can push controls the file, so it's designed to fail closed.

| Guard | Effect |
| --- | --- |
| Configure only | It can never create, rename or delete an app |
| Namespaced | Databases are `shop` or `shop_*`, backup profiles `shop` or `shop-*`: no reaching into other apps |
| No secrets | Required variables are names; generated credentials stay on the server |
| No shell | Only allowlisted runners (`artisan`, `composer`, `npm`, `php`…), no pipes or `;` |
| Small YAML | Anchors, tags, merges and block scalars are refused |
| Strict routes | Proxies can't target Cipi's own ports, link-local or cloud-metadata addresses |
| Server picks the file | Staging reads `cipi-staging.yml` because the server says so, never because a commit asks |

## One repository, every environment {#environments}

| File | Read by |
| --- | --- |
| `cipi.yml` | Production apps |
| `cipi-staging.yml` | Apps created with `--env=staging` |
| `cipi-preview.yml` | Preview apps per branch |

Walkthrough: [staging and production from one repository](/guides/cipi-yml-staging-production).

## Validate before you push {#validate}

```bash
$ composer require cipi/agent
$ php artisan cipi:yml validate          # same validator as the server
$ php artisan cipi:yml generate --write  # a first file inferred from your code
$ php artisan cipi:yml schema --write    # autocompletion in your editor
```

Add `php artisan cipi:yml validate --json` to CI and a broken file never reaches a server. AI assistants connected through the [agent's MCP](/guides/cipi-mcp-ai-agents) can validate drafts too.

## Start in two minutes {#start}

```bash
$ sudo cipi yml generate shop --save      # the app as it is today
$ cat /home/shop/cipi.yml                 # commit it at the repository root
$ sudo cipi deploy shop && sudo cipi yml plan shop
```

Step by step: [keep your server settings in the repository](/guides/manage-apps-with-cipi-yml).
