---
title: "Cipi vs cPanel"
description: "Cipi vs cPanel & WHM: a hosting panel compared with a free app platform, with real licence costs, pros and cons, and a step-by-step migration from a cPanel backup to Cipi."
lead: "cPanel is the classic panel for web hosting businesses. Cipi is a free platform for deploying your own apps on your own server."
name: cPanel
site: https://cpanel.net
kind: Hosting control panel
family: hosting
price: "licence per server, by number of accounts"
updated: 2026-11-23
keywords: cpanel alternative, cpanel alternative for laravel, leave cpanel, migrate from cpanel to vps
choose_cipi:
  - You deploy your own Laravel or PHP apps
  - You don't want to pay a licence per server
  - You want Git deploys with rollback
choose_them:
  - You sell hosting with e-mail, DNS and reseller accounts
  - Your customers expect cPanel
faq:
  - Can Cipi replace cPanel? | For running your own websites and apps, yes. For selling hosting with mailboxes and DNS to customers, no: that's what cPanel is for.
  - What happens to my e-mail? | Cipi doesn't host mailboxes. Move them to a mail provider, then update the MX records. Your apps send mail through any SMTP service.
  - Where are my databases in the backup? | In the `mysql/` folder of the full backup, one `.sql` file per database.
  - Can I move WordPress sites? | Yes, as custom apps. [WordPress guide](/guides/deploy-wordpress-custom-app).
  - Do I need a different server? | Yes, a fresh Ubuntu 24.04 or 26.04 VPS. cPanel servers usually run AlmaLinux or CloudLinux, and Cipi needs a clean Ubuntu.
  - Is Cipi really free? | Yes. Cipi is MIT licensed with no subscription, no per-server and no per-site fees. You pay only for the VPS, to the provider you choose.
  - What do I need to run Cipi? | A VPS (full virtual machine) with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443. 2 GB of RAM is comfortable for a few apps. See [Installation](/docs/installation).
  - Can I try Cipi without moving anything? | Yes. Install it on a new, cheap VPS, deploy a copy of one app and compare. Your current setup stays untouched until you change DNS.
---
## In 30 seconds {#summary}

cPanel & WHM is built for hosting companies: accounts, mailboxes, DNS, FTP, resellers. It's licensed per server by the number of accounts. If you run your own Laravel or PHP apps, most of that is weight you pay for. Cipi hosts apps only, isolated and deployed from Git, for free. Choose cPanel if you sell hosting with e-mail; choose Cipi to run your own apps.

## At a glance {#glance}

|  | Cipi | cPanel |
| --- | --- | --- |
| Price | Free, MIT | Solo $29.99 (1 account), Admin $35.99 (5), Pro $53.99 (30), Premier $69.99 (100) per month, cloud licences |
| Built for | Deploying your apps | Shared and reseller hosting |
| E-mail, DNS, FTP | Not included (use specialised providers) | Included |
| Zero-downtime Git deploys | Yes | No (Git Version Control without releases) |
| Laravel queues and scheduler | Built in | Cron jobs by hand |
| OS | Ubuntu 24.04 / 26.04 | AlmaLinux, Rocky, CloudLinux, Ubuntu |

Prices as published by cPanel in November 2026; check [their site](https://cpanel.net) for the current ones.

## What cPanel is {#what}

cPanel & WHM is a commercial control panel for web hosting. WHM manages the server and hosting accounts; each account gets cPanel to manage its websites, e-mail, databases, DNS and files. It's licensed per server, with tiers based on how many accounts the server hosts.

## Pros and cons, honestly {#pros-cons}

**Where cPanel is strong**

| Point | What it means for you |
| --- | --- |
| All-in-one hosting | Web, mail, DNS, FTP, resellers in one product. |
| Familiar | Most shared-hosting users know it. |
| Full backups | One tarball per account with files, mail and databases. |

**Where cPanel falls short**

| Point | What it means for you |
| --- | --- |
| Built for hosting businesses | Mail, DNS, FTP and reseller features you pay for even if you only deploy apps. |
| No Laravel lifecycle | No Git releases with rollback, queue workers or scheduler management. |
| Licence costs | A monthly licence per server, on top of the server. |
| Rising prices | Licences have gone up year after year; the jump from one account to two moves you to a higher tier. |

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

| Setup | cPanel (cloud licence) | Cipi |
| --- | --- | --- |
| 1 site, 3 years (Solo) | $29.99 × 36 ≈ $1,080 | $0 |
| Up to 5 sites, 3 years (Admin) | $35.99 × 36 ≈ $1,296 | $0 |
| Up to 30 sites, 3 years (Pro) | $53.99 × 36 ≈ $1,944 | $0 |

List prices from cPanel's store, November 2026, before tax. Hosting providers often bundle the licence in their plans.

## Where everything goes in Cipi {#map}

Every cPanel feature you use today, and its place in Cipi. Use it as your migration checklist.

| In cPanel | In Cipi | Docs |
| --- | --- | --- |
| cPanel account | One Cipi app per site, each with its own Linux user | [App SSH](/docs/app-ssh) |
| Addon domains / aliases | `cipi alias add` | [Domains](/docs/domains) |
| MySQL databases | `cipi db create`, `cipi db restore` | [Databases](/docs/databases) |
| phpMyAdmin | TablePlus/DBeaver over SSH (`mariadb+ssh://`) | [Databases](/docs/databases) |
| Cron jobs | Laravel scheduler; app user's crontab |  |
| SSL/TLS (AutoSSL) | `cipi ssl install` | [SSL](/docs/ssl) |
| Backup Wizard | `cipi backup` to S3 | [Backups](/docs/backups) |
| Git Version Control | Webhook deploys with releases | [Auto-deploy](/docs/auto-deploy) |
| MultiPHP Manager | `--php`, `cipi php` | [PHP](/docs/php) |
| Email accounts | Not included | Use a mail provider |
| Zone editor | Not included | Use your DNS provider |

## Moving to Cipi, step by step {#move}

Download a full backup of each cPanel account, rebuild each site as a Cipi app, import the databases, then switch DNS (and MX for mail).

**Before you start**

- Access to cPanel for each account (or WHM as root).
- A plan for e-mail if cPanel hosts your mailboxes.
- Enough disk on your laptop for the backups.

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

List every site in cPanel: domain, document root, PHP version, databases, cron jobs. Note what isn't a website: **e-mail accounts, DNS zones, FTP users**. Cipi hosts apps, not mailboxes or DNS, so those need a new home (see *What doesn't move* below).



### 2. Make a backup {#backup}

In cPanel, open **Files → Backup** (or Backup Wizard) and generate a **full account backup**, then download it. From WHM, root can also create account backups.

The file is named like `backup-<date>_<user>.tar.gz`. Inside, `homedir/public_html` holds the main site's files and the `mysql/` folder holds one `.sql` dump per database:

```bash
$ tar -xzf backup-*_acct.tar.gz
$ ls backup-*/homedir/public_html backup-*/mysql
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
