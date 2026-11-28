---
title: "Cipi vs DirectAdmin"
description: "Cipi vs DirectAdmin: a lightweight hosting panel compared with a free platform for deploying your own apps, with licence costs, pros and cons, and a step-by-step migration from a DirectAdmin backup."
lead: "DirectAdmin is a lighter, cheaper cPanel-style hosting panel. Cipi is a free platform built for deploying your own apps."
name: DirectAdmin
site: https://www.directadmin.com
kind: Hosting control panel
family: hosting
price: "licence per server"
updated: 2026-11-23
keywords: directadmin alternative, directadmin alternative for laravel, migrate from directadmin
choose_cipi:
  - You deploy your own apps
  - You don't need mail, DNS or reseller hosting
  - You want Git deploys, queues and rollback
choose_them:
  - You run shared hosting for customers
  - You need mail and DNS on the same server
faq:
  - Is Cipi a DirectAdmin replacement? | For your own apps, yes. For hosting customers with mail and DNS, no.
  - Where are my site's files? | In `/home/<user>/domains/<domain>/public_html`, and in the same path inside a user backup.
  - Where are the databases in a backup? | As `.sql` files in the `backup/` folder of the user's archive.
  - Can I keep using the same domain? | Yes. Recreate the app with the same domain and switch DNS at the end.
  - Is Cipi really free? | Yes. Cipi is MIT licensed with no subscription, no per-server and no per-site fees. You pay only for the VPS, to the provider you choose.
  - What do I need to run Cipi? | A VPS (full virtual machine) with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443. 2 GB of RAM is comfortable for a few apps. See [Installation](/docs/installation).
  - Can I try Cipi without moving anything? | Yes. Install it on a new, cheap VPS, deploy a copy of one app and compare. Your current setup stays untouched until you change DNS.
  - Is there a web dashboard? | Optional and self-hosted: the [Cipi web panel](/web-panel) manages several servers, with roles and SSO. Everything also works from the CLI and the [API](/api).
---
## In 30 seconds {#summary}

DirectAdmin is a fast, affordable panel for web hosting: users, domains, mail, DNS, FTP and resellers, licensed per server. If you only run your own Laravel or PHP apps, you're paying for hosting features you don't use and missing the ones you need (Git releases, queues, rollback). Cipi is free and app-focused. Choose DirectAdmin to sell hosting; choose Cipi to run your apps.

## At a glance {#glance}

|  | Cipi | DirectAdmin |
| --- | --- | --- |
| Price | Free, MIT | Personal Plus $5 (2 accounts, 20 domains), Lite $15 (10, 50), Standard $29 (unlimited) per month |
| Built for | Deploying your apps | Shared and reseller hosting |
| E-mail, DNS, FTP | Not included | Included |
| Zero-downtime Git deploys | Yes | No |
| Laravel queues and scheduler | Built in | By hand |
| Per-app isolation | Own user, PHP pool, DB user, Valkey | Per hosting user |

