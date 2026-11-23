---
title: "Cipi vs Coolify"
description: "Cipi vs Coolify: two free self-hosted platforms compared fairly, containers for any stack versus native Laravel and PHP, with pros, cons and a step-by-step move from Coolify to Cipi."
lead: "Both are free and self-hosted. Coolify is container-first for any stack; Cipi is a native Laravel and PHP platform."
name: Coolify
site: https://coolify.io
kind: Self-hosted Docker PaaS
family: docker
price: "Free (self-hosted); paid cloud option"
updated: 2026-11-23
keywords: coolify alternative laravel, coolify vs cipi, laravel without docker, migrate from coolify
choose_cipi:
  - Your apps are Laravel/PHP and you want them native, without a container layer
  - You want CLI automation, config as code and MCP
choose_them:
  - You host many different stacks and want one-click services from a dashboard
faq:
  - Is native faster than Docker? | For PHP, usually leaner: no container overhead, OPcache and FPM tuned per app, and simpler debugging. The bigger win is Laravel-specific automation.
  - How do I get my database out of Coolify? | `docker exec` into the database container and run `pg_dump` or `mariadb-dump`, or download the latest scheduled backup from your S3 bucket.
  - Can I keep some apps on Coolify? | Yes, on another server. Each domain points to the server that hosts it.
---
## In 30 seconds {#summary}

Coolify is an open-source, self-hostable PaaS: it builds and runs Docker containers for almost any stack, with one-click services and a web dashboard. Cipi skips containers for PHP and runs Laravel natively, with the Laravel lifecycle built in, configuration as code and MCP. Choose Coolify if you host many different stacks; choose Cipi if your apps are Laravel and PHP and you want them lean and Laravel-aware.

## At a glance {#glance}

|  | Cipi | Coolify |
| --- | --- | --- |
| Price | Free (MIT) | Free self-hosted (Apache 2.0); paid cloud-hosted dashboard |
| Model | Native Nginx, PHP-FPM or Octane, databases on Ubuntu | Docker containers behind a proxy |
| Interface | CLI first, optional panel | Web dashboard |
| Laravel lifecycle | Releases, workers, scheduler, Horizon, Reverb built in | Generic app containers you configure |
| Server settings in Git | `cipi.yml` | Compose files and dashboard settings |
| One-click services | Meilisearch, PostgreSQL, Valkey | Large catalogue |
| AI assistants (MCP) | Built in | Not advertised |

Prices as published by Coolify in November 2026; check [their site](https://coolify.io) for the current ones.

## What Coolify is {#what}

Coolify is an open-source, self-hostable platform (often described as a self-hosted Heroku or Vercel). It deploys apps from Git with Nixpacks, Dockerfiles or Docker Compose, runs databases and one-click services in containers, handles certificates through its proxy, and schedules database backups to S3.

## Pros and cons, honestly {#pros-cons}

**Where Coolify is strong**

| Point | What it means for you |
| --- | --- |
| Any stack | Node, Python, Go, PHP, static, compose files. |
| One-click services | Hundreds of templates. |
| Free and open source | Self-host it at no cost. |
| Database backups to S3 | Scheduled from the dashboard. |

**Where Coolify falls short**

| Point | What it means for you |
| --- | --- |
| Containers for everything | Extra layer, memory and complexity for a PHP app. |
| Laravel is generic | Workers, scheduler and Horizon are containers you wire yourself. |
| A dashboard to run and update | Coolify itself is an app to keep healthy. |

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

**Config as code and AI.** `cipi.yml` and MCP out of the box.

## Where everything goes in Cipi {#map}

Every Coolify feature you use today, and its place in Cipi. Use it as your migration checklist.

| In Coolify | In Cipi | Docs |
| --- | --- | --- |
| Application (Nixpacks/Dockerfile) | `cipi app create` (native build) | [Create an app](/docs/create-app) |
| Environment variables | `cipi app env` | [Environment](/docs/environment) |
| Database resource | `cipi db` (MariaDB, PostgreSQL) | [Databases](/docs/databases) |
| Scheduled database backups | `cipi backup` profiles to S3 | [Backups](/docs/backups) |
| Persistent storage / volumes | `/home/<app>/shared/storage` | [Deploying](/docs/deploying) |
| Worker / scheduler containers | `cipi worker add`, scheduler built in | [Workers](/docs/workers) |
| Proxy and certificates | Nginx + `cipi ssl install` | [SSL](/docs/ssl) |
| Services catalogue | Meilisearch, Valkey, PostgreSQL, packages | [Services](/docs/services) |

## Moving to Cipi, step by step {#move}

Rebuild each Laravel app natively on a Cipi server, copy env and data, then switch DNS.

**Before you start**

- Access to the Coolify dashboard and SSH to its server.
- Your app's repository.

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

For each app on Coolify, note: the Git repository and branch, the build or Dockerfile, environment variables (the resource's **Environment Variables** tab), attached databases, persistent volumes (uploads), workers and scheduled commands, domains. 

### 2. Install Cipi {#install}

Create a new VPS with Ubuntu 24.04 or 26.04 and run `wget -O - https://cipi.sh/setup.sh | bash`. Cipi runs PHP, Nginx and databases natively: no Docker needed. For PostgreSQL apps add `sudo cipi db install pgsql`.

### 3. Create the app {#create}

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --branch=main --php=8.5
```

What the Dockerfile did, Cipi already does: PHP extensions, Composer, `npm run build` (`--node-build`), migrations. Commands specific to your image go in `deploy.post` of [cipi.yml](/cipi-yml). Node front ends become [Node apps](/docs/node-apps).

### 4. Copy the environment {#env}

Copy your variables from the resource's **Environment Variables** tab into the app's `.env` with `sudo cipi app env shop`. Keep Cipi's `DB_*` and `REDIS_*` values: the database is now local.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

### 5. Copy the data {#data}

Database:

```bash
# on the Coolify server: find the database container, then dump it
$ docker ps --format '{{.Names}}' | grep -i postgres     # or mysql / mariadb
$ docker exec CONTAINER pg_dump -U USER --no-owner --no-acl DBNAME > shop.sql
# MySQL/MariaDB: docker exec CONTAINER mariadb-dump -u root -pPASSWORD DBNAME > shop.sql
$ scp shop.sql cipi@NEW_IP:/tmp/ && ssh cipi@NEW_IP "sudo cipi db restore shop /tmp/shop.sql"
```

Files: uploads stored on a volume can be copied with `docker cp CONTAINER:/path/to/storage/app ./storage-app` (the path depends on your image), then `rsync` to `/home/shop/shared/storage/app/` on Cipi. If you used Coolify's scheduled backups, you can also download the latest dump from S3.

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
| Non-PHP apps and arbitrary images | Keep them on Coolify or another container platform. |
| One-click services Cipi doesn't run | Host them separately and connect over the network. |
