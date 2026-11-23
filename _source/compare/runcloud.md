---
title: "Cipi vs RunCloud"
description: "Cipi vs RunCloud: strengths and limits of each, who should pick which, and a step-by-step migration from RunCloud to a free, self-hosted Cipi server."
lead: "RunCloud is a hosted panel loved by WordPress and PHP users. Cipi is a free, Laravel-first platform that runs on the server itself."
name: RunCloud
site: https://runcloud.io
kind: SaaS server panel
family: panel
price: "paid plans, from under $10/mo"
updated: 2026-11-23
keywords: runcloud alternative, free runcloud alternative, migrate from runcloud
choose_cipi:
  - Your apps are Laravel and you want queues, Horizon and Octane built in
  - You want no subscription
  - You want config as code and MCP
choose_them:
  - Most of your sites are WordPress and you want its GUI tools
  - You rely on Apache `.htaccess` rules
faq:
  - Can Cipi host WordPress? | Yes, as a custom app with its own user, PHP pool and database. [Guide](/guides/deploy-wordpress-custom-app).
  - What about `.htaccess`? | Cipi uses Nginx only. WordPress works as is; custom rewrite rules must be translated to Nginx or [redirects](/docs/redirects-proxies).
  - Where are my files on RunCloud? | Under `/home/<system-user>/webapps/<app-name>`, shown in the web app's settings.
  - Do I need to change my Laravel code? | No. Only paths and server-side settings change.
  - Is Cipi really free? | Yes. Cipi is MIT licensed with no subscription, no per-server and no per-site fees. You pay only for the VPS, to the provider you choose.
  - What do I need to run Cipi? | A VPS (full virtual machine) with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443. 2 GB of RAM is comfortable for a few apps. See [Installation](/docs/installation).
  - Can I try Cipi without moving anything? | Yes. Install it on a new, cheap VPS, deploy a copy of one app and compare. Your current setup stays untouched until you change DNS.
  - Is there a web dashboard? | Optional and self-hosted: the [Cipi web panel](/web-panel) manages several servers, with roles and SSO. Everything also works from the CLI and the [API](/api).
---
## In 30 seconds {#summary}

RunCloud is a hosted panel strong on WordPress, with its own Nginx/Apache hybrid stack and plans per server count. Cipi focuses on Laravel and PHP apps with zero-downtime releases, queues, scheduler and Octane built in, at no cost. Choose RunCloud if most of your sites are WordPress and you want a GUI-first hosted tool; choose Cipi for Laravel apps and to stop paying for the panel.

## At a glance {#glance}

|  | Cipi | RunCloud |
| --- | --- | --- |
| Price | Free, MIT | Paid plans from under $10/month, by server count |
| Focus | Laravel and PHP apps | WordPress and PHP |
| Control plane | On your server | SaaS |
| Atomic deploys | Always | Higher plans |
| Laravel queues, Horizon, Reverb, Octane | Built in | Via Supervisor settings |
| Server settings in Git | `cipi.yml` | Dashboard |
| AI assistants (MCP) | Built in | Not advertised |

