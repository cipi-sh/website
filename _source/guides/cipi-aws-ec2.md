---
title: Install Cipi on AWS EC2
description: Launch an AWS EC2 instance for Laravel step by step (Ubuntu AMI, instance type, gp3 storage, security group, Elastic IP), install Cipi, point DNS, and connect S3, SES and CodeCommit.
category: providers
order: 1
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel aws ec2, deploy laravel ec2, ec2 ubuntu laravel server, laravel forge alternative aws
related:
  - cipi-aws-lightsail
  - deploy-laravel-ubuntu-vps
  - backup-vps-s3
faq:
  - Which instance size? | Start with 2 GB of RAM (for example a t3.small) for one or two apps; add RAM before CPU when you add Octane, Meilisearch or more apps.
  - Can I use RDS or S3? | Yes. Point an app's `DB_*` variables at RDS if you prefer a managed database, and use S3 as the destination for `cipi backup`.
  - Why can't I send e-mail from the instance? | AWS restricts outbound port 25 by default. Use SES (or another SMTP provider) on port 587 for the app and for Cipi's notifications.
  - Can I use Graviton (ARM) instances? | Choose x86 to be safe: parts of the stack, such as the AWS CLI used for S3 backups, are installed as x86_64 builds.
  - Does Cipi need root? | Only to install. The installer runs as root (or with `sudo -i`), then disables root login; you work as `cipi` with `sudo cipi …`.
  - Can I resize the server later? | Yes. Resizing at the provider keeps the disk; Cipi adapts. To change provider or region, move apps with `cipi sync`.
docs:
  - installation
  - firewall
  - backups
  - notifications
---
EC2 gives you a full virtual machine, which is exactly what Cipi needs. This walkthrough uses the AWS console; the same settings work from Terraform or the CLI.

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

```flow
Launch | Ubuntu 24.04 LTS | #launch
Security group | 22, 80, 443 | #ports
Elastic IP | stable public address | #elastic-ip
Install | one command | #install
DNS | A record → Elastic IP | #dns
```

## 1. Launch the instance {#launch}
In **EC2 → Launch instance**:

| Setting | Choose |
| --- | --- |
| AMI | **Ubuntu Server 24.04 LTS** (or 26.04 LTS), from Canonical |
| Instance type | 2 GB RAM or more to be comfortable |
| Key pair | Your existing key, or create one and download it |
| Storage | 30 GB gp3 or more (releases, logs and local backups live here) |
| Network | A public subnet, **Auto-assign public IP** on |

## 2. Open the ports {#ports}
Create a security group with inbound rules:

| Port | Source | For |
| --- | --- | --- |
| 22 (SSH) | Your IP, or anywhere if you'll rely on Cipi's fail2ban and keys | Administration |
| 80 (HTTP) | Anywhere (IPv4 and IPv6) | Let's Encrypt validation, redirects |
| 443 (HTTPS) | Anywhere (IPv4 and IPv6) | Your apps |

Cipi also runs its own firewall (UFW) on the instance; the two layers don't conflict.

## 3. Attach an Elastic IP {#elastic-ip}
**EC2 → Elastic IPs → Allocate**, then **Associate** it with the instance. The public IP of an instance changes on stop/start; your DNS shouldn't.

## 4. Install Cipi {#install}
EC2 logs you in as `ubuntu` (a sudo user), not root:

```bash
$ ssh -i ~/Downloads/my-key.pem ubuntu@203.0.113.10
$ sudo -i
$ wget -O - https://cipi.sh/setup.sh | bash
```

When the installer asks for your SSH public key, paste the **public** half of the key you'll use from now on (`cat ~/.ssh/id_ed25519.pub` on your laptop). After the install you log in as `cipi`:

```bash
$ ssh cipi@203.0.113.10
$ sudo cipi status
```

## 5. Point DNS and create the first app {#dns}
Create an `A` record (Route 53 or your DNS provider) for your domain to the Elastic IP, then follow [Deploy Laravel on an Ubuntu VPS](/guides/deploy-laravel-ubuntu-vps) from step 4.

## AWS services that fit well

| Need | Use |
| --- | --- |
| Off-site backups | An S3 bucket as destination: `sudo cipi backup configure` ([guide](/guides/backup-vps-s3)) |
| Outgoing mail | Amazon SES SMTP credentials in the app's `.env` |
| Code on AWS | CodeCommit works with Cipi's automatic deploy keys |
| Snapshots of the whole disk | EBS snapshots, on top of Cipi's database and file backups |

> [!tip] Outbound port 25 is restricted on EC2 by default. Use SES or another provider on port 587 for app mail and for Cipi's [notifications](/docs/notifications).

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Installer stops: container detected | You picked a container product (LXC/OpenVZ): choose a KVM virtual machine |
| Installer stops: unsupported OS | Use a plain Ubuntu 24.04 or 26.04 LTS image, not a marketplace app |
| `Permission denied (publickey)` after the install | Log in as `cipi`, not `root` or `ubuntu`, with the key you pasted in the installer |
| Certificate fails | Port 80 closed in the provider firewall, or DNS not pointing at the server yet |
| Site unreachable on 443 | Add 443 to the provider firewall (IPv4 and IPv6) |
| Notification e-mail never arrives | Port 25 is blocked by most providers: use an SMTP service on 587 |
