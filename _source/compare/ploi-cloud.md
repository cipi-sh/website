---
title: "Cipi vs Ploi Cloud"
description: "Cipi vs Ploi Cloud: a managed EU platform compared with a free platform on your own VPS, with pros, cons and how to move an app."
lead: "Ploi Cloud runs apps on its managed platform. Cipi runs them on a VPS you own. Not the same product as Ploi.io, the server panel."
name: Ploi Cloud
site: https://ploi.cloud
kind: Managed PaaS
family: paas
price: "resource-based pricing"
updated: 2026-11-23
keywords: ploi cloud alternative, ploi cloud vs vps
choose_cipi:
  - You want full root and a fixed bill
  - You want to pick any provider
choose_them:
  - You want a managed EU platform with no servers
faq:
  - Is Ploi Cloud the same as Ploi? | No. Ploi.io manages your servers; Ploi Cloud is a managed platform. See [Cipi vs Ploi](/alternative-to-ploi) for the panel.
  - Can I host Cipi in the EU? | Yes, on any EU provider (Hetzner, OVHcloud, Scaleway…).
  - Is Cipi really free? | Yes. Cipi is MIT licensed with no subscription, no per-server and no per-site fees. You pay only for the VPS, to the provider you choose.
  - What do I need to run Cipi? | A VPS (full virtual machine) with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443. 2 GB of RAM is comfortable for a few apps. See [Installation](/docs/installation).
  - Can I try Cipi without moving anything? | Yes. Install it on a new, cheap VPS, deploy a copy of one app and compare. Your current setup stays untouched until you change DNS.
  - Is there a web dashboard? | Optional and self-hosted: the [Cipi web panel](/web-panel) manages several servers, with roles and SSO. Everything also works from the CLI and the [API](/api).
  - Where do I get help? | The [docs](/docs/), the [guides](/guides/), GitHub issues, and the [Telegram channel](https://t.me/cipicloud) for releases and security notes. There's no paid support desk.
  - Can Cipi host WordPress or non-Laravel PHP? | Yes, as [custom apps](/docs/custom-apps), each isolated with its own user, PHP pool and database. [WordPress guide](/guides/deploy-wordpress-custom-app).
---
## In 30 seconds {#summary}

Ploi Cloud is a managed EU platform for Laravel, PHP and Node apps with managed databases and storage, billed by resources. Cipi runs the same kind of apps on a VPS you control, for the price of the VPS. Choose Ploi Cloud for a managed platform in the EU; choose Cipi for root access, fixed cost and portability.

## At a glance {#glance}

|  | Cipi | Ploi Cloud |
| --- | --- | --- |
| Pricing | Free tool; fixed VPS price | Resource-based |
| Servers | Your VPS, full root | Managed, no root |
| Regions | Wherever you rent a VPS | The platform's regions |
| Managed services | On your VPS | Managed databases and storage |
| AI assistants (MCP) | Built in, on your server | Hosted MCP |

Prices as published by Ploi Cloud in November 2026; check [their site](https://ploi.cloud) for the current ones.

## What Ploi Cloud is {#what}

Ploi Cloud is a managed application platform from the team behind Ploi, hosted in the EU, running Laravel, PHP and Node apps with managed databases and storage.

## Pros and cons, honestly {#pros-cons}

**Where Ploi Cloud is strong**

| Point | What it means for you |
| --- | --- |
| Managed | No servers to patch. |
| EU hosting | Data stays in Europe. |
| Laravel-aware | Built by a Laravel tooling company. |

**Where Ploi Cloud falls short**

| Point | What it means for you |
| --- | --- |
| Resource billing | Costs follow usage. |
| No root | You can't install or tune system software. |
| Platform lock-in | Moving out means a migration like this one. |

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

Every Ploi Cloud feature you use today, and its place in Cipi. Use it as your migration checklist.

| In Ploi Cloud | In Cipi | Docs |
| --- | --- | --- |
| App | `sudo cipi app create` | [Create an app](/docs/create-app) |
| Environment | `sudo cipi app env` | [Environment](/docs/environment) |
| Managed database | `sudo cipi db` | [Databases](/docs/databases) |
| Storage | S3 bucket or local storage |  |
| Workers | `sudo cipi worker add` | [Workers](/docs/workers) |

## Moving to Cipi, step by step {#move}

Create the app on Cipi, copy variables, dump the database with its connection details, switch DNS.

**Before you start**

- Access to Ploi Cloud's dashboard and the database connection details.

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

In Ploi Cloud's dashboard, note for each app: the repository and branch, build and start commands, environment variables (the app's environment settings), the database and its engine/version, file storage (local disk or a bucket), workers, scheduled jobs and domains. 

### 2. Install Cipi {#install}

Rent a VPS (2–4 GB RAM is plenty for most apps that ran on a PaaS) with Ubuntu 24.04 or 26.04 and run `wget -O - https://cipi.sh/setup.sh | bash`. For PostgreSQL apps: `sudo cipi db install pgsql`. Guide: [VPS, SSH and DNS basics](/guides/vps-ssh-dns-basics).

### 3. Create the app {#create}

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --branch=main --engine=pgsql
```

Use `--engine=pgsql` if the app used PostgreSQL, `--octane` if it ran on Octane, `--node-build='npm ci && npm run build'` for assets. Add the deploy key to the repository.

### 4. Copy the environment {#env}

Export or copy the variables from the app's environment settings into `sudo cipi app env shop`. Keep Cipi's `DB_*`/`REDIS_*` values.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

### 5. Copy the data {#data}

Dump the database with the connection details shown for it (`pg_dump` or `mysqldump` from your laptop), copy the file to the server and run `sudo cipi db restore shop /tmp/shop.sql`.

Files: keep using your S3 bucket by copying its variables, or download the files and upload them to `/home/shop/shared/storage/app/`.

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
