---
title: Cipi on Vultr, Akamai Linode, OVHcloud and Scaleway
description: The settings that matter on four more providers (image, IP, firewall, rDNS) to install Cipi and host Laravel and PHP apps.
category: providers
order: 5
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel vultr, laravel linode, laravel ovhcloud vps, laravel scaleway, install cipi
related:
  - cipi-hetzner
  - cipi-digitalocean
  - deploy-laravel-ubuntu-vps
---
Any provider works as long as you get a **full virtual machine** (KVM or similar) with **Ubuntu 24.04 or 26.04**, a **public IPv4** and ports **22, 80 and 443** reachable. The installer checks the environment and stops with an explanation inside containers (LXC, OpenVZ).

| Provider | Create | Image | Firewall | Notes |
| --- | --- | --- | --- | --- |
| **Vultr** | Deploy → Cloud Compute | Ubuntu 24.04 LTS x64 | Network → Firewall group (22, 80, 443) | Object Storage is S3-compatible for backups |
| **Akamai Linode** | Create → Linode | Ubuntu 24.04 LTS | Cloud Firewalls (22, 80, 443) | Object Storage is S3-compatible |
| **OVHcloud** | VPS or Public Cloud instance | Ubuntu 24.04 | Edge firewall / security groups | VPS images may log you in as `ubuntu`: run the installer with `sudo -i` |
| **Scaleway** | Instances → Create | Ubuntu 24.04 (Noble) | Security groups (22, 80, 443) | Object Storage is S3-compatible |

## Install

```bash
$ ssh root@203.0.113.10            # or ubuntu@… then: sudo -i
$ wget -O - https://cipi.sh/setup.sh | bash
```

Then log in as `cipi` and follow [the main guide](/guides/deploy-laravel-ubuntu-vps) from step 4.

## Checklist for any provider

| Check | Why |
| --- | --- |
| Not a container product | Cipi manages the kernel firewall, swap and services |
| Public IPv4, not NAT-only | Let's Encrypt and visitors must reach the server |
| Reverse DNS set to your hostname | Helps deliverability of notification e-mail |
| Outbound 25 often blocked | Send mail through an SMTP provider on 587 |
| A second region or provider for backups | Point `cipi backup` at an S3-compatible bucket elsewhere |
