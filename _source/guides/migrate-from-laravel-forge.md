---
title: Move a Laravel app from Forge (or Ploi) to Cipi
description: A step-by-step migration from Laravel Forge or Ploi to a free, open-source Cipi server: mapping each Forge feature to its Cipi equivalent, a fresh server, the app, the .env, the database, files, workers and scheduler, a DNS switch with almost no downtime, and a rollback plan.
category: start
order: 3
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: migrate from laravel forge, laravel forge alternative migration, leave forge, ploi to cipi, move laravel app new server, forge to self hosted
docs:
  - create-app
  - environment
  - databases
  - workers
  - yml
related:
  - deploy-laravel-ubuntu-vps
  - manage-apps-with-cipi-yml
  - migrate-server-cipi-sync
faq:
  - Can I install Cipi on my existing Forge server? | Don't. Cipi expects a fresh Ubuntu 24.04 or 26.04 server and configures Nginx, PHP and users its own way. A new server also gives you a clean rollback: the old one keeps running until you switch DNS.
  - How long is the downtime? | Seconds to minutes, only for the final database copy. Lower the DNS TTL a day before; use maintenance mode on the old server during the last dump.
  - Do I need to change my code? | Usually not. Paths change (`/home/forge/site` → `/home/<app>/current`), so check hard-coded paths, and the deploy script moves to Cipi's options or `cipi.yml`.
  - What happens to my Forge deploy script? | Cipi's deploys already run `composer install`, migrations, `optimize`, `storage:link` and worker restarts. Extra steps go in `--extra-artisan`, `deploy.post` in `cipi.yml`, or a Deployer task.
  - Can I keep using Envoyer or GitHub Actions? | Cipi deploys with zero downtime on its own, triggered by push, CLI, API or CI. Your CI can call `cipi-cli deploy` or the webhook.
  - What do I lose? | Forge's hosted dashboard. Cipi gives you a CLI, an optional self-hosted web panel, a REST API and an MCP server, without a monthly plan.
  - What if a step fails? | Read the troubleshooting table above first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community. Most commands print the fix when they refuse something.
---
This guide moves one Laravel app from a Forge (or Ploi) server to a new server running Cipi. The old server keeps running until the very last step, so you can stop at any point and nothing breaks.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Cut-over** | The moment traffic moves to the new server (a DNS change) |
| **TTL** | How long the world caches a DNS answer. Lower it before the move |
| **Dump** | A file with the whole database, used to copy it |
| **Rollback plan** | How to go back: point DNS at the old server again |

```flow
Prepare | lower TTL, new server | #before
Build | app, .env, workers | #create
Rehearse | copy data, test | #rehearse
Cut-over | final dump, DNS | #cutover
Keep old | a week, then delete | #rollback
```

## Forge and Ploi features, in Cipi {#map}

