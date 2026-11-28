---
title: "Cipi vs Ploi"
description: "Cipi vs Ploi: a fair comparison of two Laravel server tools, their strengths and limits, three-year cost, and a step-by-step migration from Ploi to a free, self-hosted Cipi server."
lead: "Ploi is a feature-rich hosted panel from the Netherlands, priced by number of servers. Cipi is free software that runs on the server itself."
name: Ploi
site: https://ploi.io
kind: SaaS server panel
family: panel
price: "Free tier; €8–30/mo by server count"
updated: 2026-11-23
keywords: ploi alternative, free ploi alternative, self-hosted ploi, migrate from ploi
choose_cipi:
  - You manage several servers and don't want a bill that grows with them
  - You want server settings in Git with `cipi.yml`
  - You want built-in MCP with SQL and Artisan guards
choose_them:
  - You want servers created for you from a hosted dashboard
  - You need status pages, load balancers or a mobile app out of the box
faq:
  - Is Ploi's free tier enough? | For one server and one site with five deploys a month. Cipi has no limits on servers, sites or deploys.
  - Can I move one site at a time? | Yes. Each site moves independently; DNS decides which server serves it.
  - Does Cipi have a dashboard? | Yes, optional and self-hosted: [Web panel](/web-panel).
  - What if I used Ploi's backups? | Download the last backup or dump the database directly (step 5), then set up [Cipi backups](/guides/backup-vps-s3).
  - Will queues and cron jobs move automatically? | No: add them once with `sudo cipi worker add` or [cipi.yml](/cipi-yml). The Laravel scheduler is already on.
  - What do I need to run Cipi? | A VPS (full virtual machine) with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443. 2 GB of RAM is comfortable for a few apps. See [Installation](/docs/installation).
  - Can I try Cipi without moving anything? | Yes. Install it on a new, cheap VPS, deploy a copy of one app and compare. Your current setup stays untouched until you change DNS.
  - Where do I get help? | The [docs](/docs/), the [guides](/guides/), GitHub issues, and the [Telegram channel](https://t.me/cipicloud) for releases and security notes. There's no paid support desk.
---
## In 30 seconds {#summary}

Ploi manages servers from a hosted dashboard, with a free tier for one server and paid plans by server count. Cipi gives you the same Laravel workflow (zero-downtime deploys, queues, scheduler, SSL, backups) without any subscription, plus `cipi.yml`, MCP for AI assistants and nightly security patching. Pick Ploi for a hosted dashboard with team features and status pages; pick Cipi to own the stack and stop paying per server.

## At a glance {#glance}

|  | Cipi | Ploi |
| --- | --- | --- |
| Price | Free, MIT licence | Free (1 server, 1 site, 5 deploys/month); Basic €8, Pro €13, Unlimited €30 per month |
| Where the control plane runs | On your server | ploi.io (SaaS, EU) |
| Creates servers on clouds | No | Yes, several providers |
| Zero-downtime deploys | Yes, always | Yes (Pro and up) |
| Server settings in Git | `cipi.yml` | Dashboard |
| Web dashboard | Optional, self-hosted | Hosted, plus mobile app |
| AI assistants (MCP) | Two built-in MCP servers | MCP server for the Ploi API |
| Backups | Built in, S3, encrypted, verified | Pro and up |
| Team management | Panel roles, scoped tokens | Unlimited plan |
| Cancel the subscription | Nothing to cancel | Servers keep running; management stops |

Prices as published by Ploi in November 2026; check [their site](https://ploi.io) for the current ones.

## What Ploi is {#what}

Ploi is a hosted server-management panel run by a Dutch company. It provisions servers on your cloud accounts, deploys PHP (and Node) sites, manages databases, queues, cron jobs, SSL and backups, and offers extras such as status pages and a mobile app. Plans are priced by how many servers you manage.

## Pros and cons, honestly {#pros-cons}

**Where Ploi is strong**

| Point | What it means for you |
| --- | --- |
| Generous feature set | Load balancers, database and worker servers, status pages, file explorer, mobile app. |
| EU company | Data stays with an EU provider. |
| Free tier | One server and one site to try it. |
| Servers keep working if you cancel | Ploi doesn't touch your servers when the subscription ends. |

**Where Ploi falls short**

| Point | What it means for you |
| --- | --- |
| Pricing grows with servers | More servers means a higher plan. |
| Key features behind higher plans | Backups and zero-downtime deploys from Pro; team management on Unlimited. |
| Configuration in a dashboard | Not reviewed in pull requests. |
| External control plane | Inventory and credentials stored with a third party. |

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
| You create the server yourself | Cipi installs on a VPS you rent (Hetzner, DigitalOcean, AWS…). It doesn't create servers on cloud accounts for you. |
| Ubuntu LTS only | Ubuntu 24.04 or 26.04, on a full virtual machine. No other distributions, no containers. |
| Focused on apps | Laravel, PHP, Node front ends and static sites. No e-mail hosting, DNS server or reseller accounts. |
| No paid support desk | Help comes from the docs, GitHub and the Telegram channel. You (or your team) own the server. |

## Why teams choose Cipi instead {#why-cipi}

**No per-server pricing.** Ten servers or a hundred: Cipi costs nothing.

**Every feature on every server.** Zero-downtime deploys, backups, health-check rollback and monitoring aren't plan-gated.

**Settings in pull requests.** `cipi.yml` makes server changes reviewable and repeatable.

**AI with guardrails.** Built-in MCP inside each app and for the whole server.

## What it costs over three years {#cost}

| Setup | Ploi | Cipi |
| --- | --- | --- |
| 5 servers, 3 years (Basic, €8) | €288 | €0 |
| 10 servers, 3 years (Pro, €13) | €468 | €0 |
| More than 10 servers (Unlimited, €30) | €1,080 | €0 |

Plan prices as listed by Ploi in November 2026 (monthly billing, before tax). Server costs are the same with both.

## Where everything goes in Cipi {#map}

Every Ploi feature you use today, and its place in Cipi. Use it as your migration checklist.

| In Ploi | In Cipi | Docs |
| --- | --- | --- |
| Server | A VPS + Cipi installer | [Installation](/docs/installation) |
| Site | `sudo cipi app create` | [Create an app](/docs/create-app) |
| Deploy script / zero downtime | Built-in releases, `deploy.post` | [How deploys work](/docs/how-deploys-work) |
| Environment | `sudo cipi app env` | [Environment](/docs/environment) |
| Daemons | `sudo cipi worker add`, Horizon | [Workers](/docs/workers) |
| Cronjobs | Scheduler on by default; `crons:` in cipi.yml | [Scheduler](/docs/scheduler) |
| Databases | `sudo cipi db` | [Databases](/docs/databases) |
| SSL | `sudo cipi ssl install` | [SSL](/docs/ssl) |
| Backups | `sudo cipi backup` profiles | [Backups](/docs/backups) |
| Monitoring | `sudo cipi monitor`, health checks | [Monitor](/docs/monitor) |
| Status pages | An external uptime service ([guide](/guides/cipi-agent-health-monitoring)) | Not built in |
| Load balancer servers | Not built in | Run several Cipi servers behind your provider's balancer |

## Moving to Cipi, step by step {#move}

Build the Cipi server next to the Ploi one, copy each site, test privately, then switch DNS. The Ploi server stays untouched until you're done.

**Before you start**

- SSH access to the Ploi server (`ssh ploi@OLD_IP`).
- Access to your DNS and to the repository settings.

Click a step to jump to it; the map follows you down the page.

```flow
Take inventory | what the app uses | #inventory
Install Cipi | on a new server | #install
Create the app | same repo, same domain | #create
Copy the .env | your keys, the old APP_KEY | #env
Copy the data | database and uploads | #data
Workers and scheduled jobs | daemons, cronjobs | #workers
Cut-over day | DNS, HTTPS, done | #cutover
```

### 1. Take inventory {#inventory}

Open Ploi's dashboard and write down, for each site you move:

| What | Where to find it in Ploi | You'll need it for |
| --- | --- | --- |
| Domain and aliases | Site → Settings / Aliases | `sudo cipi app create --domain`, `sudo cipi alias add` |
| Repository and branch | Site → Repository | `--repository`, `--branch` |
| PHP version | Site → PHP version | `--php` (Cipi offers 8.3–8.6) |
| Environment (`.env`) | Site → Environment | your own keys and `APP_KEY` |
| Daemons | Server → Daemons | `sudo cipi worker add` or Horizon |
| Cronjobs | Server → Cronjobs | the scheduler (automatic) or `crons:` in cipi.yml |
| Deploy script | Site → Deploy script | Cipi's deploy options or `deploy.post` |
| Databases | Server → Databases | `sudo cipi db restore` |

On the old server, the site's files are usually in `/home/ploi/shop.example.com`. You'll log in with `ssh ploi@OLD_IP`.

### 2. Install Cipi {#install}

Create a **new** VPS with Ubuntu 24.04 or 26.04 (don't install Cipi on the old server: it configures Nginx, PHP and users its own way). Then:

```bash
$ ssh root@NEW_IP
$ wget -O - https://cipi.sh/setup.sh | bash
$ ssh cipi@NEW_IP
$ sudo cipi php install 8.4          # the version the app uses today, if not the default
```

New to servers? [VPS, SSH and DNS basics](/guides/vps-ssh-dns-basics).

### 3. Create the app {#create}

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --branch=main --php=8.4
```

The summary shows a **deploy key**: add it to the repository as a read-only deploy key (or save a Git token in Cipi and it's done for you). Check with `sudo cipi git check shop`. Then add the other domains with `sudo cipi alias add shop www.shop.example.com`.

### 4. Copy the .env {#env}

Print the old file: `ssh ploi@OLD_IP "cat /home/ploi/shop.example.com/.env"`. Copy your own keys (mail, payments, storage, APIs) into the new app with `sudo cipi app env shop` (opens an editor). **Keep Cipi's database and Redis values**: they point at the new server.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

Then deploy once: `sudo cipi deploy shop`. Migrations create an empty schema; the data comes next.

### 5. Copy the data {#data}

Database, from the old server:

```bash
$ ssh ploi@OLD_IP
$ mysqldump --single-transaction --quick -u ploi -p shop | gzip > /tmp/shop.sql.gz
$ exit
$ scp ploi@OLD_IP:/tmp/shop.sql.gz . && scp shop.sql.gz cipi@NEW_IP:/tmp/
$ ssh cipi@NEW_IP "sudo cipi db restore shop /tmp/shop.sql.gz"
```

Uploaded files (skip if they're on S3):

```bash
$ rsync -az ploi@OLD_IP:/home/ploi/shop.example.com/storage/app/ ./shop-storage/
$ rsync -az ./shop-storage/ cipi@NEW_IP:/tmp/shop-storage/
$ ssh cipi@NEW_IP "sudo rsync -a /tmp/shop-storage/ /home/shop/shared/storage/app/ && sudo chown -R shop:shop /home/shop/shared/storage/app"
```

Cipi's restore stops at the first error and refuses empty dumps, so a broken file never wipes the database.

### 6. Workers and scheduled jobs {#workers}

For every queue Ploi ran, add a worker. The Laravel scheduler is already on for every app.

```bash
$ sudo cipi worker add shop --queue=emails --processes=2
$ sudo cipi worker horizon enable shop     # if you used Horizon
$ sudo cipi schedule status shop
```

Or put it all in [`cipi.yml`](/cipi-yml) so it lives with your code. Extra commands from the old deploy script go in `sudo cipi app deploy-config shop --extra-artisan=…` or in `deploy.post`.

### Test before anyone sees it {#test}

You can open the new copy with your real domain **only on your computer**, before changing DNS. Add one line to your hosts file (`/etc/hosts` on macOS and Linux, `C:\Windows\System32\drivers\etc\hosts` on Windows):

```text
203.0.113.20   shop.example.com
```

Browse the site, log in, place a test order, check e-mails and queued jobs. Remove the line when you're done. (HTTPS will warn until the certificate is issued after the DNS switch; that's expected.)

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

Also stop the old server's daemons and cronjobs, so jobs don't run twice against the old database.

### What doesn't move to Cipi {#not-moving}

| Thing | What to do instead |
| --- | --- |
| Status pages | Use an uptime service pointed at the app's health endpoint. |
| Load-balancer and dedicated database servers | Cipi manages each server on its own; put several behind your provider's load balancer if needed. |
| Mobile app | Web panel (responsive) or cipi-cli. |
