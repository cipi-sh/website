---
title: Install Cipi on Amazon Lightsail
description: Create an AWS Lightsail instance for Laravel step by step (OS-only Ubuntu blueprint, plan, static IP, IPv4 and IPv6 firewall), install Cipi, point DNS and know when to move to EC2.
category: providers
order: 2
published: 2026-11-23
updated: 2026-11-26
howto: yes
keywords: laravel lightsail, deploy laravel amazon lightsail, lightsail ubuntu laravel, cheap laravel hosting aws
related:
  - cipi-aws-ec2
  - deploy-laravel-ubuntu-vps
  - cipi-digitalocean
docs:
  - installation
  - firewall
  - backups
  - sync
faq:
  - Which blueprint? | OS Only → Ubuntu 24.04 LTS. LAMP, Bitnami or app blueprints come with their own web server and conflict with Cipi.
  - Do I need a static IP? | Yes. Without it the public IP changes when the instance stops, and your DNS breaks.
  - Lightsail or EC2? | Lightsail for a fixed monthly price and simple needs. EC2 when you need VPCs, private RDS, autoscaling or specific instance types.
  - Does Cipi need root? | Only to install. The installer runs as root (or with `sudo -i`), then disables root login; you work as `cipi` with `sudo cipi …`.
  - Can I resize the server later? | Yes. Resizing at the provider keeps the disk; Cipi adapts. To change provider or region, move apps with `sudo cipi sync`.
  - What if a step fails? | Read the troubleshooting table above first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community. Most commands print the fix when they refuse something.
  - Do I need the web panel for this? | No. Every step works from the CLI. The optional [web panel](/web-panel) shows the same things in a browser.
---
Lightsail is AWS with a fixed monthly price: a good fit for one to a handful of apps. Use the **OS-only** Ubuntu blueprint so Cipi can own the stack.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Instance / server** | The virtual machine you rent |
| **Image** | The operating system it starts with: pick plain Ubuntu LTS, nothing pre-installed |
| **Public IP** | The address visitors and DNS point to; make it static so it survives rebuilds |
| **Provider firewall** | Rules in the provider's console, before traffic reaches the server. Cipi adds its own (UFW) on the server |
| **SSH key** | How you log in: the public half goes to the provider, the private half stays on your laptop ([basics](/guides/vps-ssh-dns-basics)) |

## Before you start {#before}

- An account with the provider and a payment method.
- An SSH key on your laptop (`ssh-keygen -t ed25519`), see [VPS, SSH and DNS basics](/guides/vps-ssh-dns-basics).
- A domain whose DNS you can edit.

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
| You need more RAM | Snapshot the instance and create a bigger one from it, or move apps with [`sudo cipi sync`](/guides/migrate-server-cipi-sync) |
| You need VPC, autoscaling groups, RDS in private subnets | Move to [EC2](/guides/cipi-aws-ec2) |

> [!note] Lightsail's own snapshots copy the whole disk. Keep Cipi's [S3 backups](/guides/backup-vps-s3) too: they're per app, encrypted and restorable on any server.

> [!tip] **From the web panel.** With the optional [web panel](/web-panel) (cipi/gui 4.8.0+), the **AWS** connector covers every kind of Lightsail resource — instances with each Cipi server named, static IPs, firewall ports, snapshots, disks, DNS zones — next to EC2, S3, Route 53, SES and CloudWatch. See [Connectors](/docs/gui-connectors#aws).

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Installer stops: container detected | You picked a container product (LXC/OpenVZ): choose a KVM virtual machine |
| Installer stops: unsupported OS | Use a plain Ubuntu 24.04 or 26.04 LTS image, not a marketplace app |
| `Permission denied (publickey)` after the install | Log in as `cipi`, not `root` or `ubuntu`, with the key you pasted in the installer |
| Certificate fails | Port 80 closed in the provider firewall, or DNS not pointing at the server yet |
| Site unreachable on 443 | Add 443 to the provider firewall (IPv4 and IPv6) |
| Notification e-mail never arrives | Port 25 is blocked by most providers: use an SMTP service on 587 |