| Forge / Ploi | Cipi |
| --- | --- |
| Server provisioning | `wget -O - https://cipi.sh/setup.sh \| bash` on a fresh VPS |
| Site | `sudo cipi app create` (Laravel, Node or custom) |
| Deploy script | Built-in steps plus `sudo cipi app deploy-config`, `deploy.post` in `cipi.yml` |
| Quick deploy | Push-to-deploy webhook, created with the app |
| Environment | `sudo cipi app env` (`/home/<app>/shared/.env`) |
| Daemons / queue workers | `sudo cipi worker add`, `sudo cipi worker horizon enable` |
| Scheduler | On by default per app |
| Databases | `sudo cipi db` (MariaDB, PostgreSQL) |
| SSL (Let's Encrypt) | `sudo cipi ssl install` |
| Backups | `sudo cipi backup` (local and S3, encrypted) |
| Monitoring, health checks | `sudo cipi monitor`, health checks with auto-rollback |
| Team access | Panel roles, API tokens with abilities |
| Monthly plan | None: MIT licensed |

## Before you start {#before}

- Access to the Forge server (`ssh forge@OLD_IP`) and your DNS.
- The app's repository and branch.
- A new VPS with a fresh Ubuntu 24.04 or 26.04 ([choose one](/guides/vps-ssh-dns-basics)).
- A day before: lower the DNS TTL of the domain to 300 seconds.

## 1. Install Cipi on the new server {#install}

```bash
$ ssh root@NEW_IP
$ wget -O - https://cipi.sh/setup.sh | bash
```

Install the PHP version the app uses today, and PostgreSQL if it's on Postgres:

```bash
$ ssh cipi@NEW_IP
$ sudo cipi php install 8.4
$ sudo cipi db install pgsql          # only if needed
```

## 2. Create the app {#create}

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --branch=main --php=8.4
```

The summary shows a **deploy key**. Add it to the repository (GitHub → Settings → Deploy keys, read-only). With a Git provider token saved, Cipi does it for you.

## 3. Copy the .env {#env}

On the old server, print it:

```bash
$ ssh forge@OLD_IP "cat /home/forge/shop.example.com/.env"
```

Copy **your own keys** (Stripe, mail, S3, Pusher, APIs) into the new app and keep Cipi's values for the database and Redis. One exception: `APP_KEY` must be the **old** one, or encrypted data and sessions become unreadable.

```bash
$ sudo cipi app env shop --set=APP_KEY=base64:OLD_KEY…
$ sudo cipi app env shop --set=STRIPE_SECRET=sk_live_…
$ sudo cipi app env shop                  # or paste the rest in the editor
```

| Keep from Cipi | Bring from Forge |
| --- | --- |
| `DB_*`, `REDIS_*`, `CIPI_*` | `APP_KEY`, mail, payments, storage, third-party APIs |
| `APP_URL` (switched to https by `sudo cipi ssl install`) | Custom keys your code reads |

## 4. Deploy once {#deploy}

```bash
$ sudo cipi deploy shop
```

Migrations create an empty schema; the data comes next. If your Forge deploy script ran extra commands, add them:

```bash
$ sudo cipi app deploy-config shop --extra-artisan=event:cache,icons:cache
$ sudo cipi app deploy-config shop --node-build='npm ci && npm run build'
```

## 5. Rehearse the data copy {#rehearse}

Database, from the old server to the new one:

```bash
# on the old server
$ mysqldump --single-transaction --quick -u forge -p shop | gzip > /tmp/shop.sql.gz
# from your laptop
$ scp forge@OLD_IP:/tmp/shop.sql.gz . && scp shop.sql.gz cipi@NEW_IP:/tmp/
# on the new server
$ sudo cipi db restore shop /tmp/shop.sql.gz
```

Uploaded files in `storage/app` (skip this if they're on S3):

```bash
$ rsync -az forge@OLD_IP:/home/forge/shop.example.com/storage/app/ /tmp/shop-storage/
$ sudo rsync -a /tmp/shop-storage/ /home/shop/shared/storage/app/ && sudo chown -R shop:shop /home/shop/shared/storage/app
```

Test without touching DNS: add `NEW_IP shop.example.com` to your laptop's `/etc/hosts` and browse. Remove the line when done.

## 6. Workers, scheduler, certificate {#workers}

```bash
$ sudo cipi worker add shop --queue=emails --processes=2   # one per Forge daemon queue
$ sudo cipi worker horizon enable shop                     # if Forge ran Horizon
$ sudo cipi schedule status shop                           # already on
```

Or write it all in a [`cipi.yml`](/guides/manage-apps-with-cipi-yml), so the setup lives with the code:

```yaml
workers:
  horizon: false
  queues:
    - { queue: default, processes: 2 }
    - { queue: emails, processes: 2 }
schedule: true
```

The certificate needs DNS pointing at the new server, so it comes right after the cut-over.

## 7. Cut-over {#cutover}

```flow
Old: artisan down | stop writes
> On the Forge server, `php artisan down`: visitors see the maintenance page and nothing writes to the old database any more.
Final dump | restore on new
> Take the last dump, copy it, and restore it on Cipi with `sudo cipi db restore shop …`.
DNS | A record → NEW_IP
> Change the `A` record to the new server's IP. With a 300-second TTL, most visitors move within minutes.
SSL | cipi ssl install
> As soon as DNS answers with the new IP, `sudo cipi ssl install shop` issues the certificate.
Check | old server stays down
> Browse the site, place a test order. Leave the old server down, with its workers stopped, so nothing runs twice.
```

```bash
# old server
$ php /home/forge/shop.example.com/artisan down
# dump, copy, restore as in step 5
# DNS: change the A record to NEW_IP, then on the new server
$ sudo cipi ssl install shop
```

Stop the old server's workers and scheduler (Forge → Daemons, Scheduler) so they don't process jobs against the old database.

## 8. Rollback plan {#rollback}

Until you delete the old server, going back is one DNS change plus `artisan up` there. Keep it a week, then cancel it.

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `The MAC is invalid` | The new app has a different `APP_KEY`: set the old one |
| Images missing | `storage/app` not copied, or `storage:link` missing: redeploy |
| Deploy fails on Composer | PHP version differs from Forge: `sudo cipi app edit shop --php=8.x` |
| `Permission denied (publickey)` on deploy | Deploy key not added to the repository |
| Certificate fails | DNS not pointing at the new server yet: `dig +short shop.example.com` |
| Jobs processed twice | Old server's workers still running: stop them |
