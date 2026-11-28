---
title: "Cipi vs CloudPanel"
description: "Cipi vs CloudPanel: two free server panels compared, one generic and multi-stack, one built for the Laravel lifecycle, with pros, cons and a real migration path using clpctl."
lead: "Both are free and self-hosted. CloudPanel is a generic multi-stack panel; Cipi automates the Laravel lifecycle."
name: CloudPanel
site: https://www.cloudpanel.io
kind: Self-hosted control panel
family: panel
price: "Free"
updated: 2026-11-23
keywords: cloudpanel alternative laravel, cloudpanel vs cipi, migrate from cloudpanel
choose_cipi:
  - Your apps are mostly Laravel or PHP and you want deploys automated
  - You want config as code and MCP
choose_them:
  - You host Python apps alongside PHP and want a GUI-first panel
faq:
  - How do I export a database from CloudPanel? | As the site user: `clpctl db:export --databaseName=NAME --file=dump.sql.gz`, then restore with `sudo cipi db restore` on Cipi.
  - Where are CloudPanel sites stored? | In `/home/<site-user>/htdocs/<domain>`.
  - Is Cipi harder to use without a GUI? | Commands are short and documented, and an optional [web panel](/web-panel) exists.
  - Is Cipi really free? | Yes. Cipi is MIT licensed with no subscription, no per-server and no per-site fees. You pay only for the VPS, to the provider you choose.
  - What do I need to run Cipi? | A VPS (full virtual machine) with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443. 2 GB of RAM is comfortable for a few apps. See [Installation](/docs/installation).
  - Can I try Cipi without moving anything? | Yes. Install it on a new, cheap VPS, deploy a copy of one app and compare. Your current setup stays untouched until you change DNS.
  - Is there a web dashboard? | Optional and self-hosted: the [Cipi web panel](/web-panel) manages several servers, with roles and SSO. Everything also works from the CLI and the [API](/api).
  - Where do I get help? | The [docs](/docs/), the [guides](/guides/), GitHub issues, and the [Telegram channel](https://t.me/cipicloud) for releases and security notes. There's no paid support desk.
---
## In 30 seconds {#summary}

CloudPanel is a free GUI panel for PHP, Node, Python and static sites on one server, with per-site users and nightly database dumps. It leaves deployment to you. Cipi automates the Laravel lifecycle (Git releases, rollback, workers, scheduler, Horizon, Octane), adds `cipi.yml` and MCP, and is also free. Choose CloudPanel for a GUI over mixed stacks; choose Cipi when your apps are Laravel and PHP and you want deploys automated.

## At a glance {#glance}

|  | Cipi | CloudPanel |
| --- | --- | --- |
| Price | Free, MIT | Free |
| Interface | CLI first, optional panel | Web GUI |
| Git push-to-deploy, releases, rollback | Built in | Do it yourself |
| Queues and scheduler | Built in | Configure by hand |
| Stacks | Laravel, PHP, Node front ends, static | PHP, Node, Python, static, reverse proxy |
| Server settings in Git | `cipi.yml` | No |

Prices as published by CloudPanel in November 2026; check [their site](https://www.cloudpanel.io) for the current ones.

## What CloudPanel is {#what}

CloudPanel is a free control panel you install on a server. Each site gets a site user, with files in `/home/<site-user>/htdocs/<domain>`. It manages Nginx vhosts, PHP versions, databases (with nightly dumps kept 7 days), SSL and cron jobs, and has a CLI (`clpctl`).

## Pros and cons, honestly {#pros-cons}

**Where CloudPanel is strong**

| Point | What it means for you |
| --- | --- |
| Free, fast GUI | Easy for mixed sites. |
| Multi-stack | PHP, Node, Python, static. |
| Nightly database dumps | Kept for 7 days. |

**Where CloudPanel falls short**

| Point | What it means for you |
| --- | --- |
| No deployment pipeline | Git deploys, releases and rollback are up to you. |
| Laravel workers by hand | Supervisor and scheduler configuration are manual. |
| No config as code | Settings live in the GUI, not in your repository. |

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

**Deploys done for you.** Push, release, rollback, workers restarted.

**Laravel runtime wired in.** Horizon, Reverb, Octane, Meilisearch, Valkey per app.

**Same price: free.** No licence on either side, so the choice is about features.

## Where everything goes in Cipi {#map}

Every CloudPanel feature you use today, and its place in Cipi. Use it as your migration checklist.

| In CloudPanel | In Cipi | Docs |
| --- | --- | --- |
| Site | `sudo cipi app create` (Laravel) or `--custom` | [Create an app](/docs/create-app) |
| Site user | The app's Linux user | [App SSH](/docs/app-ssh) |
| Databases | `sudo cipi db` | [Databases](/docs/databases) |
| clpctl db:export / import | `sudo cipi db backup` / `sudo cipi db restore` | [Databases](/docs/databases) |
| Cron jobs | Scheduler + crontab | [Scheduler](/docs/scheduler) |
| Let's Encrypt | `sudo cipi ssl install` | [SSL](/docs/ssl) |

## Moving to Cipi, step by step {#move}

Build a Cipi server, export each site's database with `clpctl`, copy files, test, switch DNS.

**Before you start**

- SSH access as each site user (`ssh site-user@OLD_IP`).

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

Open CloudPanel's dashboard and write down, for each site you move:

| What | Where to find it in CloudPanel | You'll need it for |
| --- | --- | --- |
| Domain and aliases | Sites → the site → Domain | `sudo cipi app create --domain`, `sudo cipi alias add` |
| Repository and branch | Your own deploy process (CloudPanel has no Git pipeline) | `--repository`, `--branch` |
| PHP version | Sites → the site → Settings (PHP) | `--php` (Cipi offers 8.3–8.6) |
| Environment (`.env`) | the site's files (`.env` in `htdocs/<domain>`) | your own keys and `APP_KEY` |
| Supervisor programs | Supervisor, if you configured it by hand | `sudo cipi worker add` or Horizon |
| Cron jobs | Sites → the site → Cron Jobs | the scheduler (automatic) or `crons:` in cipi.yml |
| Deploy script | Your own scripts | Cipi's deploy options or `deploy.post` |
| Databases | Databases | `sudo cipi db restore` |

On the old server, the site's files are usually in `/home/SITE_USER/htdocs/shop.example.com`. You'll log in with `ssh SITE_USER@OLD_IP`.

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

Print the old file: `ssh SITE_USER@OLD_IP "cat /home/SITE_USER/htdocs/shop.example.com/.env"`. Copy your own keys (mail, payments, storage, APIs) into the new app with `sudo cipi app env shop` (opens an editor). **Keep Cipi's database and Redis values**: they point at the new server.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

Then deploy once: `sudo cipi deploy shop`. Migrations create an empty schema; the data comes next.

### 5. Copy the data {#data}

Database, from the old server:

```bash
$ ssh SITE_USER@OLD_IP
$ clpctl db:export --databaseName=shop --file=/tmp/shop.sql.gz
$ exit
$ scp SITE_USER@OLD_IP:/tmp/shop.sql.gz . && scp shop.sql.gz cipi@NEW_IP:/tmp/
$ ssh cipi@NEW_IP "sudo cipi db restore shop /tmp/shop.sql.gz"
```

Uploaded files (skip if they're on S3):

```bash
$ rsync -az SITE_USER@OLD_IP:/home/SITE_USER/htdocs/shop.example.com/storage/app/ ./shop-storage/
$ rsync -az ./shop-storage/ cipi@NEW_IP:/tmp/shop-storage/
$ ssh cipi@NEW_IP "sudo rsync -a /tmp/shop-storage/ /home/shop/shared/storage/app/ && sudo chown -R shop:shop /home/shop/shared/storage/app"
```

Cipi's restore stops at the first error and refuses empty dumps, so a broken file never wipes the database.

### 6. Workers and scheduled jobs {#workers}

For every queue CloudPanel ran, add a worker. The Laravel scheduler is already on for every app.

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
| Python apps and generic reverse proxies | Cipi hosts Laravel, PHP and Node front ends; keep Python apps elsewhere or proxy to them with [proxies](/docs/redirects-proxies). |
