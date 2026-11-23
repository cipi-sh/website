---
title: "Cipi vs Dokku"
description: "Cipi vs Dokku: two free, CLI-driven tools compared, git-push containers versus a native Laravel platform with full server management, plus a step-by-step migration."
lead: "Both are free and CLI-driven. Dokku builds containers on git push; Cipi provisions and runs a native stack."
name: Dokku
site: https://dokku.com
kind: Self-hosted Docker PaaS
family: docker
price: "Free"
updated: 2026-11-23
keywords: dokku alternative laravel, dokku vs cipi, migrate from dokku
choose_cipi:
  - You run Laravel and want workers, scheduler and patching built in
  - You want config as code and MCP
choose_them:
  - You want a Heroku-style git push for many languages
faq:
  - How do I export my Dokku database? | `dokku postgres:export <service> > dump.sql` (or `mysql:export`), then `cipi db restore`.
  - How do I get my environment variables? | `dokku config:export <app>` prints them.
  - Can I still deploy with git push? | Yes: pushing to GitHub/GitLab triggers Cipi's webhook and a zero-downtime deploy.
---
## In 30 seconds {#summary}

Dokku is a tiny, battle-tested Heroku-style PaaS: `git push dokku main` builds a container with buildpacks or a Dockerfile, and plugins add databases and certificates. Cipi manages the whole server for Laravel and PHP natively, with releases, workers, patching, backups and MCP. Choose Dokku for Heroku-style workflows across languages; choose Cipi for Laravel with less container plumbing and more built in.

## At a glance {#glance}

|  | Cipi | Dokku |
| --- | --- | --- |
| Price | Free (MIT) | Free (MIT) |
| Model | Native stack | Containers via git push |
| Server management | Firewall, patching, backups, monitoring | PaaS-focused, plugins |
| Laravel lifecycle | Built in | Buildpacks or Dockerfile + Procfile |
| Databases | MariaDB, PostgreSQL native | Plugins (containers) |
| AI assistants (MCP) | Built in | Not advertised |

