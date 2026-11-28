---
title: Block attackers automatically with CrowdSec on a Laravel server
description: What CrowdSec is and how it differs from Fail2ban and a WAF, enabling it safely on a Cipi server, the allowlists that keep you, your CDN and your Git provider from being banned, checking what it blocks, the break-glass rescue if you lock yourself out, and how to remove it.
category: security
order: 6
published: 2026-11-23
updated: 2026-11-25
howto: yes
keywords: crowdsec laravel, crowdsec nginx ubuntu, block bots laravel server, crowdsec vs fail2ban, crowdsec firewall bouncer, protect laravel from scanners
docs:
  - crowdsec
  - firewall
  - zero-trust
  - security-model
related:
  - cloudflare-zero-trust-laravel
  - laravel-security-checklist
  - hackly-security-scanning
faq:
  - What does CrowdSec do? | It reads your web and SSH logs, recognises attack behaviour (vulnerability scanners, credential stuffing, exploit probes, brute force), and a firewall "bouncer" drops traffic from those IPs. It also receives a community blocklist of IPs other users have seen attacking.
  - Do I still need Fail2ban? | Cipi keeps both. Fail2ban guards SSH logins; CrowdSec adds behaviour-based detection on web traffic and the shared blocklist. `sudo cipi ban list` shows bans from both.
  - Is it a WAF? | No. A WAF inspects each request and blocks bad ones; CrowdSec blocks IPs after it has seen bad behaviour. For request filtering, put Cloudflare in front ([guide](/guides/cloudflare-proxy-ssl-wildcard)).
  - Can it ban my own users? | It bans on behaviour, not on normal browsing. Shared IPs (offices, mobile carriers) can rarely be caught; allowlist known addresses with `sudo cipi crowdsec allow`.
  - I'm behind Cloudflare. Will it ban Cloudflare? | Cipi refuses to enable it behind a proxy until the real visitor IP is configured, which `sudo cipi zt enable` does. Then CrowdSec sees and bans real visitors, not Cloudflare.
  - How much memory does it need? | Cipi refuses below 512 MB of available RAM. On small servers, keep Fail2ban only.
  - Does it share my data? | CrowdSec's community blocklist works by sharing signals about attacking IPs with CrowdSec. Read their privacy terms; Cipi doesn't send your app data anywhere.
  - How do I remove it? | `sudo cipi crowdsec disable` flushes its firewall rules first, then removes it. Nothing is left blocking traffic.
---
Every public server is probed all day: bots looking for `/wp-login.php`, `.env` files, old admin panels, known exploits. They rarely get in, but they fill your logs and waste resources, and the occasional one finds something. **CrowdSec** spots that behaviour in your logs and blocks the source at the firewall, helped by a blocklist shared by its whole community. On Cipi it's one command, with guards so it can't lock you out.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Engine** | The CrowdSec service that reads logs and decides |
| **Scenario** | A pattern of bad behaviour, e.g. "many 404s on admin paths" |
| **Decision** | A ban on an IP, for a duration |
| **Bouncer** | The part that enforces decisions; here, the firewall |
| **Community blocklist** | IPs reported as attacking by many CrowdSec users |
| **Allowlist** | Addresses that must never be banned |

