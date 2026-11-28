---
title: "Cipi vs Laravel Cloud"
description: "Cipi vs Laravel Cloud: managed, usage-billed infrastructure compared with a free platform on your own VPS, with honest pros and cons and how to move an app off Laravel Cloud."
lead: "Laravel Cloud runs your app on managed infrastructure and bills usage. Cipi turns a VPS you own into a Laravel platform with a fixed bill."
name: Laravel Cloud
site: https://cloud.laravel.com
kind: Managed PaaS
family: paas
price: "from $5/mo plus usage"
updated: 2026-11-23
keywords: laravel cloud alternative, laravel cloud vs vps, self-hosted laravel cloud, migrate from laravel cloud
choose_cipi:
  - You want a fixed monthly bill and full root
  - You want to avoid platform lock-in
choose_them:
  - You never want to manage a server
  - You need autoscaling or scale-to-zero
faq:
  - Is a VPS cheaper than Laravel Cloud? | For steady traffic, usually yes: one fixed price covers app, database and cache. For very spiky or idle apps, scale-to-zero can win.
  - How do I export my database? | Use the connection details from the dashboard with `pg_dump` or `mysqldump`, then `sudo cipi db restore`.
  - Do I lose preview environments? | You can rebuild them with CI and a wildcard domain: [guide](/guides/laravel-preview-environments).
  - Is Cipi really free? | Yes. Cipi is MIT licensed with no subscription, no per-server and no per-site fees. You pay only for the VPS, to the provider you choose.
  - What do I need to run Cipi? | A VPS (full virtual machine) with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443. 2 GB of RAM is comfortable for a few apps. See [Installation](/docs/installation).
  - Can I try Cipi without moving anything? | Yes. Install it on a new, cheap VPS, deploy a copy of one app and compare. Your current setup stays untouched until you change DNS.
  - Where do I get help? | The [docs](/docs/), the [guides](/guides/), GitHub issues, and the [Telegram channel](https://t.me/cipicloud) for releases and security notes. There's no paid support desk.
  - Can Cipi host WordPress or non-Laravel PHP? | Yes, as [custom apps](/docs/custom-apps), each isolated with its own user, PHP pool and database. [WordPress guide](/guides/deploy-wordpress-custom-app).
---
## In 30 seconds {#summary}

Laravel Cloud is the Laravel team's fully managed platform: no servers, autoscaling, scale-to-zero, managed Postgres, MySQL and Valkey, preview environments. You pay plans plus usage. Cipi gives you the same Laravel features on a VPS you control, for the price of the VPS. Choose Laravel Cloud to never think about servers and to scale automatically; choose Cipi for predictable cost, root access and portability.

## At a glance {#glance}

|  | Cipi | Laravel Cloud |
| --- | --- | --- |
| Pricing | Free tool; fixed VPS price | Plans plus usage |
| Servers | Your VPS, full root | None to manage, no root |
| Autoscaling, scale-to-zero | No: size the VPS | Yes |
| Managed databases and cache | On your VPS (MariaDB, PostgreSQL, Valkey) | Managed (Serverless Postgres, MySQL, Valkey) |
| Preview environments | Via CI ([guide](/guides/laravel-preview-environments)) | Built in on higher plans |
| Octane, queues, Reverb | Yes | Yes |
| Portability | Standard Ubuntu stack, any provider | Tied to the platform |
| Server settings in Git | `cipi.yml` | Environment settings in the platform |

Prices as published by Laravel Cloud in November 2026; check [their site](https://cloud.laravel.com) for the current ones.

## What Laravel Cloud is {#what}

Laravel Cloud is a fully managed platform from the Laravel team. You connect a repository, pick compute and attach managed databases, caches and object storage; it builds, deploys and scales the app, with preview environments and scale-to-zero options.

## Pros and cons, honestly {#pros-cons}

**Where Laravel Cloud is strong**

| Point | What it means for you |
| --- | --- |
| Nothing to manage | No OS, no patches, no SSH. |
| Autoscaling | Handles spikes and scales to zero. |
| Laravel-native | Built by the framework's team. |

**Where Laravel Cloud falls short**

| Point | What it means for you |
| --- | --- |
| Usage-based bill | Harder to predict; grows with traffic and resources. |
| No root | You can't install or tune system software. |
| Platform lock-in | Databases and storage are platform resources. |

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
| No autoscaling | You size the server; to grow, resize it or add servers. |
| You create the server yourself | Cipi installs on a VPS you rent (Hetzner, DigitalOcean, AWS…). It doesn't create servers on cloud accounts for you. |
| Ubuntu LTS only | Ubuntu 24.04 or 26.04, on a full virtual machine. No other distributions, no containers. |
| Focused on apps | Laravel, PHP, Node front ends and static sites. No e-mail hosting, DNS server or reseller accounts. |
| No paid support desk | Help comes from the docs, GitHub and the Telegram channel. You (or your team) own the server. |

## Why teams choose Cipi instead {#why-cipi}

**A fixed, predictable bill.** One VPS price, whatever the traffic spikes; no per-request or per-GB surprises.

**Root access.** Install what you need, read any log, tune PHP and Nginx.

**No lock-in.** A standard Ubuntu stack on any provider; move with `sudo cipi sync`.

**Same Laravel features.** Octane, Horizon, Reverb, Meilisearch, scheduler, health checks and rollback.

## Where everything goes in Cipi {#map}

Every Laravel Cloud feature you use today, and its place in Cipi. Use it as your migration checklist.

| In Laravel Cloud | In Cipi | Docs |
| --- | --- | --- |
| Application / environment | `sudo cipi app create` (one app per environment) | [Create an app](/docs/create-app) |
| Environment variables | `sudo cipi app env` | [Environment](/docs/environment) |
| Serverless Postgres / MySQL | `sudo cipi db` (PostgreSQL or MariaDB) on the server | [Databases](/docs/databases) |
| Valkey cache | Per-app Valkey | [Valkey](/docs/valkey) |
| Object storage | Keep your S3 bucket, or any S3-compatible provider |  |
| Workers | `sudo cipi worker add`, Horizon | [Workers](/docs/workers) |
| Scheduler | On by default |  |
| Preview environments | CI + wildcard domain | [Guide](/guides/laravel-preview-environments) |

## Moving to Cipi, step by step {#move}

Create the app on Cipi, copy variables, dump the managed database through its connection details, switch DNS.

**Before you start**

- Access to the Laravel Cloud dashboard (database connection details, environment variables).
- `pg_dump` or `mysqldump` on your laptop.

Click a step to jump to it; the map follows you down the page.

```flow
Take inventory | app, env, database, storage | #inventory
Install Cipi | on your own server | #install
Create the app | same repo, same domain | #create
Copy the environment | variables → .env | #env
Copy the data | database and files | #data
Workers and schedules | queues, cron | #workers
Cut-over day | DNS, HTTPS, done | #cutover
```

### 1. Take inventory {#inventory}

In Laravel Cloud's dashboard, note for each app: the repository and branch, build and start commands, environment variables (the environment's **Settings → Environment variables**), the database and its engine/version, file storage (local disk or a bucket), workers, scheduled jobs and domains. 

### 2. Install Cipi {#install}

Rent a VPS (2–4 GB RAM is plenty for most apps that ran on a PaaS) with Ubuntu 24.04 or 26.04 and run `wget -O - https://cipi.sh/setup.sh | bash`. For PostgreSQL apps: `sudo cipi db install pgsql`. Guide: [VPS, SSH and DNS basics](/guides/vps-ssh-dns-basics).

### 3. Create the app {#create}

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --branch=main --engine=pgsql
```

Use `--engine=pgsql` if the app used PostgreSQL, `--octane` if it ran on Octane, `--node-build='npm ci && npm run build'` for assets. Add the deploy key to the repository.

### 4. Copy the environment {#env}

Export or copy the variables from the environment's **Settings → Environment variables** into `sudo cipi app env shop`. Keep Cipi's `DB_*`/`REDIS_*` values.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

### 5. Copy the data {#data}

Get the database's host, user and password from the database's connection details in the dashboard, then dump from your laptop:

```bash
# PostgreSQL
$ pg_dump "postgresql://USER:PASSWORD@HOST/DB?sslmode=require" --no-owner --no-acl > shop.sql
# MySQL
$ mysqldump -h HOST -u USER -p --single-transaction DB > shop.sql
$ scp shop.sql cipi@NEW_IP:/tmp/ && ssh cipi@NEW_IP "sudo cipi db restore shop /tmp/shop.sql"
```

Files: if the app stores files in object storage (S3/R2), keep using the same bucket: copy its `AWS_*` variables. Nothing to move.

### Test before anyone sees it {#test}

You can open the new copy with your real domain **only on your computer**, before changing DNS. Add one line to your hosts file (`/etc/hosts` on macOS and Linux, `C:\Windows\System32\drivers\etc\hosts` on Windows):

```text
203.0.113.20   shop.example.com
```

Browse the site, log in, place a test order, check e-mails and queued jobs. Remove the line when you're done. (HTTPS will warn until the certificate is issued after the DNS switch; that's expected.)

### 6. Workers and schedules {#workers}

Add a worker per queue (`sudo cipi worker add shop --queue=…`) or enable Horizon. The scheduler is already on. Then deploy once more and check `sudo cipi app logs shop --type=laravel`.

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
| Autoscaling and scale-to-zero | Size the VPS for your peak; resize later if needed. |
| Managed database features (branching, point-in-time restore) | Cipi backups every 30 minutes and pre-deploy snapshots. |