Prices as published by DirectAdmin in November 2026; check [their site](https://www.directadmin.com) for the current ones.

## What DirectAdmin is {#what}

DirectAdmin is a commercial web-hosting control panel known for being light and fast. An admin creates users (hosting accounts) with domains; each user manages websites in `/home/<user>/domains/<domain>/public_html`, e-mail, databases and DNS.

## Pros and cons, honestly {#pros-cons}

**Where DirectAdmin is strong**

| Point | What it means for you |
| --- | --- |
| Light and fast | Small footprint compared with cPanel. |
| Affordable licences | From a few dollars a month. |
| Complete hosting | Mail, DNS, FTP, resellers. |

**Where DirectAdmin falls short**

| Point | What it means for you |
| --- | --- |
| Built for hosting businesses | Mail, DNS, FTP and reseller features you pay for even if you only deploy apps. |
| No Laravel lifecycle | No Git releases with rollback, queue workers or scheduler management. |
| Licence costs | A monthly licence per server, on top of the server. |

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

**Made for apps, not hosting accounts.** Each app is isolated with its own user, PHP pool and database, deployed from Git with zero downtime.

**No licence.** Free and open source, on any number of servers.

**Less running on the server.** No mail, DNS or FTP daemons to patch: a smaller attack surface.

**Laravel included.** Workers, scheduler, Horizon, Reverb, Octane, health checks and rollback.

## What it costs over three years {#cost}

| Setup | DirectAdmin | Cipi |
| --- | --- | --- |
| Lite licence, 3 years | $15 × 36 = $540 | $0 |
| Standard licence, 3 years | $29 × 36 = $1,044 | $0 |

Retail prices from DirectAdmin's pricing page, November 2026.

## Where everything goes in Cipi {#map}

Every DirectAdmin feature you use today, and its place in Cipi. Use it as your migration checklist.

| In DirectAdmin | In Cipi | Docs |
| --- | --- | --- |
| User (hosting account) | One Cipi app per site, each with its own Linux user | [App SSH](/docs/app-ssh) |
| Domains / pointers | `sudo cipi app create --domain`, `sudo cipi alias add` | [Domains](/docs/domains) |
| MySQL management | `sudo cipi db` | [Databases](/docs/databases) |
| Cron jobs | Scheduler, crontab | [Scheduler](/docs/scheduler) |
| SSL (Let's Encrypt) | `sudo cipi ssl install` | [SSL](/docs/ssl) |
| Create/Restore Backups | `sudo cipi backup` | [Backups](/docs/backups) |
| PHP version selector | `--php` | [PHP](/docs/php) |
| E-mail, DNS, FTP | Not included | Specialised providers |

## Moving to Cipi, step by step {#move}

Create a backup for each DirectAdmin user, rebuild each site as a Cipi app, import databases, switch DNS and MX.

**Before you start**

- Access to each user's DirectAdmin (or the admin level).
- A plan for e-mail if DirectAdmin hosts your mailboxes.

Click a step to jump to it; the map follows you down the page.

```flow
Take inventory | sites, databases, mail | #inventory
Make a backup | download everything | #backup
Install Cipi | on a new server | #install
Recreate each site | Laravel or custom app | #create
Import the databases | from the .sql files | #data
Cut-over day | DNS, HTTPS, mail | #cutover
```

### 1. Take inventory {#inventory}

List every site in DirectAdmin: domain, document root, PHP version, databases, cron jobs. Note what isn't a website: **e-mail accounts, DNS zones, FTP users**. Cipi hosts apps, not mailboxes or DNS, so those need a new home (see *What doesn't move* below).

On the server, each domain's files live in `/home/<user>/domains/<domain>/public_html`. If you have SSH, you can also `rsync` that folder directly.

### 2. Make a backup {#backup}

At the **user level**, open **Create/Restore Backups**, select the website files and databases, create the backup and download it from the user's `backups` folder. The admin can create backups for every user from **Admin Backup/Transfer**.

Each user's backup is a `.tar.gz`. Website files come from `domains/<domain>/public_html`, and the `backup/` folder inside holds the database dumps (`.sql`):

```bash
$ tar -xzf user.admin.fred.tar.gz
$ ls domains/*/public_html backup/*.sql
```

### 3. Install Cipi {#install}

Create a **new** VPS with Ubuntu 24.04 or 26.04 and install Cipi:

```bash
$ ssh root@NEW_IP
$ wget -O - https://cipi.sh/setup.sh | bash
```

Then log in as `cipi` (`ssh cipi@NEW_IP`). New to this? [VPS, SSH and DNS basics](/guides/vps-ssh-dns-basics).

### 4. Recreate each site {#create}

Pick the right kind of app for each site:

| Site | Create it as | Command |
| --- | --- | --- |
| Laravel app in Git | Laravel app | `sudo cipi app create --user=shop --domain=shop.com --repository=git@…` |
| WordPress, PrestaShop, plain PHP | Custom app | `sudo cipi app create --custom --user=blog --domain=blog.com` |
| Static HTML | Custom app | same, then upload the files |

For custom apps, upload the site's files into `~/htdocs` as the app user (SFTP, or `rsync` from the extracted backup), then create its database with `sudo cipi db create --name=blog --app=blog`. Step by step: [WordPress](/guides/deploy-wordpress-custom-app), [WooCommerce](/guides/woocommerce-vps).

### 5. Import the databases {#data}

Copy each `.sql` file from the backup to the server and restore it:

```bash
$ scp blog.sql cipi@NEW_IP:/tmp/
$ ssh cipi@NEW_IP "sudo cipi db restore blog /tmp/blog.sql"
```

Then update the site's config with the new database name, user and password Cipi printed (`wp-config.php` for WordPress, `.env` for Laravel). Database names usually change: hosting panels prefix them with the account name (`acct_blog`), Cipi doesn't.

### Test before anyone sees it {#test}

You can open the new copy with your real domain **only on your computer**, before changing DNS. Add one line to your hosts file (`/etc/hosts` on macOS and Linux, `C:\Windows\System32\drivers\etc\hosts` on Windows):

```text
203.0.113.20   shop.example.com
```

Browse the site, log in, place a test order, check e-mails and queued jobs. Remove the line when you're done. (HTTPS will warn until the certificate is issued after the DNS switch; that's expected.)

### 6. Cut-over day {#cutover}

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

If the old panel also handled your **e-mail**, move the MX records to your new mail provider at the same time, and keep the old mailboxes until every message has been copied.

### What doesn't move to Cipi {#not-moving}

| Thing | What to do instead |
| --- | --- |
| E-mail accounts and mailboxes | Move mail to a mail provider (Google Workspace, Microsoft 365, Fastmail, Zoho, Migadu…) and change the MX records. Cipi sends app e-mail through any SMTP service. |
| DNS zones | Keep DNS at your registrar or move it to Cloudflare (free). |
| FTP accounts | SFTP as each app's own user, with keys or a password. |
| Reseller accounts and hosting packages | Not a Cipi feature: it hosts your apps. Hosting providers can automate Cipi apps with the [WHMCS module](/docs/whmcs). |
| Softaculous / one-click installers | Install the CMS yourself (WordPress: [guide](/guides/deploy-wordpress-custom-app)). |
