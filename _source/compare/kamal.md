---
title: "Cipi vs Kamal"
description: "Cipi vs Kamal: a container deploy tool compared with a full Laravel server platform, with the responsibilities each one leaves to you, and how to move a Kamal-deployed Laravel app to Cipi."
lead: "Kamal is a deploy tool. Cipi is a server platform that also deploys."
name: Kamal
site: https://kamal-deploy.org
kind: Deploy tool
family: deploy
price: "Free"
updated: 2026-11-23
keywords: kamal laravel, kamal vs cipi, kamal alternative php
choose_cipi:
  - You want the server provisioned, patched and backed up, not only deploys
choose_them:
  - Your team deploys Docker images across many hosts
faq:
  - Can Cipi deploy to several servers at once? | Each server manages its own apps; deploy each with CI or the API.
  - Do I need a registry? | No. Cipi builds from Git on the server.
---
## In 30 seconds {#summary}

Kamal (from 37signals) deploys Docker images to servers you prepare, with zero-downtime switches through its proxy. Everything else (images, databases, backups, patching, monitoring) is yours to build. Cipi provisions and runs the whole Laravel stack natively, then deploys it. Choose Kamal if your team lives in Docker images; choose Cipi if you want the server taken care of too.

## At a glance {#glance}

|  | Cipi | Kamal |
| --- | --- | --- |
| Price | Free (MIT) | Free (MIT) |
| Provisioning | Full stack: web server, PHP, databases, firewall, SSL | Docker on your hosts; the rest is yours |
| Model | Native | Docker containers |
| Backups, monitoring, patching | Built in | Not included |
| Laravel lifecycle | Built in | Through your image and config |

