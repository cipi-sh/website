---
title: "Cipi vs Vito Deploy"
description: "Cipi vs Vito Deploy: two free, open-source, self-hosted tools for Laravel compared by architecture, deploys, configuration as code, security, MCP and dashboards, with a migration path."
lead: "Both are free, open source and self-hosted. Vito is a dashboard you host separately; Cipi lives on each server and adds a panel only if you want one."
name: Vito Deploy
site: https://vitodeploy.com
kind: Self-hosted server panel
family: panel
price: "Free, open source"
updated: 2026-11-23
keywords: vito deploy alternative, vitodeploy vs cipi, self-hosted laravel panel
choose_cipi:
  - You want each server to run itself, with no separate dashboard server to maintain
  - You want Laravel-specific automation: Octane, Horizon, Reverb, Meilisearch, `cipi.yml`
  - You want patching, backups and alerts done by the server itself
choose_them:
  - You want a dashboard-first tool with plugins and visual workflows
  - You want server creation on providers from the dashboard
faq:
  - Both are free. Why switch? | Less to host (no dashboard server), more production features: health-checked rollback, config as code, MCP, nightly patching.
  - Can I keep a dashboard? | Yes: Cipi's [web panel](/web-panel) is optional and manages many servers.
  - Where are my files on a Vito server? | Under the site user's home, e.g. `/home/<user>/<domain>`, with `current/` when modern deployment is on.
  - What do I need to run Cipi? | A VPS (full virtual machine) with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443. 2 GB of RAM is comfortable for a few apps. See [Installation](/docs/installation).
  - Can I try Cipi without moving anything? | Yes. Install it on a new, cheap VPS, deploy a copy of one app and compare. Your current setup stays untouched until you change DNS.
  - Where do I get help? | The [docs](/docs/), the [guides](/guides/), GitHub issues, and the [Telegram channel](https://t.me/cipicloud) for releases and security notes. There's no paid support desk.
  - Can Cipi host WordPress or non-Laravel PHP? | Yes, as [custom apps](/docs/custom-apps), each isolated with its own user, PHP pool and database. [WordPress guide](/guides/deploy-wordpress-custom-app).
  - What if I stop using Cipi later? | Your apps are standard Laravel on a standard Ubuntu stack (Nginx, PHP-FPM, MariaDB or PostgreSQL). Move them with a database dump and a Git checkout to any host; nothing is proprietary.
---
## In 30 seconds {#summary}

Vito and Cipi share the same values: free, open source, no SaaS. Vito is a central dashboard (a Laravel app you host) that provisions and manages servers over SSH, with plugins. Cipi is installed on every server and runs it by itself; its optional panel talks to each server's API. Cipi goes deeper on running Laravel in production (health-checked rollback, `cipi.yml`, MCP, nightly patching); Vito shines as a visual, extensible dashboard.

## At a glance {#glance}

|  | Cipi | Vito Deploy |
| --- | --- | --- |
| Price | Free, MIT | Free, open source (AGPL) |
| Architecture | Each server manages itself; optional panel | Central dashboard managing servers over SSH |
| Dashboard needed | No | Yes (you host it) |
| Zero-downtime deploys | Always | "Modern deployment" option |
| Per-site isolation | Always | Per-site system user |
| Server settings in Git | `cipi.yml` | Dashboard |
| AI assistants (MCP) | Built in | Not advertised |
| Plugins | No plugin system | Yes |

Prices as published by Vito Deploy in November 2026; check [their site](https://vitodeploy.com) for the current ones.

## What Vito Deploy is {#what}

Vito Deploy is a free, open-source, self-hosted server-management panel built with Laravel. You install it on its own server (or Docker), connect your servers, and from its dashboard you create sites, run deployments, manage databases, workers, cron jobs, firewall and SSL. Sites live under the site user's home, e.g. `/home/<user>/<domain>`.

## Pros and cons, honestly {#pros-cons}

**Where Vito Deploy is strong**

| Point | What it means for you |
| --- | --- |
| Free and open source | Like Cipi. |
| Visual dashboard | Everything in one place. |
| Plugins | Extend site types and features. |

**Where Vito Deploy falls short**

| Point | What it means for you |
| --- | --- |
| A dashboard server to run | One more Laravel app to host, back up and patch. |
| Zero downtime is opt-in | "Modern deployment" must be enabled per site. |
| Fewer production guardrails | No health-check rollback, anonymizer or MCP built in. |

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

**Nothing extra to host.** Each server is self-sufficient; the panel is optional.

**Production depth.** Health-checked rollback, deploy audit ledger, malware integrity scans, nightly PHP patching.

**Config as code and AI.** `cipi.yml` and MCP out of the box.

## Where everything goes in Cipi {#map}

Every Vito Deploy feature you use today, and its place in Cipi. Use it as your migration checklist.

| In Vito Deploy | In Cipi | Docs |
| --- | --- | --- |
| Server | VPS + Cipi installer | [Installation](/docs/installation) |
| Site | `sudo cipi app create` | [Create an app](/docs/create-app) |
| Modern deployment | Always on | [How deploys work](/docs/how-deploys-work) |
| Deployment script | Deploy options, `deploy.post` | [Deploy options](/docs/deploy-script) |
| Workers | `sudo cipi worker add`, Horizon | [Workers](/docs/workers) |
| Cronjobs | Scheduler, crontab | [Scheduler](/docs/scheduler) |
| Databases | `sudo cipi db` | [Databases](/docs/databases) |
| SSL | `sudo cipi ssl install` | [SSL](/docs/ssl) |
| Firewall | `sudo cipi firewall` | [Firewall](/docs/firewall) |

## Moving to Cipi, step by step {#move}

Build a Cipi server, recreate each site, copy env and data, test, switch DNS.

**Before you start**

- SSH access to the server Vito manages, as the site user.

Click a step to jump to it; the map follows you down the page.

```flow
Take inventory | what the app uses | #inventory
Install Cipi | on a new server | #install
Create the app | same repo, same domain | #create
Copy the .env | your keys, the old APP_KEY | #env
Copy the data | database and uploads | #data
Workers and scheduled jobs | workers, cronjobs | #workers
Cut-over day | DNS, HTTPS, done | #cutover
```

### 1. Take inventory {#inventory}

Open Vito's dashboard and write down, for each site you move:

| What | Where to find it in Vito | You'll need it for |
| --- | --- | --- |
| Domain and aliases | Site → Settings / Aliases | `sudo cipi app create --domain`, `sudo cipi alias add` |
| Repository and branch | Site → Application (repository, branch) | `--repository`, `--branch` |
| PHP version | Site → Settings (PHP version) | `--php` (Cipi offers 8.3–8.6) |
| Environment (`.env`) | Site → Application → Update .env | your own keys and `APP_KEY` |
| Workers | Server → Workers | `sudo cipi worker add` or Horizon |
| Cronjobs | Server → Cronjobs | the scheduler (automatic) or `crons:` in cipi.yml |
| Deploy script | Site → Application → Deployment script | Cipi's deploy options or `deploy.post` |
| Databases | Server → Databases | `sudo cipi db restore` |

With modern deployment on, `.env` and `storage` are in the site folder's shared area and the code in `current/`.

On the old server, the site's files are usually in `/home/SITE_USER/shop.example.com`. You'll log in with `ssh SITE_USER@OLD_IP`.

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

Print the old file: `ssh SITE_USER@OLD_IP "cat /home/SITE_USER/shop.example.com/.env"`. Copy your own keys (mail, payments, storage, APIs) into the new app with `sudo cipi app env shop` (opens an editor). **Keep Cipi's database and Redis values**: they point at the new server.

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
$ rsync -az SITE_USER@OLD_IP:/home/SITE_USER/shop.example.com/storage/app/ ./shop-storage/
$ rsync -az ./shop-storage/ cipi@NEW_IP:/tmp/shop-storage/
$ ssh cipi@NEW_IP "sudo rsync -a /tmp/shop-storage/ /home/shop/shared/storage/app/ && sudo chown -R shop:shop /home/shop/shared/storage/app"
```

Cipi's restore stops at the first error and refuses empty dumps, so a broken file never wipes the database.

### 6. Workers and scheduled jobs {#workers}

For every queue Vito ran, add a worker. The Laravel scheduler is already on for every app.

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

Also stop the old server's workers and cronjobs, so jobs don't run twice against the old database.

### What doesn't move to Cipi {#not-moving}

| Thing | What to do instead |
| --- | --- |
| Vito plugins | No plugin system in Cipi; most needs are covered by `deploy.post`, packages and the API. |
