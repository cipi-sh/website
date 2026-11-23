---
title: Deploy Laravel on an Ubuntu VPS with zero downtime
description: From a fresh Ubuntu 24.04 or 26.04 server to a Laravel app on HTTPS with queues, scheduler and push-to-deploy, in about fifteen minutes and for free.
category: start
order: 1
published: 2026-03-10
updated: 2026-11-23
howto: yes
keywords: deploy laravel vps, laravel ubuntu 24.04, laravel zero downtime deploy, laravel forge alternative free
related:
  - manage-apps-with-cipi-yml
  - laravel-ci-cd-git-workflow
  - cipi-digitalocean
faq:
  - How much does it cost? | Cipi is free and MIT licensed. You pay only for the server, from a few euros a month at Hetzner or DigitalOcean.
  - Can I host several apps on one server? | Yes. Each app gets its own Linux user, PHP pool, database and certificate, so apps can't read each other's files or data.
  - What if a deploy breaks the site? | Migrations and builds run on the new release before it goes live, and `cipi deploy myapp --rollback` swaps back in a second. With a health check set, a broken release is rolled back automatically.
---
This guide takes a fresh VPS to a live Laravel app with HTTPS, a queue worker, the scheduler and deploys on every `git push`. It uses [Cipi](/), a free, open-source tool that installs and runs the whole stack on your own server.

```flow
Server | Ubuntu 24.04 or 26.04
Install | one command, ~10 min
App | isolated user, DB, PHP
Deploy | atomic release from Git
HTTPS | Let's Encrypt
```

**You need:** a VPS with a public IPv4 (1 GB RAM is enough to start, 2 GB is comfortable), a domain whose DNS you control, and your Laravel project in a Git repository (GitHub, GitLab, Bitbucket, Azure DevOps or any server that accepts SSH deploy keys).

## 1. Create the server

Pick any provider that gives you a full virtual machine with Ubuntu 24.04 or 26.04 LTS: Hetzner, DigitalOcean, AWS, Vultr, Linode, OVHcloud, Scaleway. Provider-specific walkthroughs: [AWS EC2](/guides/cipi-aws-ec2), [Lightsail](/guides/cipi-aws-lightsail), [DigitalOcean](/guides/cipi-digitalocean), [Hetzner](/guides/cipi-hetzner).

Open ports **22, 80 and 443** in the provider's firewall if it has one. Then point your domain's `A` record at the server's IP; DNS can propagate while you install.

## 2. Install Cipi

SSH in as root (or a sudo user) and run the installer:

```bash
$ ssh root@203.0.113.10
$ wget -O - https://cipi.sh/setup.sh | bash
```

<cipi-term name="qs-install"></cipi-term>

It asks for your SSH public key, shows what it will do, and only then installs Nginx, PHP, MariaDB, Valkey, Supervisor, Node, Certbot, the firewall and fail2ban, and hardens SSH. Save the credentials it prints: they're shown once.

## 3. Log in as cipi

Root login is now disabled. Connect as `cipi` with your key; Cipi commands run with `sudo`, no password.

```bash
$ ssh cipi@203.0.113.10
$ sudo cipi status
```

## 4. Create the app

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:acme/shop.git --branch=main --php=8.6
```

Or run `sudo cipi app create` alone and answer the wizard. Cipi creates a Linux user `shop`, a database and user `shop`, a PHP-FPM pool, an Nginx vhost, a queue worker, the scheduler cron and an `ed25519` deploy key.

| You get | Where |
| --- | --- |
| `.env` with every credential | `/home/shop/shared/.env` |
| Releases | `/home/shop/releases/`, live one linked at `current/` |
| Logs | `/home/shop/logs/` |
| One-time summary | DB password, deploy key, webhook URL and token |

## 5. Connect the repository

Add the deploy key from the summary as a **read-only deploy key** (GitHub: Settings → Deploy keys), and the webhook URL and token if you want push-to-deploy. If you gave Cipi a Git token, it already did both. Check access:

```bash
$ sudo cipi git check shop
```

## 6. Deploy

```bash
$ sudo cipi deploy shop
```

<cipi-term name="qs-deploy"></cipi-term>

Each deploy clones into a new release folder, runs `composer install`, links `.env` and `storage`, runs migrations, builds assets if you set a build command, then switches `current` with one atomic symlink and restarts workers. Visitors never see a half-deployed app.

## 7. Turn on HTTPS

```bash
$ sudo cipi ssl install shop
```

The certificate covers the domain and every alias and renews by itself. `APP_URL` becomes `https://`. Behind the Cloudflare proxy, use `--dns=cloudflare` and set SSL/TLS to Full (strict).

## 8. Deploy on every push

With the webhook in place, every push to `main` deploys. Prefer tests first? Turn the webhook off and deploy from [GitHub Actions](/guides/laravel-ci-cd-git-workflow). Want the server settings (PHP, workers, backups) versioned in the repository? Add a [`cipi.yml`](/guides/manage-apps-with-cipi-yml).

## What to do next

| Goal | Command or guide |
| --- | --- |
| Roll back | `sudo cipi deploy shop --rollback` |
| More queue workers or Horizon | [Horizon and queues](/guides/laravel-horizon-queues) |
| Nightly backups to S3 | [Back up to S3](/guides/backup-vps-s3) |
| Faster responses | [Laravel Octane with FrankenPHP](/guides/laravel-octane-frankenphp) |
| Alerts on Telegram or Slack | [Monitoring and alerts](/guides/server-monitoring-alerts) |
| A browser UI for the team | [Web panel and API](/guides/cipi-gui-and-api) |