```flow
A bot probes your site | /.env, /wp-login.php, exploits
> Requests hit Nginx like any visitor and are written to each app's access log (`/home/*/logs/nginx-*.log`).
CrowdSec reads the logs | nginx, sshd, linux scenarios
> The engine matches the behaviour against scenarios from the nginx, sshd and linux collections.
A decision is made | ban the IP for a while
> When a scenario triggers, CrowdSec creates a decision: this IP is banned for a period.
The firewall bouncer drops it | before it reaches Nginx
> The firewall bouncer drops traffic from that IP at the network level: your apps never see it again.
The community learns | shared blocklist
> Known attackers reported by others are blocked on your server too, often before they try.
```

## Before you start {#before}

- A Cipi server with at least **512 MB of free RAM**.
- If the server is behind Cloudflare's proxy (orange cloud): run `sudo cipi zt enable` first. It configures the real visitor IP (and closes no ports). Without it, Cipi refuses to enable CrowdSec, to avoid banning Cloudflare.
- Note your own public IP (`curl -s ifconfig.me` from your laptop) and any office or CI addresses.

## 1. Enable it {#enable}

```bash
$ ssh cipi@YOUR_SERVER
$ sudo cipi crowdsec enable
$ sudo cipi crowdsec status
```

| What `enable` does | Why |
| --- | --- |
| Installs the engine and the firewall bouncer | Detection plus enforcement |
| Allowlists your current SSH session's IP first | You can't ban yourself while enabling |
| Allowlists Let's Encrypt, localhost, private ranges | Certificates keep renewing |
| Allowlists GitHub, Bitbucket and GitLab webhook ranges (refreshed weekly) | Push-to-deploy keeps working |
| Starts a small rescue listener | A way back in if you're ever banned (step 4) |
| Installs the nginx, sshd and linux collections | The scenarios that matter on a web server |

## 2. Allow the addresses you trust {#allow}

```bash
$ sudo cipi crowdsec allow 203.0.113.42      # office
$ sudo cipi crowdsec allow 198.51.100.7      # CI runner, uptime monitor
```

Remove one with `sudo cipi crowdsec unallow <ip>`. Allowlist monitors and CI that hit the site often, or run security scans against it (for example [Hackly](/guides/hackly-security-scanning)'s scanner IP).

## 3. See what it blocks {#watch}

```bash
$ sudo cipi crowdsec status        # engine, bouncer, rescue, active decisions
$ sudo cipi ban list               # banned IPs, CrowdSec and Fail2ban together
$ sudo cipi ban unban 192.0.2.10   # lift a ban everywhere at once
```

Within a day you'll usually see bans for scanners that probed paths your apps don't have. With the [web panel](/docs/firewall#panel) (Cipi 5.14.0+), the server's Firewall tab shows the same list, CrowdSec's decisions and Fail2ban's bans together, each with *Unban*, and edits the allowlist.

## 4. If you ban yourself: the rescue {#rescue}

Changed network and can't reach the server any more? Cipi prepared a way back:

```bash
# print it now, store it OFF the server (password manager)
$ sudo cipi crowdsec rescue token
```

```flow
You're banned | SSH and site unreachable
> Your new IP triggered a ban (or a typo'd password did, in Fail2ban).
Run the saved curl | from where you are
> The command calls a small TLS listener on a high port that stays open even while you're banned.
Your IP is allowlisted | bans lifted
> It allowlists the IP the request comes from (never a header), and lifts its bans in CrowdSec and Fail2ban.
A new token is mailed | old one dies
> Each token works once. A fresh one is e-mailed to you, so print and store it again.
```

The rescue grants nothing except the ability to connect again; wrong tokens are throttled. `sudo cipi crowdsec rescue rotate` makes a new token at any time. The provider's web console is always the last resort.

## 5. Remove it {#disable}

```bash
$ sudo cipi crowdsec disable
```

Firewall rules are flushed **before** the packages are removed, so nothing stays blocking.

## Your defence layers {#layers}

| Layer | Stops | On Cipi |
| --- | --- | --- |
| Firewall (UFW) | Everything except 22, 80, 443 | Always on |
| Fail2ban | SSH password guessing | Always on |
| CrowdSec | Scanners, probes, known attackers on the web | `sudo cipi crowdsec enable` |
| Cloudflare proxy / Zero Trust | Bad requests before they reach you; closed ports | [Zero Trust guide](/guides/cloudflare-zero-trust-laravel) |
| Patching | Known vulnerabilities in PHP and Nginx | Nightly ([CVE case study](/guides/php-nginx-cve-patching)) |
| Your code | App-level bugs | [Checkpoint](/guides/checkpoint-laravel-sast-ci), [Hackly](/guides/hackly-security-scanning) |

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `enable` refused: proxy without real IP | `sudo cipi zt enable` first (it closes nothing) |
| `enable` refused: not enough RAM | Free memory or keep Fail2ban only |
| A colleague is banned | `sudo cipi ban unban <ip>`, then `sudo cipi crowdsec allow <ip>` |
| Uptime monitor shows outages | Allowlist the monitor's IPs |
| Git pushes stopped deploying | Run `sudo cipi crowdsec refresh` to update webhook ranges; check `sudo cipi ban list` |
| You're locked out | Rescue curl (step 4), or the provider's web console |