Prices as published by RunCloud in November 2026; check [their site](https://runcloud.io) for the current ones.

## What RunCloud is {#what}

RunCloud is a SaaS panel that connects to your VPS and installs its own stack (Nginx, optionally with Apache, PHP, MariaDB). It's popular for WordPress, with staging, cloning and caching tools, and supports Git deployment for PHP apps.

## Pros and cons, honestly {#pros-cons}

**Where RunCloud is strong**

| Point | What it means for you |
| --- | --- |
| Great for WordPress | Staging, cloning, caching and one-click installs. |
| Friendly GUI | Little Linux knowledge needed. |
| Hybrid Nginx + Apache | `.htaccess` support for legacy apps. |

**Where RunCloud falls short**

| Point | What it means for you |
| --- | --- |
| Subscription per server count | Costs grow with your fleet. |
| Laravel is not the focus | Queues, Horizon or Octane are set up by hand. |
| Configuration in a dashboard | No config-as-code. |

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

**Laravel first.** Releases, rollback, workers, Horizon, Reverb, Octane and health checks without manual Supervisor files.

**No subscription.** Free on every server.

**Also hosts WordPress.** As a [custom app](/guides/deploy-wordpress-custom-app), isolated per site.

## Where everything goes in Cipi {#map}

Every RunCloud feature you use today, and its place in Cipi. Use it as your migration checklist.

| In RunCloud | In Cipi | Docs |
| --- | --- | --- |
| Web application | `cipi app create` (Laravel) or `--custom` (WordPress, PHP) | [Create an app](/docs/create-app) |
| Git deployment | Webhook + releases | [How deploys work](/docs/how-deploys-work) |
| Supervisor | `cipi worker add` | [Workers](/docs/workers) |
| Cron jobs | Scheduler, crontab, `crons:` | [Scheduler](/docs/scheduler) |
| Databases | `cipi db` | [Databases](/docs/databases) |
| SSL | `cipi ssl install` | [SSL](/docs/ssl) |
| Backups | `cipi backup` | [Backups](/docs/backups) |
| WordPress staging/cloning | A second custom app + restored dump | No one-click WordPress tools |

## Moving to Cipi, step by step {#move}

Build a Cipi server, recreate each web application, copy files and databases, then switch DNS.

**Before you start**

- SSH access to the RunCloud server as the web app's system user (by default `runcloud`).
- For WordPress sites, read the [WordPress guide](/guides/deploy-wordpress-custom-app) first.

Click a step to jump to it; the map follows you down the page.

```flow
Take inventory | what the app uses | #inventory
Install Cipi | on a new server | #install
Create the app | same repo, same domain | #create
Copy the .env | your keys, the old APP_KEY | #env
Copy the data | database and uploads | #data
Workers and scheduled jobs | supervisor programs, cron jobs | #workers
Cut-over day | DNS, HTTPS, done | #cutover
```

### 1. Take inventory {#inventory}

Open RunCloud's dashboard and write down, for each site you move:

| What | Where to find it in RunCloud | You'll need it for |
| --- | --- | --- |
| Domain and aliases | Web Application → Domain Name | `cipi app create --domain`, `cipi alias add` |
| Repository and branch | Web Application → Git | `--repository`, `--branch` |
| PHP version | Web Application → Settings (PHP version) | `--php` (Cipi offers 8.3–8.6) |
| Environment (`.env`) | Web Application → File Manager (`.env`) | your own keys and `APP_KEY` |
| Supervisor programs | Server → Supervisor | `cipi worker add` or Horizon |
| Cron jobs | Server → Cron Jobs | the scheduler (automatic) or `crons:` in cipi.yml |
| Deploy script | Web Application → Git → Deployment script | Cipi's deploy options or `deploy.post` |
| Databases | Server → Databases | `cipi db restore` |

RunCloud shows each web app's root path in its settings; it's under `/home/<system-user>/webapps/<app-name>`. WordPress and plain PHP sites become Cipi **custom apps**.

On the old server, the site's files are usually in `/home/runcloud/webapps/shop`. You'll log in with `ssh runcloud@OLD_IP`.

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

Print the old file: `ssh runcloud@OLD_IP "cat /home/runcloud/webapps/shop/.env"`. Copy your own keys (mail, payments, storage, APIs) into the new app with `sudo cipi app env shop` (opens an editor). **Keep Cipi's database and Redis values**: they point at the new server.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

Then deploy once: `sudo cipi deploy shop`. Migrations create an empty schema; the data comes next.

### 5. Copy the data {#data}

Database, from the old server:

```bash
$ ssh runcloud@OLD_IP
$ mysqldump --single-transaction --quick -u DB_USER -p shop | gzip > /tmp/shop.sql.gz
$ exit
$ scp runcloud@OLD_IP:/tmp/shop.sql.gz . && scp shop.sql.gz cipi@NEW_IP:/tmp/
$ ssh cipi@NEW_IP "sudo cipi db restore shop /tmp/shop.sql.gz"
```

Uploaded files (skip if they're on S3):

```bash
$ rsync -az runcloud@OLD_IP:/home/runcloud/webapps/shop/storage/app/ ./shop-storage/
$ rsync -az ./shop-storage/ cipi@NEW_IP:/tmp/shop-storage/
$ ssh cipi@NEW_IP "sudo rsync -a /tmp/shop-storage/ /home/shop/shared/storage/app/ && sudo chown -R shop:shop /home/shop/shared/storage/app"
```

Cipi's restore stops at the first error and refuses empty dumps, so a broken file never wipes the database.

### 6. Workers and scheduled jobs {#workers}

For every queue RunCloud ran, add a worker. The Laravel scheduler is already on for every app.

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

Also stop the old server's supervisor programs and cron jobs, so jobs don't run twice against the old database.

### What doesn't move to Cipi {#not-moving}

| Thing | What to do instead |
| --- | --- |
| WordPress staging and cloning tools | Create a second custom app and restore a dump into it. |
| Apache `.htaccess` rules | Rewrite them as Nginx rules or [redirects](/docs/redirects-proxies). |
