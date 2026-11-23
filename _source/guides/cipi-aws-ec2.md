---
title: Install Cipi on AWS EC2
description: Launch an Ubuntu 24.04 EC2 instance, open the right ports in the security group, attach an Elastic IP and install Cipi to host Laravel and PHP apps on AWS.
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
---
EC2 gives you a full virtual machine, which is exactly what Cipi needs. This walkthrough uses the AWS console; the same settings work from Terraform or the CLI.

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
