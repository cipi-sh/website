---
title: Staging and production from one repository with cipi.yml
description: Run a staging and a production copy of the same Laravel app, each with its own branch, workers and settings, driven by cipi-staging.yml and cipi.yml.
category: cipi-yml
order: 2
published: 2026-09-14
updated: 2026-11-23
howto: yes
keywords: laravel staging environment, cipi-staging.yml, laravel staging production same server
related:
  - manage-apps-with-cipi-yml
  - laravel-preview-environments
  - cipi-yml-recipes
---
One repository, two apps: `shop` (production, branch `main`) and `shop-stg` (staging, branch `develop`). Each reads its own file, so staging can run fewer workers, skip backups and keep basic auth on, without a single `if` in your deploy scripts.

```stack
Repository | cipi.yml + cipi-staging.yml
shop | env production → reads cipi.yml
shop-stg | env staging → reads cipi-staging.yml
```

## 1. Clone production as staging

```bash
$ sudo cipi app clone shop --domain=staging.shop.example.com --name=shop-stg --env=staging
```

The clone gets its own user, database, PHP pool, credentials and deploy key. It never shares production's secrets.

## 2. Add the staging file

```yaml
# cipi-staging.yml
version: 1
app:
  basic_auth:
    users: [preview]          # password set once on the server
workers:
  queues:
    - { queue: default, processes: 1 }
schedule: true
deploy:
  branch: develop
  predeploy_snapshot: false
```

Keep `cipi.yml` for production. An app reads `cipi-<env>.yml` first, then falls back to `cipi.yml`.

## 3. Plan and apply on staging

```bash
$ sudo cipi deploy shop-stg
$ sudo cipi yml plan shop-stg      # deploy branch: main → develop (from the next deploy)
$ sudo cipi yml apply shop-stg
$ sudo cipi yml auto shop-stg on
```

From now on, pushes to `develop` deploy staging and pushes to `main` deploy production.

## Rules that keep production safe

| Rule | Why |
| --- | --- |
| The server sets the environment (`--env`), not the file | A commit can't make production read the staging file |
| An invalid `cipi-staging.yml` doesn't fall back to `cipi.yml` | Errors are explicit, never silent |
| Staging data is never production's | Clones get new credentials; use the [anonymizer](/guides/anonymized-database-dumps) for realistic data |

Want a URL per branch instead of one staging app? See [preview environments](/guides/laravel-preview-environments).
