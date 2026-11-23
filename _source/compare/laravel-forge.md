---
title: "Cipi vs Laravel Forge"
description: "Cipi vs Laravel Forge, explained honestly: what each does best, the limits of both, what you pay over three years, and a real step-by-step migration from Forge to a free, self-hosted Cipi server."
lead: "Both deploy Laravel to a VPS with zero downtime. Forge is a polished SaaS from the Laravel team; Cipi is free software that lives on the server it manages."
name: Laravel Forge
site: https://forge.laravel.com
kind: SaaS server panel
family: panel
price: "from $12/mo per account"
updated: 2026-11-23
keywords: laravel forge alternative, free forge alternative, self-hosted laravel forge, migrate from forge
choose_cipi:
  - You want to stop paying for the panel and keep everything on your own server
  - You want server settings reviewed in pull requests with `cipi.yml`
  - You want AI assistants to operate apps safely through MCP
  - You need EU data sovereignty with no third-party processor
choose_them:
  - You want servers created for you on cloud providers from a dashboard
  - You prefer a hosted product with commercial support from the Laravel team
  - Your team never wants to touch a terminal
faq:
  - Is Cipi a drop-in replacement for Forge? | For running Laravel on your own servers, yes: zero-downtime deploys, queues, scheduler, SSL, databases, backups and a web panel. The difference is that you create the VPS yourself at your provider. See [the feature map](#map).
  - Can I try Cipi without leaving Forge? | Yes. Install Cipi on a new VPS, deploy a staging copy of an app, and compare. Nothing on the Forge server changes.
  - Will my deploy script work? | Cipi already runs `composer install`, migrations, `optimize`, `storage:link` and worker restarts. Add anything else with `--extra-artisan`, `deploy.post` in [cipi.yml](/docs/yml) or a [Deployer task](/docs/deploy-script).
  - Can I install Cipi on my existing Forge server? | No. Cipi needs a fresh Ubuntu server. A new server is also your rollback plan: the old one keeps running until DNS moves.
  - What about the database password and Redis? | Cipi creates new ones on the new server and writes them to `.env`. Only your own keys and `APP_KEY` come from Forge.
  - How long is the downtime? | Only the final database copy: usually a minute or two. Lower the DNS TTL a day before and use maintenance mode during the last dump.
  - Is there a web dashboard like Forge's? | Yes, optional and self-hosted: [Web panel](/web-panel). It manages many Cipi servers, with roles and SSO.
  - What if I need help? | Docs, guides, GitHub issues and the [Telegram channel](https://t.me/cipicloud). There's no paid support desk.
---
## In 30 seconds {#summary}

Forge is a hosted dashboard that provisions and manages servers on your cloud accounts, for a monthly account fee. Cipi does the same job for Laravel and PHP from **inside** your server, for free, with configuration in Git (`cipi.yml`), built-in AI tooling (MCP) and nightly security patching. Pick Forge if you want servers created for you from a dashboard and commercial support from the Laravel team; pick Cipi if you'd rather own the whole stack and stop paying for the control plane.

## At a glance {#glance}

|  | Cipi | Laravel Forge |
| --- | --- | --- |
| Price | Free, MIT licence | Hobby $12, Growth $19, Business $39 per month (account plans) |
| Where the control plane runs | On your server; nothing external | forge.laravel.com (SaaS) |
| Creates servers on clouds | No: you create the VPS, Cipi installs everything | Yes: major clouds and Laravel VPS |
| Zero-downtime deploys | Yes, atomic releases with instant rollback | Yes |
| Auto-rollback on a failing health check | Yes | No |
| Server settings in Git | `cipi.yml`, planned and applied all or nothing | Deploy script and settings in the dashboard |
| Web dashboard | Optional, self-hosted, multi-server, roles, SSO | Hosted |
| CLI and API | Full CLI, REST API, cipi-cli, PHP SDK | API and CLI |
| AI assistants (MCP) | Two built-in MCP servers | Via third-party MCP servers on the API |
| Per-app isolation | Own Linux user, PHP pool, DB user, Valkey per app | Optional site isolation |
| Security patching | PHP nightly, services via autoupdate, alerts while vulnerable | Ubuntu unattended upgrades |
| Anonymized database dumps | Built in (Cipi Agent) | No |
| Where your infrastructure data lives | On your server | With a US-based SaaS |

Prices as published by Laravel Forge in November 2026; check [their site](https://forge.laravel.com) for the current ones.

## What Laravel Forge is {#what}

Laravel Forge is the Laravel team's hosted server-management service. You connect a cloud account (or buy a Laravel VPS), Forge creates the server, installs Nginx, PHP, a database and Redis, and from then on you manage sites, deployments, queues, scheduler, SSL and backups from the forge.laravel.com dashboard. It's billed per account, not per server.

## Pros and cons, honestly {#pros-cons}

**Where Laravel Forge is strong**

| Point | What it means for you |
| --- | --- |
| Servers created for you | Connect DigitalOcean, Hetzner, AWS and others, or buy a Laravel VPS: no SSH needed to get started. |
| Mature, polished dashboard | Years of refinement and a large user base; most tutorials assume it. |
| Backed by the Laravel team | Commercial support and tight integration with the Laravel ecosystem. |
| Flat account pricing | One fee covers many servers. |

**Where Laravel Forge falls short**

| Point | What it means for you |
| --- | --- |
| A subscription forever | The panel costs money every month, on top of the servers. |
| External control plane | Your server inventory, credentials and deploy history live in a third-party SaaS. |
| Configuration lives in a dashboard | Deploy scripts and settings aren't reviewed in pull requests. |
| Limited guardrails | No built-in health-check rollback, anonymizer or MCP with SQL and Artisan guards. |

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

**Stop paying for the control plane.** Cipi does deploys, workers, SSL, databases, backups and monitoring for free; you keep paying only the VPS.

**Review infrastructure like code.** A pull request that changes PHP, adds a worker or a backup profile shows the exact plan before anything is applied ([cipi.yml](/cipi-yml)).

**Safer by default.** Per-app users, nightly PHP patches, malware integrity scans, health-check rollback and a hash-chained deploy ledger come out of the box.

**Ready for AI.** Let Claude, Cursor or VS Code read logs, check migrations and deploy, through [MCP](/mcp) servers with guards and redaction.

**Your data stays with you.** Nothing about your servers leaves them: helpful for GDPR and client contracts.

## What it costs over three years {#cost}

| Setup | Forge (Growth plan) | Cipi |
| --- | --- | --- |
| Panel, 3 years | $19 × 36 = $684 | $0 |
| Servers | Same | Same |
| Optional web panel | Included | Free, self-hosted on any server |

Plan prices as listed by Forge in November 2026, before tax. The server bill is identical: both use a VPS you pay to your provider.

## Where everything goes in Cipi {#map}

Every Laravel Forge feature you use today, and its place in Cipi. Use it as your migration checklist.

| In Laravel Forge | In Cipi | Docs |
| --- | --- | --- |
| Server (provider connection) | A VPS you create, then `wget -O - https://cipi.sh/setup.sh \| bash` | Any provider with Ubuntu 24.04/26.04 |
| Site | `cipi app create` | Laravel, Octane, Node or custom PHP |
| Quick deploy | Webhook, created with the app | [Auto-deploy](/docs/auto-deploy) |
| Deploy script | Deploy options, `deploy.post`, Deployer tasks | [Deploy script](/docs/deploy-script) |
| Zero-downtime deployments | Always on | Releases with rollback |
| Environment | `cipi app env` | `/home/<app>/shared/.env` |
| Daemons / queue workers | `cipi worker add`, Horizon | [Workers](/docs/workers) |
| Scheduler | On for every Laravel app | [Scheduler](/docs/scheduler) |
| Databases | `cipi db` (MariaDB, PostgreSQL) | [Databases](/docs/databases) |
| Let's Encrypt | `cipi ssl install` (wildcards via Cloudflare) | [SSL](/docs/ssl) |
| Backups | `cipi backup` profiles to S3, encrypted | [Backups](/docs/backups) |
| Monitoring | `cipi monitor`, health checks, alerts | [Monitor](/docs/monitor) |
| Team / circles | Panel users and roles, scoped API tokens | [Web panel](/web-panel) |
| Forge API | Cipi REST API + MCP | [API](/api) |

## Moving to Cipi, step by step {#move}

The plan: build a Cipi server next to the Forge one, copy each app, test it privately, then switch DNS. The Forge server keeps running until the last step, so you can stop at any point. Full walkthrough with extra detail: [Move from Forge to Cipi](/guides/migrate-from-laravel-forge).

**Before you start**

- SSH access to the Forge server (`ssh forge@OLD_IP`) and to your DNS.
- The app's repository, and a moment to add a deploy key to it.
- About an hour per app the first time, less after.

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

Open Forge's dashboard and write down, for each site you move:

| What | Where to find it in Forge | You'll need it for |
| --- | --- | --- |
| Domain and aliases | Site → Domains | `cipi app create --domain`, `cipi alias add` |
| Repository and branch | Site → Repository | `--repository`, `--branch` |
| PHP version | Site → Settings (PHP version) | `--php` (Cipi offers 8.3–8.6) |
| Environment (`.env`) | Site → Environment | your own keys and `APP_KEY` |
| Daemons | Server → Daemons / Background processes | `cipi worker add` or Horizon |
| Scheduled jobs | Server → Scheduler | the scheduler (automatic) or `crons:` in cipi.yml |
| Deploy script | Site → Deployments → Deploy script | Cipi's deploy options or `deploy.post` |
| Databases | Server → Databases | `cipi db restore` |

On the old server, the site's files are usually in `/home/forge/shop.example.com`. You'll log in with `ssh forge@OLD_IP`.

### 2. Install Cipi {#install}

Create a **new** VPS with Ubuntu 24.04 or 26.04 (don't install Cipi on the old server: it configures Nginx, PHP and users its own way). Then:

```bash
$ ssh root@NEW_IP
$ wget -O - https://cipi.sh/setup.sh | bash
$ ssh cipi@NEW_IP
$ sudo cipi php install 8.4          # the version the app uses today, if not the default
```

If the site used PostgreSQL on Forge: `sudo cipi db install pgsql` and add `--engine=pgsql` when creating the app.

New to servers? [VPS, SSH and DNS basics](/guides/vps-ssh-dns-basics).

### 3. Create the app {#create}

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --branch=main --php=8.4
```

The summary shows a **deploy key**: add it to the repository as a read-only deploy key (or save a Git token in Cipi and it's done for you). Check with `sudo cipi git check shop`. Then add the other domains with `sudo cipi alias add shop www.shop.example.com`.

### 4. Copy the .env {#env}

Print the old file: `ssh forge@OLD_IP "cat /home/forge/shop.example.com/.env"`. Copy your own keys (mail, payments, storage, APIs) into the new app with `sudo cipi app env shop` (opens an editor). **Keep Cipi's database and Redis values**: they point at the new server.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

Then deploy once: `sudo cipi deploy shop`. Migrations create an empty schema; the data comes next.

### 5. Copy the data {#data}

Database, from the old server:

```bash
$ ssh forge@OLD_IP
$ mysqldump --single-transaction --quick -u forge -p shop | gzip > /tmp/shop.sql.gz
$ exit
$ scp forge@OLD_IP:/tmp/shop.sql.gz . && scp shop.sql.gz cipi@NEW_IP:/tmp/
$ ssh cipi@NEW_IP "sudo cipi db restore shop /tmp/shop.sql.gz"
```

Uploaded files (skip if they're on S3):

```bash
$ rsync -az forge@OLD_IP:/home/forge/shop.example.com/storage/app/ ./shop-storage/
$ rsync -az ./shop-storage/ cipi@NEW_IP:/tmp/shop-storage/
$ ssh cipi@NEW_IP "sudo rsync -a /tmp/shop-storage/ /home/shop/shared/storage/app/ && sudo chown -R shop:shop /home/shop/shared/storage/app"
```

Cipi's restore stops at the first error and refuses empty dumps, so a broken file never wipes the database.

### 6. Workers and scheduled jobs {#workers}

For every queue Forge ran, add a worker. The Laravel scheduler is already on for every app.

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
| Server creation on cloud accounts | Create the VPS in your provider's console (two minutes), then install Cipi. |
| Forge's hosted dashboard | Use the CLI, or install Cipi's [self-hosted web panel](/web-panel). |
| Forge circles and billing | Panel users with roles; API tokens with scoped abilities. |
