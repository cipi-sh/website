---
title: "Cipi vs moss.sh"
description: "Cipi vs moss.sh: a hosted virtual sysadmin compared with a free, self-hosted Laravel platform, with pros and cons of both and a step-by-step migration path."
lead: "moss.sh is a hosted \"virtual sysadmin\" for PHP, Node and more. Cipi runs on your server with no quotas."
name: moss.sh
site: https://moss.sh
kind: SaaS server panel
family: panel
price: "free tier, then paid plans"
updated: 2026-11-23
keywords: moss.sh alternative, moss alternative laravel
choose_cipi:
  - You want unlimited deploys and no subscription
  - You deploy Laravel and want it automated end to end
choose_them:
  - You want a hosted GUI for agency workflows across many stacks
faq:
  - Is Cipi only for Laravel? | Laravel first, but it also hosts plain PHP, WordPress, static sites and Node front ends.
  - Is there a dashboard? | Optional and self-hosted: [Web panel](/web-panel).
  - Is Cipi really free? | Yes. Cipi is MIT licensed with no subscription, no per-server and no per-site fees. You pay only for the VPS, to the provider you choose.
  - What do I need to run Cipi? | A VPS (full virtual machine) with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443. 2 GB of RAM is comfortable for a few apps. See [Installation](/docs/installation).
  - Can I try Cipi without moving anything? | Yes. Install it on a new, cheap VPS, deploy a copy of one app and compare. Your current setup stays untouched until you change DNS.
  - Where do I get help? | The [docs](/docs/), the [guides](/guides/), GitHub issues, and the [Telegram channel](https://t.me/cipicloud) for releases and security notes. There's no paid support desk.
  - What if I stop using Cipi later? | Your apps are standard Laravel on a standard Ubuntu stack (Nginx, PHP-FPM, MariaDB or PostgreSQL). Move them with a database dump and a Git checkout to any host; nothing is proprietary.
---
## In 30 seconds {#summary}

moss.sh manages servers and deploys several stacks from a hosted dashboard, with a free tier and paid plans. Cipi is free, Laravel-first and lives on your server, with no deploy quotas. Choose moss.sh for a hosted multi-stack GUI for an agency; choose Cipi to automate Laravel end to end without a subscription.

## At a glance {#glance}

|  | Cipi | moss.sh |
| --- | --- | --- |
| Price | Free, MIT | Free tier, then paid plans |
| Control plane | On your server | SaaS |
| Laravel lifecycle | Built in | Generic |
| Server settings in Git | `cipi.yml` | Dashboard |
| AI assistants (MCP) | Built in | Not advertised |

Prices as published by moss.sh in November 2026; check [their site](https://moss.sh) for the current ones.

## What moss.sh is {#what}

moss.sh is a hosted service that connects to your servers to deploy and manage PHP, Node and other web apps, aimed at freelancers and agencies.

## Pros and cons, honestly {#pros-cons}

**Where moss.sh is strong**

| Point | What it means for you |
| --- | --- |
| Multi-stack | PHP, Node and more. |
| Hosted GUI | For agencies managing client sites. |
| Free tier | To start small. |

**Where moss.sh falls short**

| Point | What it means for you |
| --- | --- |
| Subscription beyond the free tier | Paid plans as you grow. |
| External control plane | Your server management depends on a third-party service. |
| Not Laravel-specific | Queues, Horizon, Octane need manual setup. |

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

**Laravel end to end.** Releases, workers, scheduler, Horizon, Reverb, Octane, health checks.

**No quotas.** Unlimited apps, deploys and servers.

**Owned by you.** Nothing depends on a vendor's service.

## Where everything goes in Cipi {#map}

Every moss.sh feature you use today, and its place in Cipi. Use it as your migration checklist.

| In moss.sh | In Cipi | Docs |
| --- | --- | --- |
| Site | `cipi app create` | [Create an app](/docs/create-app) |
| Deploys | Webhook + releases | [How deploys work](/docs/how-deploys-work) |
| Workers | `cipi worker add` | [Workers](/docs/workers) |
| Cron | Scheduler / crontab | [Scheduler](/docs/scheduler) |
| Databases | `cipi db` | [Databases](/docs/databases) |
| SSL | `cipi ssl install` | [SSL](/docs/ssl) |

## Moving to Cipi, step by step {#move}

Build a Cipi server, recreate each site, copy env and data, test, switch DNS.

**Before you start**

- SSH access to the server moss.sh manages, and the site's folder from moss.sh's site settings.

Click a step to jump to it; the map follows you down the page.

```flow
Take inventory | what the app uses | #inventory
Install Cipi | on a new server | #install
Create the app | same repo, same domain | #create
Copy the .env | your keys, the old APP_KEY | #env
Copy the data | database and uploads | #data
Workers and scheduled jobs | background workers, scheduled tasks | #workers
Cut-over day | DNS, HTTPS, done | #cutover
```

### 1. Take inventory {#inventory}

Open moss.sh's dashboard and write down, for each site you move:

| What | Where to find it in moss.sh | You'll need it for |
| --- | --- | --- |
| Domain and aliases | the site's domain settings | `cipi app create --domain`, `cipi alias add` |
| Repository and branch | the site's Git / deployment settings | `--repository`, `--branch` |
| PHP version | the site's PHP settings | `--php` (Cipi offers 8.3–8.6) |
| Environment (`.env`) | the site's environment or `.env` file | your own keys and `APP_KEY` |
| Background workers | the server's daemons / Supervisor section | `cipi worker add` or Horizon |
| Scheduled tasks | the server's cron section | the scheduler (automatic) or `crons:` in cipi.yml |
| Deploy script | the site's deploy script or hooks | Cipi's deploy options or `deploy.post` |
| Databases | the server's databases section | `cipi db restore` |

Replace `SITE_USER` and `SITE_PATH` with the system user and folder moss.sh shows for the site.

On the old server, the site's files are usually in `SITE_PATH`. You'll log in with `ssh SITE_USER@OLD_IP`.

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

Print the old file: `ssh SITE_USER@OLD_IP "cat SITE_PATH/.env"`. Copy your own keys (mail, payments, storage, APIs) into the new app with `sudo cipi app env shop` (opens an editor). **Keep Cipi's database and Redis values**: they point at the new server.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

Then deploy once: `sudo cipi deploy shop`. Migrations create an empty schema; the data comes next.

### 5. Copy the data {#data}

Database, from the old server:

```bash
$ ssh SITE_USER@OLD_IP
$ mysqldump --single-transaction --quick -u DB_USER -p shop | gzip > /tmp/shop.sql.gz
$ exit
$ scp SITE_USER@OLD_IP:/tmp/shop.sql.gz . && scp shop.sql.gz cipi@NEW_IP:/tmp/
$ ssh cipi@NEW_IP "sudo cipi db restore shop /tmp/shop.sql.gz"
```

Uploaded files (skip if they're on S3):

```bash
$ rsync -az SITE_USER@OLD_IP:SITE_PATH/storage/app/ ./shop-storage/
$ rsync -az ./shop-storage/ cipi@NEW_IP:/tmp/shop-storage/
$ ssh cipi@NEW_IP "sudo rsync -a /tmp/shop-storage/ /home/shop/shared/storage/app/ && sudo chown -R shop:shop /home/shop/shared/storage/app"
```

Cipi's restore stops at the first error and refuses empty dumps, so a broken file never wipes the database.

### 6. Workers and scheduled jobs {#workers}

For every queue moss.sh ran, add a worker. The Laravel scheduler is already on for every app.

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

Also stop the old server's background workers and scheduled tasks, so jobs don't run twice against the old database.

### What doesn't move to Cipi {#not-moving}

| Thing | What to do instead |
| --- | --- |
| Hosted dashboard | Cipi CLI or the self-hosted [web panel](/web-panel). |
