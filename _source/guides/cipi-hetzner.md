---
title: Install Cipi on Hetzner Cloud
description: Create a Hetzner Cloud server step by step (location, Ubuntu image, server type, SSH key, firewall, IPv4), install Cipi, point DNS and set up off-site backups to Hetzner Object Storage.
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
docs:
  - installation
  - firewall
  - backups
  - sync
faq:
  - Which server type? | A shared-vCPU x86 type with 4 GB RAM is a comfortable start for a few Laravel apps; 2 GB is enough for one small app. Dedicated vCPU types suit CPU-heavy work.
  - Is a Primary IPv4 needed? | Yes. Let's Encrypt and most visitors still need IPv4. Keep it as a Primary IP so it survives a rebuild.
  - Is Hetzner good for GDPR? | Data stays in the location you choose (Germany or Finland for the EU) and Hetzner offers a DPA. Your obligations as controller stay yours.
  - Does Cipi need root? | Only to install. The installer runs as root (or with `sudo -i`), then disables root login; you work as `cipi` with `sudo cipi …`.
  - Can I resize the server later? | Yes. Resizing at the provider keeps the disk; Cipi adapts. To change provider or region, move apps with `cipi sync`.
---
Hetzner Cloud is a popular choice for Laravel in Europe: KVM servers at low prices, with data centres in Germany and Finland as well as the US and Singapore. Data stays in the region you pick, which helps with GDPR.

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

## 1. Create the server

**Cloud Console → your project → Add server**:

| Setting | Choose |
| --- | --- |
| Location | Closest to your users |
| Image | **Ubuntu 24.04** or **26.04** |
| Type | Shared vCPU **x86**, 4 GB RAM is comfortable (2 GB for one small app) |
| Networking | **Public IPv4** on (Cipi needs one), IPv6 too. Keep the IPv4 as a Primary IP |
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

```bash
$ dig +short shop.example.com      # must print the server IP
```

## Hetzner extras that fit

| Need | Use |
| --- | --- |
| Off-site backups | **Object Storage** (S3-compatible) as a `cipi backup` destination, in another location |
| More disk | Volumes for large uploads; keep `shared/` on fast local disk |
| A second server | Move or replicate apps with [`cipi sync`](/guides/migrate-server-cipi-sync) |

## Off-site backups on Hetzner Object Storage {#object-storage}

Create a bucket in **another location** than the server, and S3 credentials for it, then:

```bash
$ sudo cipi backup destination add hetzner --bucket=acme-backups \
    --key=… --secret=… --endpoint=https://fsn1.your-objectstorage.com --region=fsn1
$ sudo cipi backup destination test
```

Full setup: [backups to S3](/guides/backup-vps-s3).

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Installer stops: container detected | You picked a container product (LXC/OpenVZ): choose a KVM virtual machine |
| Installer stops: unsupported OS | Use a plain Ubuntu 24.04 or 26.04 LTS image, not a marketplace app |
| `Permission denied (publickey)` after the install | Log in as `cipi`, not `root` or `ubuntu`, with the key you pasted in the installer |
| Certificate fails | Port 80 closed in the provider firewall, or DNS not pointing at the server yet |
| Site unreachable on 443 | Add 443 to the provider firewall (IPv4 and IPv6) |
| Notification e-mail never arrives | Port 25 is blocked by most providers: use an SMTP service on 587 |
