---
title: "Cipi vs ServerPilot"
description: "Cipi vs ServerPilot: what each is built for, strengths and limits, and a step-by-step move from ServerPilot to a free, self-hosted Cipi server with Laravel-native deploys."
lead: "ServerPilot automates PHP and WordPress hosting from a SaaS. Cipi automates Laravel and PHP from the server itself, for free."
name: ServerPilot
site: https://serverpilot.io
kind: SaaS server panel
family: panel
price: "paid plans per server"
updated: 2026-11-23
keywords: serverpilot alternative, free serverpilot alternative, laravel serverpilot
choose_cipi:
  - You deploy Laravel and want releases, workers and rollback
  - You want no subscription
choose_them:
  - You only host WordPress or simple PHP sites and want a hosted panel
faq:
  - Do I have to use Git with Cipi? | For Laravel apps, yes. Custom apps (WordPress, plain PHP) can be uploaded over SFTP.
  - Where are my ServerPilot files? | In `/srv/users/<user>/apps/<app>/public`, owned by the app's system user.
  - Can I keep a WordPress site and a Laravel app on the same Cipi server? | Yes, each isolated with its own user, PHP pool and database.
  - Is Cipi really free? | Yes. Cipi is MIT licensed with no subscription, no per-server and no per-site fees. You pay only for the VPS, to the provider you choose.
  - What do I need to run Cipi? | A VPS (full virtual machine) with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443. 2 GB of RAM is comfortable for a few apps. See [Installation](/docs/installation).
  - Can I try Cipi without moving anything? | Yes. Install it on a new, cheap VPS, deploy a copy of one app and compare. Your current setup stays untouched until you change DNS.
  - Is there a web dashboard? | Optional and self-hosted: the [Cipi web panel](/web-panel) manages several servers, with roles and SSO. Everything also works from the CLI and the [API](/api).
  - Where do I get help? | The [docs](/docs/), the [guides](/guides/), GitHub issues, and the [Telegram channel](https://t.me/cipicloud) for releases and security notes. There's no paid support desk.
---
## In 30 seconds {#summary}

ServerPilot sets up Nginx, PHP and MySQL on your server and manages PHP apps and WordPress from a hosted dashboard; files usually arrive by SFTP. Cipi adds what Laravel needs (Git releases, rollback, workers, scheduler, Horizon, Octane) and costs nothing. Choose ServerPilot for simple hosted management of WordPress and PHP sites; choose Cipi for Laravel and Git-based deploys.

## At a glance {#glance}

|  | Cipi | ServerPilot |
| --- | --- | --- |
| Price | Free, MIT | Paid plans per server |
| Focus | Laravel and PHP apps | PHP and WordPress |
| Git releases with rollback | Yes | Not built in |
| Queue workers, scheduler | Built in | Set up yourself |
| PHP patching | Nightly, with alerts | Managed by ServerPilot |
| Server settings in Git | `cipi.yml` | Dashboard |

Prices as published by ServerPilot in November 2026; check [their site](https://serverpilot.io) for the current ones.

## What ServerPilot is {#what}

ServerPilot is a hosted panel that connects to your Ubuntu server and manages a PHP stack (Nginx, PHP-FPM, MySQL) for you. Each app runs as a system user, with its files under `/srv/users/<user>/apps/<app>/public`. It's aimed at WordPress and PHP sites updated over SFTP.

## Pros and cons, honestly {#pros-cons}

**Where ServerPilot is strong**

| Point | What it means for you |
| --- | --- |
| Simple | Few settings, good defaults for PHP sites. |
| Hands-off PHP updates | PHP versions maintained by the service. |
| App isolation by system user | Apps can run as separate users. |

**Where ServerPilot falls short**

| Point | What it means for you |
| --- | --- |
| No Laravel lifecycle | No releases, rollback, queues or scheduler management. |
| Subscription per server | Costs scale with servers. |
| Deploys over SFTP | No Git push-to-deploy pipeline out of the box. |

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

**Git deploys with rollback.** Push and the new release goes live atomically; one command goes back.

**Queues and scheduler included.** Every Laravel app gets a worker and the scheduler.

**Still hosts WordPress.** As isolated [custom apps](/docs/custom-apps).

**No subscription.** Free, open source.

## Where everything goes in Cipi {#map}

Every ServerPilot feature you use today, and its place in Cipi. Use it as your migration checklist.

| In ServerPilot | In Cipi | Docs |
| --- | --- | --- |
| App | `sudo cipi app create` (Laravel) or `--custom` | [Create an app](/docs/create-app) |
| SFTP uploads | SFTP as the app user into `~/htdocs` (custom apps) | [Custom apps](/docs/custom-apps) |
| PHP version | `--php`, `sudo cipi app edit --php` | [PHP](/docs/php) |
| SSL | `sudo cipi ssl install` | [SSL](/docs/ssl) |
| Databases | `sudo cipi db` | [Databases](/docs/databases) |

## Moving to Cipi, step by step {#move}

Build a Cipi server, recreate each app, copy files and databases, test privately, switch DNS.

**Before you start**

- SSH or SFTP access to the ServerPilot server as each app's system user.
- For WordPress sites, the [WordPress guide](/guides/deploy-wordpress-custom-app).

Click a step to jump to it; the map follows you down the page.

```flow
Take inventory | what the app uses | #inventory
Install Cipi | on a new server | #install
Create the app | same repo, same domain | #create
Copy the .env | your keys, the old APP_KEY | #env
Copy the data | database and uploads | #data
Workers and scheduled jobs | background processes, cron jobs | #workers
Cut-over day | DNS, HTTPS, done | #cutover
```

### 1. Take inventory {#inventory}

Open ServerPilot's dashboard and write down, for each site you move:

| What | Where to find it in ServerPilot | You'll need it for |
| --- | --- | --- |
| Domain and aliases | the site's domain settings | `sudo cipi app create --domain`, `sudo cipi alias add` |
| Repository and branch | the site's Git / deployment settings | `--repository`, `--branch` |
| PHP version | the site's PHP settings | `--php` (Cipi offers 8.3–8.6) |
| Environment (`.env`) | the site's environment or `.env` file | your own keys and `APP_KEY` |
| Background processes | the server's daemons / Supervisor section | `sudo cipi worker add` or Horizon |
| Cron jobs | the server's cron section | the scheduler (automatic) or `crons:` in cipi.yml |
| Deploy script | the site's deploy script or hooks | Cipi's deploy options or `deploy.post` |
| Databases | the server's databases section | `sudo cipi db restore` |

On ServerPilot, an app's public files are in `/srv/users/<user>/apps/<app>/public`. Laravel apps in Git become Cipi Laravel apps; WordPress and other PHP sites become **custom apps** (upload the files to `~/htdocs`).

On the old server, the site's files are usually in `/srv/users/APP_USER/apps/shop`. You'll log in with `ssh APP_USER@OLD_IP`.

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

Print the old file: `ssh APP_USER@OLD_IP "cat /srv/users/APP_USER/apps/shop/.env"`. Copy your own keys (mail, payments, storage, APIs) into the new app with `sudo cipi app env shop` (opens an editor). **Keep Cipi's database and Redis values**: they point at the new server.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

Then deploy once: `sudo cipi deploy shop`. Migrations create an empty schema; the data comes next.

### 5. Copy the data {#data}

Database, from the old server:

```bash
$ ssh APP_USER@OLD_IP
$ mysqldump --single-transaction --quick -u DB_USER -p shop | gzip > /tmp/shop.sql.gz
$ exit
$ scp APP_USER@OLD_IP:/tmp/shop.sql.gz . && scp shop.sql.gz cipi@NEW_IP:/tmp/
$ ssh cipi@NEW_IP "sudo cipi db restore shop /tmp/shop.sql.gz"
```

Uploaded files (skip if they're on S3):

```bash
$ rsync -az APP_USER@OLD_IP:/srv/users/APP_USER/apps/shop/storage/app/ ./shop-storage/
$ rsync -az ./shop-storage/ cipi@NEW_IP:/tmp/shop-storage/
$ ssh cipi@NEW_IP "sudo rsync -a /tmp/shop-storage/ /home/shop/shared/storage/app/ && sudo chown -R shop:shop /home/shop/shared/storage/app"
```

Cipi's restore stops at the first error and refuses empty dumps, so a broken file never wipes the database.

### 6. Workers and scheduled jobs {#workers}

For every queue ServerPilot ran, add a worker. The Laravel scheduler is already on for every app.

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

Also stop the old server's background processes and cron jobs, so jobs don't run twice against the old database.

### What doesn't move to Cipi {#not-moving}

| Thing | What to do instead |
| --- | --- |
| ServerPilot's hosted dashboard | Cipi's CLI or its self-hosted [web panel](/web-panel). |
