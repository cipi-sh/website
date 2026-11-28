---
title: "Cipi vs Render"
description: "Cipi vs Render: a multi-language managed cloud compared with a free Laravel platform on your own VPS, with pros, cons and how to move a Laravel app off Render."
lead: "Render runs any language as managed services. Cipi runs Laravel and PHP natively on a server you own."
name: Render
site: https://render.com
kind: Managed PaaS
family: paas
price: "usage-based"
updated: 2026-11-23
keywords: render alternative laravel, render vs vps laravel
choose_cipi:
  - You run Laravel and want root and a fixed bill
choose_them:
  - You run many languages as managed services
  - You need autoscaling
faq:
  - Can I keep PostgreSQL? | Yes: `sudo cipi db install pgsql` and create the app with `--engine=pgsql`.
  - Do I need Docker on Cipi? | No. Cipi builds Laravel natively.
  - Is Cipi really free? | Yes. Cipi is MIT licensed with no subscription, no per-server and no per-site fees. You pay only for the VPS, to the provider you choose.
  - What do I need to run Cipi? | A VPS (full virtual machine) with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443. 2 GB of RAM is comfortable for a few apps. See [Installation](/docs/installation).
  - Can I try Cipi without moving anything? | Yes. Install it on a new, cheap VPS, deploy a copy of one app and compare. Your current setup stays untouched until you change DNS.
  - Is there a web dashboard? | Optional and self-hosted: the [Cipi web panel](/web-panel) manages several servers, with roles and SSO. Everything also works from the CLI and the [API](/api).
  - Where do I get help? | The [docs](/docs/), the [guides](/guides/), GitHub issues, and the [Telegram channel](https://t.me/cipicloud) for releases and security notes. There's no paid support desk.
  - Can Cipi host WordPress or non-Laravel PHP? | Yes, as [custom apps](/docs/custom-apps), each isolated with its own user, PHP pool and database. [WordPress guide](/guides/deploy-wordpress-custom-app).
---
## In 30 seconds {#summary}

Render hosts web services, workers, cron jobs and managed Postgres for many languages, billed by instance size and usage. Laravel runs there through Docker. Cipi runs Laravel natively on your VPS with the lifecycle built in, for a fixed price. Choose Render for managed multi-language services with previews; choose Cipi for Laravel with root and predictable cost.

## At a glance {#glance}

|  | Cipi | Render |
| --- | --- | --- |
| Pricing | Free tool; fixed VPS price | Usage-based instances |
| Stack | Native Nginx, PHP-FPM or Octane, MariaDB/PostgreSQL | Containers and managed services |
| Preview environments | Via CI ([guide](/guides/laravel-preview-environments)) | Built in |
| Autoscaling | No | Yes |
| Root access | Yes | No |

Prices as published by Render in November 2026; check [their site](https://render.com) for the current ones.

## What Render is {#what}

Render is a managed cloud platform for web services, background workers, cron jobs, static sites and managed PostgreSQL and key-value stores. PHP apps typically run from a Dockerfile.

## Pros and cons, honestly {#pros-cons}

**Where Render is strong**

| Point | What it means for you |
| --- | --- |
| Managed and multi-language | Many runtimes without servers to run. |
| Preview environments | A URL per pull request. |
| Autoscaling | Instances added under load. |

**Where Render falls short**

| Point | What it means for you |
| --- | --- |
| PHP through Docker | You maintain the image. |
| Usage billing | Each service and database is a separate line. |
| No root | You can't install or tune system software. |

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

## Where everything goes in Cipi {#map}

Every Render feature you use today, and its place in Cipi. Use it as your migration checklist.

| In Render | In Cipi | Docs |
| --- | --- | --- |
| Web service | `sudo cipi app create` | [Create an app](/docs/create-app) |
| Background worker | `sudo cipi worker add` | [Workers](/docs/workers) |
| Cron job | Scheduler built in | [Scheduler](/docs/scheduler) |
| Render Postgres | `sudo cipi db` with `--engine=pgsql` | [Databases](/docs/databases) |
| Environment groups | `sudo cipi app env` | [Environment](/docs/environment) |
| Persistent disk | `/home/<app>/shared/storage` |  |

## Moving to Cipi, step by step {#move}

Create the app on Cipi, copy variables, dump Postgres via its external URL, switch DNS.

**Before you start**

- The database's **External Database URL** from Render's dashboard.

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

In Render's dashboard, note for each app: the repository and branch, build and start commands, environment variables (the service's **Environment** tab and environment groups), the database and its engine/version, file storage (local disk or a bucket), workers, scheduled jobs and domains. 

### 2. Install Cipi {#install}

Rent a VPS (2–4 GB RAM is plenty for most apps that ran on a PaaS) with Ubuntu 24.04 or 26.04 and run `wget -O - https://cipi.sh/setup.sh | bash`. For PostgreSQL apps: `sudo cipi db install pgsql`. Guide: [VPS, SSH and DNS basics](/guides/vps-ssh-dns-basics).

### 3. Create the app {#create}

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --branch=main --engine=pgsql
```

Use `--engine=pgsql` if the app used PostgreSQL, `--octane` if it ran on Octane, `--node-build='npm ci && npm run build'` for assets. Add the deploy key to the repository.

### 4. Copy the environment {#env}

Export or copy the variables from the service's **Environment** tab and environment groups into `sudo cipi app env shop`. Keep Cipi's `DB_*`/`REDIS_*` values.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

### 5. Copy the data {#data}

```bash
$ pg_dump "EXTERNAL_DATABASE_URL" --no-owner --no-acl > shop.sql
$ scp shop.sql cipi@NEW_IP:/tmp/ && ssh cipi@NEW_IP "sudo cipi db restore shop /tmp/shop.sql"
```

Create the Cipi app with `--engine=pgsql` (after `sudo cipi db install pgsql`).

Files: files on a persistent disk can be copied with Render's shell or `scp`; files in S3 stay where they are.

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
