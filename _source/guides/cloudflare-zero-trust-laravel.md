---
title: Put a Laravel server behind Cloudflare Zero Trust
description: Serve apps through a Cloudflare Tunnel with CDN and WAF, put staging, the panel and SSH behind Cloudflare Access, then close the server's public ports, step by step and reversibly.
category: security
order: 2
published: 2026-09-02
updated: 2026-11-23
howto: yes
keywords: cloudflare tunnel laravel, cloudflare access laravel staging, close ports server cloudflare, zero trust ssh
related:
  - laravel-security-checklist
  - php-nginx-cve-patching
  - cipi-gui-and-api
---
With a Cloudflare Tunnel the server dials out to Cloudflare, and visitors reach it through Cloudflare's network. Once every app goes through the tunnel, you can close ports 80, 443 and even 22. Cipi does it in reversible steps; nothing closes until you ask.

```flow
Token | Tunnel, Access, DNS
Enable | tunnel; ports still open
Route | apps, panel, SSH
Test | from your laptop
Lock | close the ports
```

## 1. Create an API token

In Cloudflare: **My Profile → API Tokens → Create**, with Account · Cloudflare Tunnel: Edit, Account · Access: Apps and Policies: Edit, Zone · DNS: Edit (and Zone · SSL and Certificates for Origin CA certificates).

```bash
$ sudo cipi zt token set --token=CF_API_TOKEN --account=ACCOUNT_ID
$ sudo cipi zt enable
```

`enable` installs `cloudflared`, creates the tunnel and teaches Nginx, fail2ban and CrowdSec Cloudflare's IP ranges (refreshed daily). **No port is closed yet.**

## 2. Route the apps

```bash
$ sudo cipi zt hostname add shop          # public, through CDN and WAF
$ sudo cipi zt hostname add shop-stg
$ sudo cipi zt access enable shop-stg     # login required (Cloudflare Access)
$ sudo cipi zt access enable --gui        # the web panel too
```

Access protects staging and the panel with your identity provider. `/cipi/webhook` stays reachable so pushes still deploy.

## 3. SSH through the tunnel

```bash
$ sudo cipi zt ssh enable --hostname=ssh.example.com
```

On your laptop:

```text
# ~/.ssh/config
Host ssh.example.com
  ProxyCommand cloudflared access ssh --hostname %h
  User cipi
  IdentityFile ~/.ssh/id_ed25519
```

Test `ssh ssh.example.com` **before** the next step.

## 4. Certificates

A closed origin can't renew over HTTP. Move each app to DNS validation, or use a long-lived Cloudflare Origin CA certificate:

```bash
$ sudo cipi ssl install shop --dns=cloudflare
```

## 5. Close the ports

```bash
$ sudo cipi zt lock http --yes     # 80/443 closed, or Cloudflare-only
$ sudo cipi zt lock ssh --yes      # 22 closed; SSH only through Access
$ sudo cipi zt status
```

> [!warning] Lock SSH only after SSH through the tunnel works from your machine, and keep your provider's web console handy. Deploys aren't affected: they run locally.

Every step has its undo: `unlock http`, `ssh unlock`, `access disable`, `hostname remove`, `disable`.
