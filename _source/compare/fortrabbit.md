---
title: "Cipi vs fortrabbit"
description: "Cipi vs fortrabbit: a managed PHP platform compared with a free platform on your own VPS, with pros, cons and how to move a PHP app."
lead: "fortrabbit hosts PHP apps for you. Cipi turns your own VPS into the same kind of platform."
name: fortrabbit
site: https://www.fortrabbit.com
kind: Managed PHP PaaS
family: paas
price: "from about €4.50/mo"
updated: 2026-11-23
keywords: fortrabbit alternative, fortrabbit vs vps
choose_cipi:
  - You want root and the full Laravel toolset
choose_them:
  - You want a hands-off managed PHP host
faq:
  - Can I stay in Europe? | Yes, rent a VPS from any EU provider.
  - Is Cipi really free? | Yes. Cipi is MIT licensed with no subscription, no per-server and no per-site fees. You pay only for the VPS, to the provider you choose.
  - What do I need to run Cipi? | A VPS (full virtual machine) with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443. 2 GB of RAM is comfortable for a few apps. See [Installation](/docs/installation).
  - Can I try Cipi without moving anything? | Yes. Install it on a new, cheap VPS, deploy a copy of one app and compare. Your current setup stays untouched until you change DNS.
  - Is there a web dashboard? | Optional and self-hosted: the [Cipi web panel](/web-panel) manages several servers, with roles and SSO. Everything also works from the CLI and the [API](/api).
  - Where do I get help? | The [docs](/docs/), the [guides](/guides/), GitHub issues, and the [Telegram channel](https://t.me/cipicloud) for releases and security notes. There's no paid support desk.
  - Can Cipi host WordPress or non-Laravel PHP? | Yes, as [custom apps](/docs/custom-apps), each isolated with its own user, PHP pool and database. [WordPress guide](/guides/deploy-wordpress-custom-app).
  - What if I stop using Cipi later? | Your apps are standard Laravel on a standard Ubuntu stack (Nginx, PHP-FPM, MariaDB or PostgreSQL). Move them with a database dump and a Git checkout to any host; nothing is proprietary.
---
## In 30 seconds {#summary}

fortrabbit is a European managed hosting platform for PHP apps (Laravel, Craft and others), with Git deploys and managed MySQL. Cipi gives you the same workflow on your own VPS with full root, Octane, Horizon and Reverb. Choose fortrabbit to stay hands-off on a PHP-specialist host; choose Cipi for root, full Laravel features and any provider.

## At a glance {#glance}

|  | Cipi | fortrabbit |
| --- | --- | --- |
| Pricing | Free tool; fixed VPS price | Plans from a few euros plus resources |
| Servers | Your VPS, full root | Managed, SSH/SFTP to the app |
| Octane, Horizon, Reverb | Yes | Not Octane-first |
| MCP | Built in | Offered |

Prices as published by fortrabbit in November 2026; check [their site](https://www.fortrabbit.com) for the current ones.

## What fortrabbit is {#what}

fortrabbit is a managed PHP hosting platform in Europe: you deploy with Git, it runs your PHP app with managed MySQL, and you access it over SSH/SFTP.

## Pros and cons, honestly {#pros-cons}

**Where fortrabbit is strong**

| Point | What it means for you |
| --- | --- |
| PHP specialists | Support that knows PHP apps. |
| Managed | No servers to patch. |
| EU hosting | Data stays in Europe. |

**Where fortrabbit falls short**

| Point | What it means for you |
| --- | --- |
| Platform limits | Long-running processes and custom services are limited. |
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

**No lock-in.** A standard Ubuntu stack on any provider; move with `cipi sync`.

## Where everything goes in Cipi {#map}

Every fortrabbit feature you use today, and its place in Cipi. Use it as your migration checklist.

| In fortrabbit | In Cipi | Docs |
| --- | --- | --- |
| App | `cipi app create` | [Create an app](/docs/create-app) |
| Git deploy | Webhook + releases | [How deploys work](/docs/how-deploys-work) |
| ENV vars | `cipi app env` | [Environment](/docs/environment) |
| MySQL | `cipi db` (MariaDB) | [Databases](/docs/databases) |
| Workers | `cipi worker add` | [Workers](/docs/workers) |

## Moving to Cipi, step by step {#move}

Create the app on Cipi, copy variables, dump MySQL, copy files, switch DNS.

**Before you start**

- fortrabbit's database access details (via SSH tunnel) and SSH/SFTP access.

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

In fortrabbit's dashboard, note for each app: the repository and branch, build and start commands, environment variables (the app's ENV vars settings), the database and its engine/version, file storage (local disk or a bucket), workers, scheduled jobs and domains. 

### 2. Install Cipi {#install}

Rent a VPS (2–4 GB RAM is plenty for most apps that ran on a PaaS) with Ubuntu 24.04 or 26.04 and run `wget -O - https://cipi.sh/setup.sh | bash`. For PostgreSQL apps: `sudo cipi db install pgsql`. Guide: [VPS, SSH and DNS basics](/guides/vps-ssh-dns-basics).

### 3. Create the app {#create}

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --branch=main --engine=pgsql
```

Use `--engine=pgsql` if the app used PostgreSQL, `--octane` if it ran on Octane, `--node-build='npm ci && npm run build'` for assets. Add the deploy key to the repository.

### 4. Copy the environment {#env}

Export or copy the variables from the app's ENV vars settings into `sudo cipi app env shop`. Keep Cipi's `DB_*`/`REDIS_*` values.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

### 5. Copy the data {#data}

Dump MySQL with the access details fortrabbit gives you (usually through an SSH tunnel) using `mysqldump`, then `sudo cipi db restore shop /tmp/shop.sql` on Cipi.

Files: copy uploaded files over SFTP, or keep your object storage bucket.

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
