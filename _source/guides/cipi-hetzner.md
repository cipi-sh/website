---
title: Install Cipi on Hetzner Cloud
description: Create a Hetzner Cloud server with Ubuntu 24.04, an SSH key and a firewall, then install Cipi to host Laravel and PHP apps in Germany, Finland, the US or Singapore.
category: providers
order: 4
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel hetzner, deploy laravel hetzner cloud, hetzner ubuntu laravel, cheap laravel vps europe
related:
  - cipi-digitalocean
  - deploy-laravel-ubuntu-vps
  - backup-vps-s3
---
Hetzner Cloud is a popular choice for Laravel in Europe: KVM servers at low prices, with data centres in Germany and Finland as well as the US and Singapore. Data stays in the region you pick, which helps with GDPR.

## 1. Create the server

**Cloud Console → your project → Add server**:

| Setting | Choose |
| --- | --- |
| Location | Closest to your users |
| Image | **Ubuntu 24.04** |
| Type | Shared vCPU (x86) with 2 GB+ RAM to start |
| Networking | **Public IPv4** on (Cipi needs one), IPv6 too |
| SSH key | Add yours |

## 2. Firewall (optional)

**Firewalls → Create**: inbound TCP 22, 80, 443 from any, applied to the server. Cipi also configures UFW and fail2ban on the host.

## 3. Install

```bash
$ ssh root@203.0.113.10
$ wget -O - https://cipi.sh/setup.sh | bash
$ ssh cipi@203.0.113.10        # afterwards
```

## 4. DNS and first app

Create the `A`/`AAAA` records and follow [the main guide](/guides/deploy-laravel-ubuntu-vps) from step 4.

## Hetzner extras that fit

| Need | Use |
| --- | --- |
| Off-site backups | **Object Storage** (S3-compatible) as a `cipi backup` destination, in another location |
| More disk | Volumes for large uploads; keep `shared/` on fast local disk |
| A second server | Move or replicate apps with [`cipi sync`](/guides/migrate-server-cipi-sync) |
