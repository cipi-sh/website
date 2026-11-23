---
title: Install Cipi on a DigitalOcean Droplet
description: Create an Ubuntu Droplet with your SSH key, add a Cloud Firewall, reserve an IP and install Cipi to run Laravel and PHP apps on DigitalOcean.
category: providers
order: 3
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel digitalocean, deploy laravel droplet, digitalocean ubuntu 24.04 laravel, laravel forge digitalocean alternative
related:
  - cipi-hetzner
  - deploy-laravel-ubuntu-vps
  - backup-vps-s3
---
A Droplet is a full KVM virtual machine: exactly what Cipi needs.

## 1. Create the Droplet

**Create → Droplets**:

| Setting | Choose |
| --- | --- |
| Image | **Ubuntu 24.04 (LTS) x64** |
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
| Off-site backups | **Spaces** is S3-compatible: use it as a `cipi backup` destination |
| Managed database | Point `DB_*` at a Managed MySQL/PostgreSQL cluster if you prefer |
| Behind a load balancer | Terminate TLS on the balancer or pass through to Cipi's certificates |
