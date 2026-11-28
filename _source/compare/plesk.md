---
title: "Cipi vs Plesk"
description: "Cipi vs Plesk: a commercial hosting panel compared with a free app platform, with licence tiers, pros and cons, and a step-by-step migration from Plesk to Cipi."
lead: "Plesk is a commercial panel for hosting and agencies, licensed by domain count. Cipi is free and built for deploying your own apps."
name: Plesk
site: https://www.plesk.com
kind: Hosting control panel
family: hosting
price: "licence per server, by number of domains"
updated: 2026-11-23
keywords: plesk alternative, plesk alternative laravel, migrate from plesk
choose_cipi:
  - You deploy your own Laravel or PHP apps
  - You want no licence and Git deploys with rollback
choose_them:
  - You need mail, DNS and WordPress tooling for clients
  - You host Windows sites
faq:
  - Does Plesk's Laravel Toolkit do the same? | It helps manage Laravel apps, but deploys aren't release-based with instant rollback, and Plesk keeps the hosting features you may not need.
  - Where are site files on Plesk? | On Linux, usually `/var/www/vhosts/<domain>/httpdocs`.
  - Can I export databases from Plesk? | Yes: Databases → Export Dump, then `sudo cipi db restore` on Cipi.
  - Is Cipi really free? | Yes. Cipi is MIT licensed with no subscription, no per-server and no per-site fees. You pay only for the VPS, to the provider you choose.
  - What do I need to run Cipi? | A VPS (full virtual machine) with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443. 2 GB of RAM is comfortable for a few apps. See [Installation](/docs/installation).
  - Can I try Cipi without moving anything? | Yes. Install it on a new, cheap VPS, deploy a copy of one app and compare. Your current setup stays untouched until you change DNS.
  - Is there a web dashboard? | Optional and self-hosted: the [Cipi web panel](/web-panel) manages several servers, with roles and SSO. Everything also works from the CLI and the [API](/api).
  - Can Cipi host WordPress or non-Laravel PHP? | Yes, as [custom apps](/docs/custom-apps), each isolated with its own user, PHP pool and database. [WordPress guide](/guides/deploy-wordpress-custom-app).
---
## In 30 seconds {#summary}

Plesk manages websites, mail, DNS and WordPress across Linux and Windows, licensed by edition (10, 30 or unlimited domains). It has Git and Laravel extensions, but no release-based deploys with rollback or Laravel worker management in the core. Cipi is free and does the Laravel lifecycle natively. Choose Plesk for an agency panel with mail and WordPress tooling; choose Cipi to deploy and run your own apps.

## At a glance {#glance}

|  | Cipi | Plesk |
| --- | --- | --- |
| Price | Free, MIT | Web Admin (10 domains), Web Pro (30), Web Host (unlimited): monthly licence per server |
| Built for | Deploying your apps | Hosting, agencies, WordPress |
| E-mail, DNS | Not included | Included |
| Zero-downtime deploys | Yes | No |
| Laravel lifecycle | Built in | Extension, partial |
| OS | Ubuntu 24.04 / 26.04 | Linux and Windows |

Prices as published by Plesk in November 2026; check [their site](https://www.plesk.com) for the current ones.

## What Plesk is {#what}

Plesk Obsidian is a commercial control panel for websites, mail, DNS and databases, with WP Toolkit for WordPress and extensions for Git, Node.js and Laravel. It's licensed per server by edition.

## Pros and cons, honestly {#pros-cons}

**Where Plesk is strong**

| Point | What it means for you |
| --- | --- |
| WordPress tooling | WP Toolkit for agencies. |
| Windows support | IIS and .NET sites. |
| Extensions | A marketplace of add-ons. |

**Where Plesk falls short**

| Point | What it means for you |
| --- | --- |
| Built for hosting businesses | Mail, DNS, FTP and reseller features you pay for even if you only deploy apps. |
| No Laravel lifecycle | No Git releases with rollback, queue workers or scheduler management. |
| Licence costs | A monthly licence per server, on top of the server. |
| Licence by domain count | More sites can mean a higher edition. |

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

## Where everything goes in Cipi {#map}

Every Plesk feature you use today, and its place in Cipi. Use it as your migration checklist.

| In Plesk | In Cipi | Docs |
| --- | --- | --- |
| Subscription / domain | One Cipi app per site |  |
| Databases | `sudo cipi db` | [Databases](/docs/databases) |
| Git extension | Webhook deploys with releases | [Auto-deploy](/docs/auto-deploy) |
| Laravel Toolkit | Built in: workers, scheduler, Horizon, Octane | [Workers](/docs/workers) |
| Scheduled tasks | Scheduler, crontab | [Scheduler](/docs/scheduler) |
| Let's Encrypt | `sudo cipi ssl install` | [SSL](/docs/ssl) |
| Backup Manager | `sudo cipi backup` | [Backups](/docs/backups) |
| Mail, DNS | Not included | Specialised providers |

## Moving to Cipi, step by step {#move}

Export each site's files and databases from Plesk, rebuild each site as a Cipi app, import, switch DNS and MX.

**Before you start**

- Access to Plesk for each subscription.
- A plan for e-mail.

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

List every site in Plesk: domain, document root, PHP version, databases, cron jobs. Note what isn't a website: **e-mail accounts, DNS zones, FTP users**. Cipi hosts apps, not mailboxes or DNS, so those need a new home (see *What doesn't move* below).



### 2. Make a backup {#backup}

For each subscription, export the database from **Databases → Export Dump** and download the site files (File Manager, FTP/SFTP, or `rsync` over SSH). Plesk's **Backup Manager** can also create and download a full backup.

On Linux, a site's files usually live in `/var/www/vhosts/<domain>/httpdocs`.

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
| Windows / IIS sites | Cipi is Linux-only: keep .NET sites on Windows hosting. |
