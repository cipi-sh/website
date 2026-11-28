---
title: Staging and production from one repository with cipi.yml
description: A beginner-friendly walkthrough to run a staging copy and a production copy of the same Laravel app, each deploying its own branch with its own settings, driven by cipi-staging.yml and cipi.yml.
category: cipi-yml
order: 2
published: 2026-09-14
updated: 2026-11-23
howto: yes
keywords: laravel staging environment, cipi-staging.yml, laravel staging production same server, laravel environments git branches
docs:
  - yml
  - manage-apps
  - environment
  - basic-auth
  - auto-deploy
related:
  - manage-apps-with-cipi-yml
  - laravel-preview-environments
  - cipi-yml-recipes
faq:
  - What is the difference between an "app" and an "environment" here? | On Cipi every running copy of your code is an app with its own Linux user, database and domain. "Environment" is a label on the app (production, staging, preview…) that decides which settings file it reads. Two environments of the same project are two apps.
  - Do staging and production share a database? | No. The staging app has its own database and credentials. Copy data in on purpose, ideally an anonymized dump, never by pointing staging at production.
  - Can staging and production be on different servers? | Yes, and it's often wiser. Create the staging app on the other server with `--env=staging`; it reads the same `cipi-staging.yml` from the same repository.
  - Which file wins if both cipi.yml and cipi-staging.yml exist? | An app with env `staging` reads `cipi-staging.yml`. If that file doesn't exist it falls back to `cipi.yml`. If it exists but is invalid, nothing is applied and the error names the file: there is no silent fallback.
  - Can a developer make production read the staging file by committing something? | No. The environment is set on the server (`--env`), never in the file. A commit can change what a file says, not which file an app reads.
  - How do I keep production settings out of staging, like backups to S3? | Put them only in `cipi.yml`. The staging file starts from nothing: it doesn't inherit from `cipi.yml`, so anything you don't write in it isn't applied to staging.
  - What about secrets that differ, like Stripe test keys? | Keep them in each app's `.env` on the server (`sudo cipi app env shop-stg --set=STRIPE_KEY=…`). Both files can require them by name with `env.required`, so a missing key blocks the plan.
---
Most teams want two copies of the same app: **production**, which your customers use, and **staging**, where you try changes first. This guide sets that up on Cipi from scratch, explaining each idea along the way. No previous Cipi experience needed.

## What you'll build

```stack
Git repository | one codebase, two branches
shop (production) | branch main → reads cipi.yml
shop-stg (staging) | branch develop → reads cipi-staging.yml
```

| | Production | Staging |
| --- | --- | --- |
| App name (Linux user) | `shop` | `shop-stg` |
| Domain | `shop.example.com` | `staging.shop.example.com` |
| Branch that deploys | `main` | `develop` |
| Settings file | `cipi.yml` | `cipi-staging.yml` |
| Database | `shop` | `shop-stg` (separate) |
| Who can see it | everyone | only your team (password) |

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **App** | One running copy of your code on the server: its own user, folder, PHP pool, database and domain |
| **Environment** | A label on an app (`production`, `staging`…). Laravel sees it as `APP_ENV`, Cipi uses it to pick a settings file |
| **Branch** | The Git branch an app deploys. Push to it and that app updates |
| **`cipi.yml`** | A file in your repository that describes how the server should run the app: PHP version, workers, backups… ([what it is](/cipi-yml)) |
| **Plan / apply** | Cipi first shows what the file would change (plan), then does it (apply) |

## Before you start {#before}

- A server with Cipi and your production app already running ([Deploy Laravel on a VPS](/guides/deploy-laravel-ubuntu-vps)).
- A `develop` branch in your repository: `git checkout -b develop && git push -u origin develop`.
- A DNS record for `staging.shop.example.com` pointing at the server (same IP as production).

## 1. Create the staging app as a clone {#clone}

A **clone** copies the app's configuration (PHP version, repository, workers, deploy settings) into a new, fully separate app:

```bash
$ sudo cipi app clone shop --domain=staging.shop.example.com --name=shop-stg \
    --branch=develop --env=staging --with-db
```

| Flag | Why |
| --- | --- |
| `--domain` | The address of the new app |
| `--name` | Its Linux user and app name |
| `--branch=develop` | Staging deploys the `develop` branch |
| `--env=staging` | Marks it as staging: it will read `cipi-staging.yml` and get `APP_ENV=staging` |
| `--with-db` | Creates a fresh, **empty** database for it |

The clone gets new database credentials, its own deploy key, its own Reverb credentials and search key. **Nothing points back to production.** Save the summary it prints.

Then deploy it once and add HTTPS:

```bash
$ sudo cipi deploy shop-stg
$ sudo cipi ssl install shop-stg
```

<cipi-term name="deploy"></cipi-term>

## 2. Keep strangers out of staging {#protect}

Staging often contains unfinished features. Put a password in front of it:

