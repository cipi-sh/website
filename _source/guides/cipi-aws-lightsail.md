---
title: Install Cipi on Amazon Lightsail
description: Host Laravel and PHP apps on a fixed-price Lightsail instance: OS-only Ubuntu, a static IP, the HTTPS firewall rule, and Cipi in one command.
category: providers
order: 2
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel lightsail, deploy laravel amazon lightsail, lightsail ubuntu laravel, cheap laravel hosting aws
related:
  - cipi-aws-ec2
  - deploy-laravel-ubuntu-vps
  - cipi-digitalocean
---
Lightsail is AWS with a fixed monthly price: a good fit for one to a handful of apps. Use the **OS-only** Ubuntu blueprint so Cipi can own the stack.

## 1. Create the instance

**Lightsail → Create instance**:

| Setting | Choose |
| --- | --- |
| Platform | Linux/Unix |
| Blueprint | **OS Only → Ubuntu 24.04 LTS** (not LAMP or a Bitnami app) |
| SSH key | Your own key, or the default one Lightsail generates |
| Plan | 2 GB RAM is comfortable; 1 GB works for a small app |

## 2. Static IP and firewall

- **Networking → Create static IP** and attach it to the instance.
- In the instance's **Networking** tab, IPv4 firewall: keep SSH (22) and HTTP (80), **add HTTPS (443)**. Do the same for IPv6 if you use it.

## 3. Install Cipi

```bash
$ ssh ubuntu@203.0.113.10
$ sudo -i
$ wget -O - https://cipi.sh/setup.sh | bash
```

Paste your own public key when asked. From then on: `ssh cipi@203.0.113.10` and `sudo cipi …`.

## 4. DNS and first app

Point an `A` record at the static IP (Lightsail DNS zones work), then create and deploy the app as in [the main guide](/guides/deploy-laravel-ubuntu-vps).

## Growing out of it

| When | Do |
| --- | --- |
| You need more RAM | Snapshot the instance and create a bigger one from it, or move apps with [`cipi sync`](/guides/migrate-server-cipi-sync) |
| You need VPC, autoscaling groups, RDS in private subnets | Move to [EC2](/guides/cipi-aws-ec2) |

> [!note] Lightsail's own snapshots copy the whole disk. Keep Cipi's [S3 backups](/guides/backup-vps-s3) too: they're per app, encrypted and restorable on any server.
