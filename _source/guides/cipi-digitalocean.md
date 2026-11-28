---
title: Install Cipi on a DigitalOcean Droplet
description: Create a DigitalOcean Droplet for Laravel step by step (image, size, SSH key, cloud firewall, reserved IP), install Cipi, point DNS, and use Spaces for off-site backups.
category: providers
order: 3
published: 2026-11-23
updated: 2026-11-26
howto: yes
keywords: laravel digitalocean, deploy laravel droplet, digitalocean ubuntu 24.04 laravel, laravel forge digitalocean alternative
related:
  - cipi-hetzner
  - deploy-laravel-ubuntu-vps
  - backup-vps-s3
docs:
  - installation
  - firewall
  - backups
  - monitor
faq:
  - Which Droplet size? | Basic with 2 GB RAM for one or two small apps, 4 GB for several apps or Octane and Meilisearch. Premium CPUs help CPU-heavy apps.
  - Should I enable DigitalOcean's backups? | They snapshot the whole disk weekly or daily, which is a good extra. Keep Cipi's backups too: they're per app, encrypted and restorable on any server.
  - Can I use a DigitalOcean Load Balancer? | Yes, with two or more Droplets running the same app. Terminate TLS on the balancer or pass it through to Cipi's certificates.
  - Does Cipi need root? | Only to install. The installer runs as root (or with `sudo -i`), then disables root login; you work as `cipi` with `sudo cipi …`.
  - Can I resize the server later? | Yes. Resizing at the provider keeps the disk; Cipi adapts. To change provider or region, move apps with `sudo cipi sync`.
  - What if a step fails? | Read the troubleshooting table above first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community. Most commands print the fix when they refuse something.
  - Do I need the web panel for this? | No. Every step works from the CLI. The optional [web panel](/web-panel) shows the same things in a browser.
---
A Droplet is a full KVM virtual machine: exactly what Cipi needs.

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

## 1. Create the Droplet

**Create → Droplets**:

| Setting | Choose |
| --- | --- |
| Image | **Ubuntu 24.04 (LTS) x64** or 26.04 |
| Size | Basic, 2 GB RAM is comfortable for a few apps |
| Authentication | **SSH key** (add yours) |
| Extras | Monitoring agent optional; Cipi has its own [monitor](/docs/monitor) |

## 2. Firewall and IP

- **Networking → Firewalls**: inbound TCP 22, 80, 443 from all IPv4 and IPv6; attach to the Droplet. Optional: Cipi's own firewall already protects the host.
- **Networking → Reserved IPs**: assign one if you may rebuild or resize the Droplet.

## 3. Install

```bash
$ ssh root@203.0.113.10
$ wget -O - https://cipi.sh/setup.sh | bash
```

The installer disables root login and creates the `cipi` user with your key. Then:

```bash
$ ssh cipi@203.0.113.10
$ sudo cipi status
```

## 4. DNS and first app

Add an `A` record (DigitalOcean DNS or your registrar) to the Droplet's IP and continue with [Deploy Laravel on an Ubuntu VPS](/guides/deploy-laravel-ubuntu-vps).

## DigitalOcean extras that fit

| Need | Use |
| --- | --- |
| Off-site backups | **Spaces** is S3-compatible: use it as a `sudo cipi backup` destination |
| Managed database | Point `DB_*` at a Managed MySQL/PostgreSQL cluster if you prefer |
| Behind a load balancer | Terminate TLS on the balancer or pass through to Cipi's certificates |

## Off-site backups on Spaces {#spaces}

Create a Space in another region and a Spaces access key, then:

```bash
$ sudo cipi backup destination add spaces --bucket=acme-backups \
    --key=… --secret=… --endpoint=https://ams3.digitaloceanspaces.com --region=ams3
$ sudo cipi backup destination test
```

[Full backup guide](/guides/backup-vps-s3).

> [!tip] **From the web panel.** With the optional [web panel](/web-panel) (cipi/gui 4.8.0+), the **DigitalOcean** connector lists your Droplets with each Cipi server named (`203.0.113.24 → production`), creates, resizes, snapshots and powers them, and manages domains, firewalls, reserved IPs, Spaces and Spaces keys scoped to a bucket, with the app's `.env`. See [Connectors](/docs/gui-connectors#digitalocean).

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Installer stops: container detected | You picked a container product (LXC/OpenVZ): choose a KVM virtual machine |
| Installer stops: unsupported OS | Use a plain Ubuntu 24.04 or 26.04 LTS image, not a marketplace app |
| `Permission denied (publickey)` after the install | Log in as `cipi`, not `root` or `ubuntu`, with the key you pasted in the installer |
| Certificate fails | Port 80 closed in the provider firewall, or DNS not pointing at the server yet |
| Site unreachable on 443 | Add 443 to the provider firewall (IPv4 and IPv6) |
| Notification e-mail never arrives | Port 25 is blocked by most providers: use an SMTP service on 587 |