Prices as published by Kamal in November 2026; check [their site](https://kamal-deploy.org) for the current ones.

## What Kamal is {#what}

Kamal is an open-source deploy tool: from `config/deploy.yml` it builds or pulls an image, pushes it to a registry, and starts it on your hosts behind kamal-proxy, with accessories (databases, Redis) as extra containers.

## Pros and cons, honestly {#pros-cons}

**Where Kamal is strong**

| Point | What it means for you |
| --- | --- |
| Simple, image-based deploys | One config file, one command. |
| Multi-host | Same image on several servers. |
| Language-agnostic | Anything that runs in a container. |

**Where Kamal falls short**

| Point | What it means for you |
| --- | --- |
| You build the platform | Dockerfile, registry, accessories, backups, patching. |
| Laravel by hand | Workers and scheduler as extra roles. |

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
| Not for every stack | Cipi runs Laravel, PHP and Node front ends natively. Go, Python, Rails or arbitrary Docker images aren't its job. |
| You create the server yourself | Cipi installs on a VPS you rent (Hetzner, DigitalOcean, AWS…). It doesn't create servers on cloud accounts for you. |
| Ubuntu LTS only | Ubuntu 24.04 or 26.04, on a full virtual machine. No other distributions, no containers. |
| Focused on apps | Laravel, PHP, Node front ends and static sites. No e-mail hosting, DNS server or reseller accounts. |
| No paid support desk | Help comes from the docs, GitHub and the Telegram channel. You (or your team) own the server. |

## Why teams choose Cipi instead {#why-cipi}

**No container layer for PHP.** Nginx and PHP-FPM (or Octane) run directly on the server: less memory, simpler debugging, logs where you expect them.

**Laravel's lifecycle built in.** Releases with rollback, workers, scheduler, Horizon, Reverb, Octane and health checks without writing Dockerfiles or compose files.

**Server care included.** Firewall, Fail2ban, nightly PHP patches, encrypted backups to S3 and monitoring.

## Where everything goes in Cipi {#map}

Every Kamal feature you use today, and its place in Cipi. Use it as your migration checklist.

| In Kamal | In Cipi | Docs |
| --- | --- | --- |
| `deploy.yml` service | `cipi app create` + [cipi.yml](/cipi-yml) | [Create an app](/docs/create-app) |
| `env` / secrets | `cipi app env` | [Environment](/docs/environment) |
| Accessories (db, redis) | `cipi db`, Valkey per app | [Databases](/docs/databases) |
| Roles (job workers) | `cipi worker add`, Horizon | [Workers](/docs/workers) |
| kamal-proxy | Nginx + releases | [How deploys work](/docs/how-deploys-work) |

## Moving to Cipi, step by step {#move}

Rebuild the app natively on Cipi, dump the accessory database, switch DNS.

**Before you start**

- SSH access to the Kamal hosts and your `config/deploy.yml`.

Click a step to jump to it; the map follows you down the page.

```flow
Take inventory | apps, env, volumes | #inventory
Install Cipi | on a new server | #install
Create the app | natively, not in a container | #create
Copy the environment | variables → .env | #env
Copy the data | dump and volumes | #data
Workers and schedules | Supervisor, cron | #workers
Cut-over day | DNS, HTTPS, done | #cutover
```

### 1. Take inventory {#inventory}

For each app on Kamal, note: the Git repository and branch, the build or Dockerfile, environment variables (`config/deploy.yml` and `.kamal/secrets`), attached databases, persistent volumes (uploads), workers and scheduled commands, domains. 

### 2. Install Cipi {#install}

Create a new VPS with Ubuntu 24.04 or 26.04 and run `wget -O - https://cipi.sh/setup.sh | bash`. Cipi runs PHP, Nginx and databases natively: no Docker needed. For PostgreSQL apps add `sudo cipi db install pgsql`.

### 3. Create the app {#create}

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --branch=main --php=8.5
```

What the Dockerfile did, Cipi already does: PHP extensions, Composer, `npm run build` (`--node-build`), migrations. Commands specific to your image go in `deploy.post` of [cipi.yml](/cipi-yml). Node front ends become [Node apps](/docs/node-apps).

### 4. Copy the environment {#env}

Copy your variables from `config/deploy.yml` and `.kamal/secrets` into the app's `.env` with `sudo cipi app env shop`. Keep Cipi's `DB_*` and `REDIS_*` values: the database is now local.

> [!warning] Copy the **old `APP_KEY`** into the new app (`sudo cipi app env <app> --set=APP_KEY=base64:…`). With a different key, everyone is logged out and anything encrypted with `Crypt` (tokens, settings) can't be read any more.

### 5. Copy the data {#data}

Database:

```bash
# on the host running the database accessory
$ docker ps --format '{{.Names}}' | grep -i db
$ docker exec CONTAINER pg_dump -U USER --no-owner --no-acl DBNAME > shop.sql
$ scp shop.sql cipi@NEW_IP:/tmp/ && ssh cipi@NEW_IP "sudo cipi db restore shop /tmp/shop.sql"
```

Files: copy files from the volume or directory mounted into your app container (see `volumes:` in `deploy.yml`).

### Test before anyone sees it {#test}

You can open the new copy with your real domain **only on your computer**, before changing DNS. Add one line to your hosts file (`/etc/hosts` on macOS and Linux, `C:\Windows\System32\drivers\etc\hosts` on Windows):

```text
203.0.113.20   shop.example.com
```

Browse the site, log in, place a test order, check e-mails and queued jobs. Remove the line when you're done. (HTTPS will warn until the certificate is issued after the DNS switch; that's expected.)

### 6. Workers and schedules {#workers}

Worker containers become Supervisor workers (`sudo cipi worker add shop --queue=…`), a Horizon container becomes `sudo cipi worker horizon enable shop`, and the scheduler container isn't needed: Cipi runs `schedule:run` every minute for every Laravel app.

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

### What doesn't move to Cipi {#not-moving}

| Thing | What to do instead |
| --- | --- |
| Multi-host image deploys | Each Cipi server runs its own apps; use several servers behind a load balancer if needed. |
