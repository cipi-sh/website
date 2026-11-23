---
title: VPS, SSH and DNS for Laravel developers who never ran a server
description: The words and the three skills you need before deploying to your own server, explained from zero: what a VPS is, choosing one, creating an SSH key, logging in, pointing a domain with DNS records, checking it worked, and what Cipi takes care of so you don't have to.
category: start
order: 1
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: what is a vps, ssh key for beginners, point domain to server, dns a record tutorial, first vps laravel, ssh ed25519 key mac windows
docs:
  - installation
  - ssh-keys
  - domains
  - firewall
related:
  - deploy-laravel-ubuntu-vps
  - cipi-hetzner
  - cipi-digitalocean
faq:
  - Do I need to know Linux? | Very little. You need to log in with SSH and paste commands. Cipi does the system administration: packages, firewall, users, PHP, Nginx, certificates, patches.
  - How big a server do I need? | For one or a few Laravel apps, 2 vCPU and 4 GB of RAM is comfortable. 2 GB works for a small app. You can resize later at most providers.
  - Is a VPS secure? | It's as secure as its configuration. Cipi sets key-only SSH, a firewall with only 22, 80 and 443 open, Fail2ban, automatic security patches and one isolated user per app.
  - What if I lose my SSH key? | Keep a second key (another laptop) or use the provider's web console to add a new one. That's why Cipi refuses to remove your last key.
  - How long does DNS take? | Usually minutes. Some networks cache old answers for up to the record's TTL (often an hour). Use `dig` to check what the world sees.
  - Is a VPS cheaper than a PaaS? | Usually much cheaper for the same resources, with no per-seat or per-app fees. You pay the provider; Cipi is free.
---
Deploying to your own server sounds harder than it is. You need three skills: **get a server**, **log in with SSH**, and **point a domain at it**. This guide explains each from zero, then hands over to the [first deploy guide](/guides/deploy-laravel-ubuntu-vps).

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **VPS** | A virtual private server: a slice of a physical machine you rent by the hour or month, with its own IP and full control |
| **Ubuntu LTS** | The Linux version Cipi runs on (24.04 or 26.04). LTS = 5 years of security updates |
| **IP address** | The server's number on the internet, e.g. `203.0.113.10` |
| **SSH** | An encrypted way to log in and type commands on the server |
| **SSH key** | A pair of files: the private one stays on your laptop, the public one goes on the server. Safer than a password |
| **DNS** | The internet's phonebook: turns `shop.example.com` into an IP |
| **A record** | A DNS entry: "this name → this IPv4 address" |

```flow
Your laptop | SSH key
> You create an SSH key on your laptop. The private half never leaves it.
VPS | Ubuntu, public IP
> You rent a VPS with Ubuntu LTS and a public IP, giving the provider your public key.
Cipi | installs the stack
> One command installs Cipi and the whole stack.
Domain | A record → IP
> At your DNS provider, an `A` record points your domain at the server's IP.
Visitors | https://shop.example.com
> Visitors reach your app over HTTPS.
```

## 1. Choose a server {#vps}

| Need | Pick |
| --- | --- |
| Best price in Europe | [Hetzner](/guides/cipi-hetzner) |
| Simple, worldwide | [DigitalOcean](/guides/cipi-digitalocean), [Vultr, Linode, OVHcloud](/guides/cipi-vultr-linode-ovhcloud) |
| Already on AWS | [Lightsail](/guides/cipi-aws-lightsail) or [EC2](/guides/cipi-aws-ec2) |

| Setting | Choose |
| --- | --- |
| Image | Ubuntu 24.04 LTS or 26.04 LTS, nothing pre-installed |
| Size | 2 vCPU, 4 GB RAM for a comfortable start |
| Region | Close to your users |
| Login | Your SSH key (next step) |

## 2. Create an SSH key {#key}

On macOS, Linux or Windows (PowerShell), the same command:

```bash
$ ssh-keygen -t ed25519 -C "you@laptop"
# press Enter for the default path, then choose a passphrase
$ cat ~/.ssh/id_ed25519.pub
ssh-ed25519 AAAAC3Nza… you@laptop
```

```tree
~/.ssh/
  id_ed25519        ← private: never share, never upload
  id_ed25519.pub    ← public: paste it into the provider
```

Paste the **public** line into the provider's "SSH keys" field when you create the server.

## 3. Log in {#login}

```bash
$ ssh root@203.0.113.10
```

The first time, SSH asks whether you trust the server's fingerprint: type `yes`. You're in when the prompt changes to `root@…`. Now install Cipi ([installation](/docs/installation)):

```bash
$ wget -O - https://cipi.sh/setup.sh | bash
```

Early on, the installer asks for the public key that will open the `cipi` user: paste the same `id_ed25519.pub` line (you can add a second machine's key too). After the install, root login is disabled. From then on you log in as `cipi`:

```bash
$ ssh cipi@203.0.113.10
```

Make it shorter with an entry in `~/.ssh/config`:

```text
Host shop
  HostName 203.0.113.10
  User cipi
```

Then `ssh shop` is enough.

## 4. Point your domain {#dns}

At your registrar or DNS provider (Cloudflare, Namecheap, OVH…), add:

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| A | `shop` (or `@` for the bare domain) | `203.0.113.10` | Auto / 300 |
| A | `www` | `203.0.113.10` | Auto / 300 |
| AAAA | same names | the server's IPv6, if it has one | Auto |

Check it from your laptop:

```bash
$ dig +short shop.example.com
203.0.113.10
```

On Cloudflare, keep the cloud **grey** ("DNS only") until the certificate is issued, then you can turn the proxy on with SSL/TLS **Full (strict)**.

## 5. What Cipi does for you {#cipi}

| Job | Without Cipi | With Cipi |
| --- | --- | --- |
| Install Nginx, PHP, MariaDB, Valkey, Supervisor | Hours of setup | One command |
| Firewall, Fail2ban, key-only SSH | Easy to get wrong | On by default |
| One user, database and pool per app | Rarely done | Every app |
| HTTPS certificates and renewals | certbot by hand | `cipi ssl install` |
| Security patches | Remember to log in | Nightly, automatic |
| Deploys with rollback | Scripts | `cipi deploy`, on push |

Next: [deploy your first Laravel app](/guides/deploy-laravel-ubuntu-vps).

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `Permission denied (publickey)` | Wrong user or key: `ssh -i ~/.ssh/id_ed25519 cipi@IP`; check the key was added at creation |
| `Connection timed out` | Wrong IP, or the provider's firewall blocks 22: allow 22, 80, 443 |
| `REMOTE HOST IDENTIFICATION HAS CHANGED` | You rebuilt the server: `ssh-keygen -R 203.0.113.10` |
| `dig` shows nothing or an old IP | Record not saved or still cached: wait the TTL, check the name |
| Browser shows the provider's parking page | DNS still points at the registrar: change the A record |