Prices as published by Dokku in November 2026; check [their site](https://dokku.com) for the current ones.

## What Dokku is {#what}

Dokku is an open-source, single-server PaaS. You push code with Git, it builds a container (Heroku buildpacks, Cloud Native Buildpacks or a Dockerfile) and runs processes from a `Procfile`. Plugins add PostgreSQL, MySQL, Redis, Let's Encrypt and more.

## Pros and cons, honestly {#pros-cons}

**Where Dokku is strong**

| Point | What it means for you |
| --- | --- |
| Heroku workflow | `git push` to deploy. |
| Any language | Buildpacks and Dockerfiles. |
| Small and stable | Minimal moving parts. |

**Where Dokku falls short**

| Point | What it means for you |
| --- | --- |
| You assemble Laravel | Procfile entries for workers and scheduler, buildpack tweaks for PHP extensions. |
| Server care is up to you | Patching, backups and monitoring are separate tasks. |

**Where Cipi is strong**

| Point | What it means for you |
| --- | --- |
| Free and open source | MIT licence, no subscription, no per-server or per-site fees. You pay only the server. |
| Lives on your server | No external control plane: nothing stops working if a vendor changes plans, prices or goes down. |
| Laravel built in | Zero-downtime releases, rollback, queues, Horizon, scheduler, Reverb, Octane, Meilisearch, health checks with auto-rollback. |
| Isolation by default | Every app has its own Linux user, PHP pool, database user and Valkey instance. |
| Configuration as code | `cipi.yml` keeps PHP, workers, domains, backups and deploy steps in the repository, planned and applied all or nothing. |
| Security on autopilot | PHP patched nightly, Nginx and services via autoupdate, firewall, Fail2ban, optional CrowdSec, malware integrity scans, encrypted secrets. |
| Built for automation and AI | Full CLI, REST API, PHP SDK, cipi-cli and two MCP servers for AI assistants, with guardrails and an audit trail. |

**Where Cipi falls short**

| Point | What it means for you |
| --- | --- |
| Not for every stack | Cipi runs Laravel, PHP and Node front ends natively. Go, Python, Rails or arbitrary Docker images aren't its job. |
| You create the server yourself | Cipi installs on a VPS you rent (Hetzner, DigitalOcean, AWS…). It doesn't create servers on cloud accounts for you. |
| Ubuntu LTS only | Ubuntu 24.04 or 26.04, on a full virtual machine. No other distributions, no containers. |
| Focused on apps | Laravel, PHP, Node front ends and static sites. No e-mail hosting, DNS server or reseller accounts. |
| No paid support desk | Help comes from the docs, GitHub and the Telegram channel. You (or your team) own the server. |

## Why teams choose Cipi instead {#why-cipi}

**No container layer for PHP.** Nginx and PHP-FPM (or Octane) run directly on the server: less memory, simpler debugging, logs where you expect them.

**Laravel's lifecycle built in.** Releases with rollback, workers, scheduler, Horizon, Reverb, Octane and health checks without writing Dockerfiles or compose files.

**Server care included.** Firewall, Fail2ban, nightly PHP patches, encrypted backups to S3 and monitoring.

## Where everything goes in Cipi {#map}

Every Dokku feature you use today, and its place in Cipi. Use it as your migration checklist.

| In Dokku | In Cipi | Docs |
| --- | --- | --- |
| App | `cipi app create` | [Create an app](/docs/create-app) |
| `dokku config:set` | `cipi app env` | [Environment](/docs/environment) |
| Procfile `worker:` | `cipi worker add`, Horizon | [Workers](/docs/workers) |
| Procfile scheduler / cron | Scheduler built in | [Scheduler](/docs/scheduler) |
| postgres / mysql plugin | `cipi db` | [Databases](/docs/databases) |
| letsencrypt plugin | `cipi ssl install` | [SSL](/docs/ssl) |
| Storage mounts | `/home/<app>/shared/storage` |  |

## Moving to Cipi, step by step {#move}

Rebuild each app natively on Cipi, export config and databases with Dokku's commands, switch DNS.

**Before you start**

- SSH access to the Dokku server.

Click a step to jump to it; the map follows you down the page.

```flow
Take inventory | apps, env, volumes | #inventory
Install Cipi | on a new server | #install
Create the app | natively, not in a container | #create
Copy the environment | variables → .env | #env
Copy the data | dump and volumes | #data
Workers and schedules | Supervisor, cron | #workers
Cut-over day | DNS, HTTPS, done | #cutover
```

### 1. Take inventory {#inventory}

For each app on Dokku, note: the Git repository and branch, the build or Dockerfile, environment variables (`dokku config:export shop` on the Dokku server), attached databases, persistent volumes (uploads), workers and scheduled commands, domains. 

### 2. Install Cipi {#install}

Create a new VPS with Ubuntu 24.04 or 26.04 and run `wget -O - https://cipi.sh/setup.sh | bash`. Cipi runs PHP, Nginx and databases natively: no Docker needed. For PostgreSQL apps add `sudo cipi db install pgsql`.

### 3. Create the app {#create}

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --branch=main --php=8.5
```

What the Dockerfile did, Cipi already does: PHP extensions, Composer, `npm run build` (`--node-build`), migrations. Commands specific to your image go in `deploy.post` of [cipi.yml](/cipi-yml). Node front ends become [Node apps](/docs/node-apps).

### 4. Copy the environment {#env}

Copy your variables from `dokku config:export shop` on the Dokku server into the app's `.env` with `sudo cipi app env shop`. Keep Cipi's `DB_*` and `REDIS_*` values: the database is now local.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

### 5. Copy the data {#data}

Database:

```bash
# on the Dokku server
$ dokku postgres:export shop-db > shop.sql      # or: dokku mysql:export shop-db > shop.sql
$ scp shop.sql cipi@NEW_IP:/tmp/ && ssh cipi@NEW_IP "sudo cipi db restore shop /tmp/shop.sql"
```

Files: for apps with persistent storage, find the host folder with `dokku storage:report shop` and `rsync` it to `/home/shop/shared/storage/app/` on Cipi.

### Test before anyone sees it {#test}

You can open the new copy with your real domain **only on your computer**, before changing DNS. Add one line to your hosts file (`/etc/hosts` on macOS and Linux, `C:\Windows\System32\drivers\etc\hosts` on Windows):

```text
203.0.113.20   shop.example.com
```

Browse the site, log in, place a test order, check e-mails and queued jobs. Remove the line when you're done. (HTTPS will warn until the certificate is issued after the DNS switch; that's expected.)

### 6. Workers and schedules {#workers}

Worker containers become Supervisor workers (`sudo cipi worker add shop --queue=…`), a Horizon container becomes `sudo cipi worker horizon enable shop`, and the scheduler container isn't needed: Cipi runs `schedule:run` every minute for every Laravel app.

### 7. Cut-over day {#cutover}

```flow
Lower the DNS TTL | a day before
> At your DNS provider, set the TTL of the domain's records to 300 seconds a day before the move. When you switch, the world follows within minutes instead of hours.
Freeze the old app | maintenance mode
> Put the old site in maintenance mode (`php artisan down` for Laravel) so nobody writes to the old database during the final copy.
Final data copy | last dump + files
> Dump the database again, copy it over and restore it with `sudo cipi db restore <app> <file>`. Re-run the files sync (`rsync`): only changes are copied, so it's quick.
Switch DNS | A record → new IP
> Point the domain's `A` (and `AAAA`) records at the Cipi server. Check with `dig +short yourdomain.com`.
HTTPS | cipi ssl install
> As soon as DNS answers with the new IP, run `sudo cipi ssl install <app>`. The certificate is issued in seconds and renews by itself.
Keep the old one | a week, then cancel
> Leave the old server stopped but intact for a week: going back is one DNS change. Then cancel the subscription and delete it.
```

### What doesn't move to Cipi {#not-moving}

| Thing | What to do instead |
| --- | --- |
| Non-PHP apps | Keep them on Dokku or another container platform. |
