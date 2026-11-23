---
title: "Cipi vs Sevalla"
description: "Cipi vs Sevalla: Kinsta's managed application platform compared with a free platform on your own VPS, with pros, cons and how to move a Laravel app."
lead: "Sevalla bundles apps, databases and storage on its managed platform. Cipi runs the same on a VPS you own."
name: Sevalla
site: https://sevalla.com
kind: Managed PaaS
family: paas
price: "resource-based"
updated: 2026-11-23
keywords: sevalla alternative, sevalla vs vps laravel
choose_cipi:
  - You want root and a fixed bill
choose_them:
  - You want a managed platform with no servers
faq:
  - Can I keep my bucket? | Yes, copy its credentials into the app's `.env`.
---
## In 30 seconds {#summary}

Sevalla (by Kinsta) hosts applications, databases, static sites and object storage on managed infrastructure, billed by resources. Cipi runs Laravel and PHP on your own VPS with root and a fixed bill. Choose Sevalla for a managed platform with a polished dashboard; choose Cipi for control and predictable cost.

## At a glance {#glance}

|  | Cipi | Sevalla |
| --- | --- | --- |
| Pricing | Free tool; fixed VPS price | Resource-based |
| Servers | Your VPS, full root | Managed |
| Octane, Horizon, Reverb | One command each | Via your build or image |
| Regions | Any provider | The platform's data centres |

Prices as published by Sevalla in November 2026; check [their site](https://sevalla.com) for the current ones.

## What Sevalla is {#what}

Sevalla is a managed platform from Kinsta for applications (built from Git or images), databases, static sites and object storage.

## Pros and cons, honestly {#pros-cons}

**Where Sevalla is strong**

| Point | What it means for you |
| --- | --- |
| Managed | No servers to patch. |
| Polished dashboard | Easy for non-technical teammates. |
| Global data centres | Many regions to choose from. |

**Where Sevalla falls short**

| Point | What it means for you |
| --- | --- |
| Resource billing | Costs follow usage. |
| No root | You can't install or tune system software. |
| Laravel extras by hand | Workers and Octane through your build. |

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

**No lock-in.** A standard Ubuntu stack on any provider; move with `cipi sync`.

## Where everything goes in Cipi {#map}

Every Sevalla feature you use today, and its place in Cipi. Use it as your migration checklist.

| In Sevalla | In Cipi | Docs |
| --- | --- | --- |
| Application | `cipi app create` | [Create an app](/docs/create-app) |
| Environment variables | `cipi app env` | [Environment](/docs/environment) |
| Database | `cipi db` | [Databases](/docs/databases) |
| Object storage | Keep the bucket, or any S3-compatible provider |  |
| Processes | `cipi worker add` | [Workers](/docs/workers) |

## Moving to Cipi, step by step {#move}

Create the app on Cipi, copy variables, dump the database through its external connection, switch DNS.

**Before you start**

- The database's external connection details from Sevalla's dashboard.

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

In Sevalla's dashboard, note for each app: the repository and branch, build and start commands, environment variables (the application's environment variables), the database and its engine/version, file storage (local disk or a bucket), workers, scheduled jobs and domains. 

### 2. Install Cipi {#install}

Rent a VPS (2–4 GB RAM is plenty for most apps that ran on a PaaS) with Ubuntu 24.04 or 26.04 and run `wget -O - https://cipi.sh/setup.sh | bash`. For PostgreSQL apps: `sudo cipi db install pgsql`. Guide: [VPS, SSH and DNS basics](/guides/vps-ssh-dns-basics).

### 3. Create the app {#create}

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --branch=main --engine=pgsql
```

Use `--engine=pgsql` if the app used PostgreSQL, `--octane` if it ran on Octane, `--node-build='npm ci && npm run build'` for assets. Add the deploy key to the repository.

### 4. Copy the environment {#env}

Export or copy the variables from the application's environment variables into `sudo cipi app env shop`. Keep Cipi's `DB_*`/`REDIS_*` values.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

### 5. Copy the data {#data}

Use the database's external connection details with `pg_dump` or `mysqldump` from your laptop, then `sudo cipi db restore shop /tmp/shop.sql`.

Files: keep your object storage bucket, or download and upload the files.

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
