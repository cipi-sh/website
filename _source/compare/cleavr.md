---
title: "Cipi vs Cleavr"
description: "Cipi vs Cleavr: two ways to deploy Laravel with zero downtime, compared fairly, with the limits of both and a step-by-step migration to a free, self-hosted Cipi server."
lead: "Cleavr is a hosted panel with Laravel support. Cipi does the same jobs from the server itself, for free."
name: Cleavr
site: https://cleavr.io
kind: SaaS server panel
family: panel
price: "paid plans"
updated: 2026-11-23
keywords: cleavr alternative, free cleavr alternative, migrate from cleavr
choose_cipi:
  - You want no subscription and no external control plane
  - You want configuration as code and MCP
choose_them:
  - You prefer a hosted GUI and the vendor's support
  - You deploy many non-PHP frameworks from one dashboard
faq:
  - Does Cipi do zero-downtime deploys like Cleavr? | Yes: each deploy builds a new release and switches atomically, with instant rollback.
  - Can Cipi build in GitHub Actions? | Builds run on the server by default; you can [deploy from CI](/guides/laravel-ci-cd-git-workflow) after your tests pass.
  - Can I run Node apps? | Yes: SPA, static or SSR [Node apps](/docs/node-apps).
---
## In 30 seconds {#summary}

Cleavr manages servers and zero-downtime deploys for Laravel, Node and other frameworks from a hosted dashboard, on a subscription. Cipi gives Laravel and PHP the same release model, plus `cipi.yml`, MCP and nightly patching, without a subscription or an external control plane. Choose Cleavr for a hosted multi-framework GUI; choose Cipi to own the stack for free.

## At a glance {#glance}

|  | Cipi | Cleavr |
| --- | --- | --- |
| Price | Free, MIT | Paid plans |
| Control plane | On your server | SaaS |
| Zero-downtime deploys | Yes | Yes |
| Frameworks | Laravel, PHP, Node front ends, static | Laravel, PHP, Node and others |
| Server settings in Git | `cipi.yml` | Dashboard |
| AI assistants (MCP) | Built in | Not advertised |

Prices as published by Cleavr in November 2026; check [their site](https://cleavr.io) for the current ones.

## What Cleavr is {#what}

Cleavr is a hosted server-management service that provisions servers on cloud providers and deploys Laravel, Node.js and other apps with zero downtime, with optional builds in GitHub Actions.

## Pros and cons, honestly {#pros-cons}

**Where Cleavr is strong**

| Point | What it means for you |
| --- | --- |
| Many frameworks in one dashboard | Laravel, Node and more side by side. |
| Hosted GUI | No terminal needed. |
| Zero-downtime deploys | Release-based. |

**Where Cleavr falls short**

| Point | What it means for you |
| --- | --- |
| Subscription | A monthly fee for the panel. |
| External control plane | Depends on the vendor's service. |
| Configuration in the dashboard | Not versioned with your code. |

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

**Same deploy model, no bill.** Atomic releases and rollback for free.

**Config as code.** [cipi.yml](/cipi-yml).

**AI-ready.** [MCP](/mcp) with guardrails.

## Where everything goes in Cipi {#map}

Every Cleavr feature you use today, and its place in Cipi. Use it as your migration checklist.

| In Cleavr | In Cipi | Docs |
| --- | --- | --- |
| Site | `cipi app create` | [Create an app](/docs/create-app) |
| Deployment workflow | Releases + `deploy.post` | [How deploys work](/docs/how-deploys-work) |
| Environment | `cipi app env` | [Environment](/docs/environment) |
| Queues / daemons | `cipi worker add`, Horizon | [Workers](/docs/workers) |
| Scheduler | On by default |  |
| Databases | `cipi db` | [Databases](/docs/databases) |
| SSL | `cipi ssl install` | [SSL](/docs/ssl) |
| Node apps | [Node apps](/docs/node-apps) | SPA, static or SSR |

## Moving to Cipi, step by step {#move}

Build a Cipi server, recreate each site, copy env and data, test privately, switch DNS.

**Before you start**

- SSH access to the Cleavr-managed server.
- The site's folder: shown in Cleavr's site settings.

Click a step to jump to it; the map follows you down the page.

```flow
Take inventory | what the app uses | #inventory
Install Cipi | on a new server | #install
Create the app | same repo, same domain | #create
Copy the .env | your keys, the old APP_KEY | #env
Copy the data | database and uploads | #data
Workers and scheduled jobs | daemons, scheduled jobs | #workers
Cut-over day | DNS, HTTPS, done | #cutover
```

### 1. Take inventory {#inventory}

Open Cleavr's dashboard and write down, for each site you move:

| What | Where to find it in Cleavr | You'll need it for |
| --- | --- | --- |
| Domain and aliases | the site's domain settings | `cipi app create --domain`, `cipi alias add` |
| Repository and branch | the site's Git / deployment settings | `--repository`, `--branch` |
| PHP version | the site's PHP settings | `--php` (Cipi offers 8.3–8.6) |
| Environment (`.env`) | the site's environment or `.env` file | your own keys and `APP_KEY` |
| Daemons | the server's daemons / Supervisor section | `cipi worker add` or Horizon |
| Scheduled jobs | the server's cron section | the scheduler (automatic) or `crons:` in cipi.yml |
| Deploy script | the site's deploy script or hooks | Cipi's deploy options or `deploy.post` |
| Databases | the server's databases section | `cipi db restore` |

Replace `SITE_PATH` below with the folder Cleavr shows for the site (with releases, use its `current` folder for `.env` and `storage`).

On the old server, the site's files are usually in `SITE_PATH`. You'll log in with `ssh cleavr@OLD_IP`.

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

Print the old file: `ssh cleavr@OLD_IP "cat SITE_PATH/.env"`. Copy your own keys (mail, payments, storage, APIs) into the new app with `sudo cipi app env shop` (opens an editor). **Keep Cipi's database and Redis values**: they point at the new server.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

Then deploy once: `sudo cipi deploy shop`. Migrations create an empty schema; the data comes next.

### 5. Copy the data {#data}

Database, from the old server:

```bash
$ ssh cleavr@OLD_IP
$ mysqldump --single-transaction --quick -u DB_USER -p shop | gzip > /tmp/shop.sql.gz
$ exit
$ scp cleavr@OLD_IP:/tmp/shop.sql.gz . && scp shop.sql.gz cipi@NEW_IP:/tmp/
$ ssh cipi@NEW_IP "sudo cipi db restore shop /tmp/shop.sql.gz"
```

Uploaded files (skip if they're on S3):

```bash
$ rsync -az cleavr@OLD_IP:SITE_PATH/storage/app/ ./shop-storage/
$ rsync -az ./shop-storage/ cipi@NEW_IP:/tmp/shop-storage/
$ ssh cipi@NEW_IP "sudo rsync -a /tmp/shop-storage/ /home/shop/shared/storage/app/ && sudo chown -R shop:shop /home/shop/shared/storage/app"
```

Cipi's restore stops at the first error and refuses empty dumps, so a broken file never wipes the database.

### 6. Workers and scheduled jobs {#workers}

For every queue Cleavr ran, add a worker. The Laravel scheduler is already on for every app.

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

Also stop the old server's daemons and scheduled jobs, so jobs don't run twice against the old database.

### What doesn't move to Cipi {#not-moving}

| Thing | What to do instead |
| --- | --- |
| Server provisioning from the dashboard | Create the VPS at your provider, then install Cipi. |
