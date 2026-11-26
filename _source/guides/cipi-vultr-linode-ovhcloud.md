---
title: Cipi on Vultr, Akamai Linode, OVHcloud and Scaleway
description: Install Cipi on Vultr, Akamai Linode, OVHcloud, Scaleway or any provider: what to choose, provider by provider, a checklist for unknown providers, and fixes for the usual first-day problems.
category: providers
order: 5
published: 2026-11-23
updated: 2026-11-26
howto: yes
keywords: laravel vultr, laravel linode, laravel ovhcloud vps, laravel scaleway, install cipi
related:
  - cipi-hetzner
  - cipi-digitalocean
  - deploy-laravel-ubuntu-vps
docs:
  - installation
  - firewall
  - backups
faq:
  - Will Cipi work on my provider? | If it gives you a full virtual machine with Ubuntu 24.04 or 26.04, a public IPv4 and ports 22, 80 and 443, yes. The installer explains what's missing otherwise.
  - Dedicated servers? | Yes, with Ubuntu 24.04 or 26.04 installed. Cipi doesn't need virtualization, just a full kernel of its own.
  - Does Cipi need root? | Only to install. The installer runs as root (or with `sudo -i`), then disables root login; you work as `cipi` with `sudo cipi …`.
  - Can I resize the server later? | Yes. Resizing at the provider keeps the disk; Cipi adapts. To change provider or region, move apps with `cipi sync`.
  - What if a step fails? | Read the troubleshooting table above first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community. Most commands print the fix when they refuse something.
  - Do I need the web panel for this? | No. Every step works from the CLI. The optional [web panel](/web-panel) shows the same things in a browser.
  - Can I run these commands from my laptop? | Many of them, through [cipi-cli](/docs/cli-client) and the [API](/api), with a scoped token. Otherwise `ssh cipi@your-server` and use `sudo cipi …`.
---
Any provider works as long as you get a **full virtual machine** (KVM or similar) with **Ubuntu 24.04 or 26.04**, a **public IPv4** and ports **22, 80 and 443** reachable. The installer checks the environment and stops with an explanation inside containers (LXC, OpenVZ).

| Provider | Create | Image | Firewall | Notes |
| --- | --- | --- | --- | --- |
| **Vultr** | Deploy → Cloud Compute | Ubuntu 24.04 LTS x64 | Network → Firewall group (22, 80, 443) | Object Storage is S3-compatible for backups |
| **Akamai Linode** | Create → Linode | Ubuntu 24.04 LTS | Cloud Firewalls (22, 80, 443) | Object Storage is S3-compatible |
| **OVHcloud** | VPS or Public Cloud instance | Ubuntu 24.04 | Edge firewall / security groups | VPS images may log you in as `ubuntu`: run the installer with `sudo -i` |
| **Scaleway** | Instances → Create | Ubuntu 24.04 (Noble) | Security groups (22, 80, 443) | Object Storage is S3-compatible |

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

> [!tip] **From the web panel.** With the optional [web panel](/web-panel) (cipi/gui 4.8.0+), the **Vultr**, **Akamai (Linode)** and **OVHcloud** connectors (and Scaleway, Contabo, UpCloud) list your servers with each Cipi server named, with their power actions, firewalls, snapshots, IPs and DNS. See [Connectors](/docs/gui-connectors#vultr).

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Installer stops: container detected | You picked a container product (LXC/OpenVZ): choose a KVM virtual machine |
| Installer stops: unsupported OS | Use a plain Ubuntu 24.04 or 26.04 LTS image, not a marketplace app |
| `Permission denied (publickey)` after the install | Log in as `cipi`, not `root` or `ubuntu`, with the key you pasted in the installer |
| Certificate fails | Port 80 closed in the provider firewall, or DNS not pointing at the server yet |
| Site unreachable on 443 | Add 443 to the provider firewall (IPv4 and IPv6) |
| Notification e-mail never arrives | Port 25 is blocked by most providers: use an SMTP service on 587 |