```bash
$ sudo cipi basicauth enable shop-stg --user=preview --password='a-long-random-passphrase'
```

Pick a long password and share it with your team (without `--user` and `--password`, Cipi generates both and shows them once). Search engines and visitors now get a login prompt.

## 3. Write the two settings files {#files}

In your repository root, production keeps its `cipi.yml`. Add a second file, `cipi-staging.yml`, with what staging needs. The staging file **does not inherit** from `cipi.yml`: write everything staging needs.

```yaml
# cipi.yml — production
version: 1
app:
  php: "8.6"
  aliases: ["www.shop.example.com"]
  www: to-root
workers:
  horizon: true
schedule: true
health:
  url: "https://shop.example.com/up"
  rollback_on_unhealthy: true
deploy:
  branch: main
  predeploy_snapshot: true
env: { required: [STRIPE_KEY, MAIL_HOST] }
backup:
  profiles:
    - { name: shop-nightly, scope: all, cron: "0 2 * * *", keep_days: 14, destinations: [s3], encrypt: true }
```

```yaml
# cipi-staging.yml — staging
version: 1
app:
  php: "8.6"
  basic_auth:
    users: [preview]           # the user created above; keeps its password
workers:
  queues:
    - { queue: default, processes: 1 }
schedule: true
deploy:
  branch: develop
env: { required: [STRIPE_KEY] }   # test keys, set on the staging server
```

| Difference | Why |
| --- | --- |
| No aliases or www redirect | Staging has one domain |
| One queue worker instead of Horizon | Less memory; enough for testing |
| No backup profile | Staging data is disposable |
| `basic_auth` in the file | The password protection can't be removed by accident |
| `deploy.branch: develop` | Pushes to `develop` deploy staging |

Validate both before you commit (with the [Cipi Agent](/docs/agent-yml) installed in the app):

```bash
$ php artisan cipi:yml validate
$ CIPI_ENV=staging php artisan cipi:yml validate
```

Commit and push to **both** branches (merge `develop` into `main` later, or cherry-pick the files).

## 4. Plan, then apply on staging {#apply}

After the next deploy of `shop-stg` the file is on the server. See what it would change:

<cipi-term name="yml"></cipi-term>

```bash
$ sudo cipi yml plan shop-stg
$ sudo cipi yml apply shop-stg
$ sudo cipi yml auto shop-stg on      # apply after every deploy from now on
```

Do the same for production with `shop`. From now on, the files are the source of truth: change them in a pull request, merge, and each app applies its own file on the next deploy.

## 5. Push-to-deploy for each branch {#push}

Each app has its own webhook and only deploys its own branch:

```flow
git push develop | GitHub webhook
> You push to `develop`. GitHub calls the webhook of the staging app.
shop-stg | deploys develop
> The staging app `shop-stg` deploys `develop` and reads `cipi-staging.yml`.
git push main | GitHub webhook
> You push (or merge) to `main`. GitHub calls the production app's webhook.
shop | deploys main
> The production app `shop` deploys `main` and reads `cipi.yml`. One repository, two apps, never mixed.
```

Get each app's webhook URL and secret with `sudo cipi deploy shop-stg --webhook` and add it to the repository ([auto-deploy](/docs/auto-deploy)). Pushes to other branches answer `skipped`.

## 6. Get realistic data into staging {#data}

An empty database isn't much of a test. Never copy production as is: personal data ends up in a less protected place. Use an **anonymized dump**:

```bash
$ cipi-cli prod db anonymize shop --email you@example.com
$ cipi-cli db anonymize download "<signed link>" -o shop-anon.sql
# copy it to the server, then:
$ sudo cipi db restore shop-stg /home/cipi/shop-anon.sql
```

Step by step: [GDPR-safe production data](/guides/anonymized-database-dumps).

## The daily workflow {#workflow}

```flow
Branch | feature/x from develop
> Create a feature branch from `develop` and work there.
Merge to develop | staging deploys
> Merge it into `develop`: staging deploys it automatically.
Test on staging | behind the password
> Test on the staging URL, behind its password, with anonymized data.
Merge to main | production deploys
> When it's good, merge `develop` into `main`: production deploys.
```

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `sudo cipi yml plan shop-stg` says it reads `cipi.yml` | The app's env isn't `staging`: `sudo cipi app edit shop-stg --env=staging` |
| Plan says "blocked: STRIPE_KEY missing" | Set it on the staging app: `sudo cipi app env shop-stg --set=STRIPE_KEY=sk_test_…` |
| Staging deploys `main` | `deploy.branch` is applied from the **next** deploy, or set it now: `sudo cipi app edit shop-stg --branch=develop` |
| Invalid `cipi-staging.yml` | The error names the file; validate locally with `CIPI_ENV=staging php artisan cipi:yml validate` |
| Staging sends real e-mails | Use a mail catcher or a sandbox SMTP in the staging `.env` |
