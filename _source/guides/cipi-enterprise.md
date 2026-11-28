---
title: "Cipi in the enterprise: where it fits, what it gives, what to add"
description: "Isolation, SSO, scoped API tokens, a tamper-evident deploy ledger, ISO 27001 and SOC 2 evidence, data that stays where you put it: when a larger organisation should run Laravel on Cipi, what to build around it, and how to roll it out."
lead: "Large organisations run more Laravel than they think: back-offices, portals, internal tools, client projects. Cipi gives them a standard, auditable way to host it on infrastructure they choose, without a vendor in the path."
category: strategy
order: 3
published: 2026-11-24
updated: 2026-11-24
keywords: laravel enterprise hosting, self-hosted laravel enterprise, iso 27001 laravel server, soc 2 evidence server, data sovereignty laravel, laravel sso panel
related:
  - vps-vs-kubernetes-vs-managed-paas
  - open-source-licences
  - laravel-security-checklist
faq:
  - Is there a commercial support contract? | Cipi is MIT-licensed open source without a paid support desk. Enterprises typically pair it with an internal platform owner or a local partner who knows Linux and Laravel. See [what to add](#gaps).
  - Does Cipi have a SOC 2 report or an ISO 27001 certificate? | Certifications apply to organisations and services, and Cipi is software you run. What it gives you is evidence for **your** controls: `sudo cipi compliance report` maps checks to ISO 27001:2022 Annex A and SOC 2.
  - Can it run on-premises? | On full virtual machines or bare metal (KVM, VMware, Hyper-V, Xen HVM) with Ubuntu 24.04 or 26.04, a public IPv4 address and ports 22, 80 and 443 reachable. Cloudflare Zero Trust can later close those ports to the internet.
  - Does it support SAML? | The panel supports OpenID Connect (Microsoft Entra ID, Okta, Google Workspace, Keycloak, Authentik, Zitadel, Auth0). SAML isn't supported.
  - Can we restrict what developers and AI assistants can do? | Yes: per-server and per-app roles in the panel, API tokens limited to listed abilities with an expiry date, an IP allowlist for the API, and MCP tools that inherit the token's abilities.
  - Where do our logs go? | They stay on the server with fixed retention (90 days for logs with IP addresses, 12 months for application and security logs). Forward syslog to your SIEM; the deploy ledger is already written there.
  - What happens if the Cipi project stops? | Your servers keep running: nothing depends on a Cipi service. The code is MIT, so it can be forked, and the server is standard Ubuntu any administrator can take over.
docs:
  - security-model
  - compliance
  - deploy-audit
  - gui-sso
  - api
---
Enterprises usually meet Laravel through the side door: a Filament back-office here, a customer portal there, an agency delivering a project that now has to be hosted somewhere approved. Each lands on whatever the team found first. Cipi offers a **standard way** to host all of them, on infrastructure the organisation chooses, with the controls an auditor asks about built in.

## In 30 seconds {#summary}

| Cipi fits when | Look elsewhere when |
| --- | --- |
| You host Laravel and PHP apps on VMs you control (cloud, local provider, your own data centre) | You need autoscaling and multi-zone failover as a managed service |
| Data must stay in a given country, provider or network | Your standard is containers on Kubernetes for everything |
| You want one fixed infrastructure cost and no per-seat or per-server licence | You need a vendor contract with an SLA and a support desk |
| Auditors ask for evidence on access, changes, patching and backups | SAML-only identity, or an OS other than Ubuntu LTS, is a hard requirement |

```flow
Why | sovereignty, cost | #why
Fit | use cases | #fit
Controls | for auditors | #controls
Gaps | what to add | #gaps
Vendor Q&A | procurement | #questionnaire
Roll-out | pilot to fleet | #rollout
Cost | what you pay | #cost
```

## Why enterprises look at self-hosting again {#why}

| Driver | What it means for hosting |
| --- | --- |
| **Data sovereignty** | Privacy law, sector rules (finance, health, public sector) and customer contracts increasingly specify *where* data lives and *who* can reach it. A server you choose, in a region you choose, with no third-party control plane, is the simplest answer |
| **Regulation of ICT risk** | Frameworks such as NIS2 and, for financial entities, DORA ask organisations to manage risks from their ICT suppliers. Every SaaS in the deploy path is one more supplier to assess |
| **Cost control** | Per-seat and usage-based tools grow with headcount and traffic. A fixed VPS price and a free tool don't ([the numbers](/guides/vps-vs-kubernetes-vs-managed-paas#tests)) |
| **Vendor risk** | Price changes, licence changes, acquisitions and outages at a vendor become your problem. An open source tool with no service behind it removes that dependency ([licences](/guides/open-source-licences)) |
| **Shadow IT** | Teams that can't get hosting quickly will find it themselves. A standard, approved path is the cure |

## Where Cipi fits {#fit}

| Use case | How Cipi is used |
| --- | --- |
| **Internal tools and back-offices** | Many Laravel/Filament apps on a few servers, each isolated, behind SSO or [Cloudflare Access](/guides/cloudflare-zero-trust-laravel) |
| **Customer portals and APIs** | Production on dedicated servers, staging on shared ones, deploys from CI through scoped tokens |
| **Agency and supplier projects** | The supplier pushes to Git; the organisation owns the server, the data and the deploy history |
| **Regulated data** | Servers in the required country or provider; backups encrypted on the server before they leave, to a bucket you choose |
| **Business units with their own budgets** | One server (or more) per unit, all visible in one panel with roles |
| **Legacy PHP next to Laravel** | WordPress, Symfony and other PHP as isolated [custom apps](/docs/custom-apps), patched like the rest |

## The controls auditors ask about {#controls}

What Cipi does out of the box, grouped the way security questionnaires and ISO 27001 / SOC 2 audits group it:

| Area | What Cipi provides |
| --- | --- |
| **Identity and access** | Key-only SSH for the admin user, root login off, alerts on logins and `sudo`. Panel with [SSO over OpenID Connect](/docs/gui-sso) (Entra ID, Okta, Google Workspace, Keycloak…), two-factor, roles per server (View, Manage) and per app (View, Deploy, Edit, Environment, Logs, Commands, Delete), single-use invite links |
| **Least privilege for automation** | [API tokens](/docs/api#tokens) with listed abilities (`deploy-manage` alone deploys) and expiry dates, behind an [IP allowlist](/docs/api#cipi-api-ip-whitelist). The API calls an allowlist of `cipi` commands through sudo; destructive host operations stay on the CLI |
| **Segregation** | Each app is its own Linux user (home `750`), PHP-FPM pool with `open_basedir`, database user and Valkey instance. A compromised app can't read the others |
| **Change management** | Server settings in [`cipi.yml`](/cipi-yml), reviewed in pull requests, planned and applied all or nothing. A repository can't raise its own disk limit or touch another app's backups |
| **Audit trail** | A [hash-chained deploy ledger](/docs/deploy-audit): every deploy, rollback and failure, with origin (CLI, panel, webhook, CI, AI agent, SSH), operator, IP and commit, verified by root and copied to syslog |
| **Vulnerability management** | Ubuntu security updates daily; PHP, Nginx, databases and Valkey patched nightly, one service at a time; optional ClamAV scans and CrowdSec; [Hackly](/guides/hackly-security-scanning) and [Checkpoint](/guides/checkpoint-laravel-sast-ci) for the code |
| **Network** | UFW allowing 22, 80 and 443 only, Fail2ban, optional [Cloudflare Zero Trust](/docs/zero-trust) that closes the origin's ports entirely |
| **Secrets** | Configuration, tokens and passwords encrypted at rest (AES-256), readable by root only; backups and sync archives encrypted before they leave |
| **Backup and recovery** | [Backup profiles](/docs/backups) to any S3-compatible storage, encrypted, verified, with staleness alerts; warm standby servers with [`sudo cipi sync`](/docs/sync) |
| **Monitoring** | Server monitor and health checks with alerts to e-mail, Slack, Discord, Google Chat, Telegram, signed webhooks and more; [metrics](/guides/cipi-metrics-server-app-uptime) kept by the minute; OpenMetrics for your Prometheus |
| **Privacy** | Fixed [log retention](/docs/log-retention): logs with IP addresses 90 days, application and security logs 12 months; [anonymized database dumps](/docs/anonymizer) for developers |
| **Evidence** | [`sudo cipi compliance report`](/docs/compliance): 17 controls checked read-only and mapped to ISO 27001:2022 Annex A and SOC 2, with raw evidence and checksums |

```bash
$ sudo cipi compliance                    # pass / warn / fail per control
$ sudo cipi compliance report --days=365  # bundle for the auditor
$ sudo cipi compliance controls           # mapping to ISO 27001 and SOC 2
$ sudo cipi deploy shop --audit --days=365 --json
```

> [!tip] Record the checksum of each compliance bundle **outside** the server (a ticket, the GRC tool). It proves later that the bundle wasn't altered.

## What to add around it {#gaps}

Being honest about the gaps is what makes a rollout succeed:

| Gap | How enterprises fill it |
| --- | --- |
| **No vendor support or SLA** | Name an internal platform owner (two, for holidays) and keep a runbook; or contract a local partner who knows Linux and Laravel. The stack is standard, so any experienced Linux administrator can work on it |
| **No autoscaling or clustering** | Size servers for peak; split heavy apps onto their own servers; keep a warm standby with `sudo cipi sync`; put critical data on a managed database if you need automatic failover |
| **Logs stay on the server** | Forward syslog to the SIEM (Splunk, Elastic, Microsoft Sentinel) with your usual agent; the compliance report checks that forwarding is configured |
| **OIDC, not SAML** | Most identity providers offer OIDC next to SAML for the same users (Entra ID, Okta, Google Workspace) |
| **Ubuntu LTS only** | Treat it as an appliance OS: Ubuntu 24.04 or 26.04 on full VMs, nothing else installed by hand |
| **Public IPv4 needed** | Required for certificates and webhooks; after setup, [`sudo cipi zt lock`](/docs/zero-trust) closes 22, 80 and 443 to the internet and traffic arrives through a Cloudflare Tunnel |
| **Certifications for the tool itself** | Your controls are audited, not the tool. Use a certified infrastructure provider for the VMs and `sudo cipi compliance` for the evidence on top |

## Answers for the vendor questionnaire {#questionnaire}

Procurement and security teams ask the same questions of every supplier. For Cipi:

| Question | Answer |
| --- | --- |
| Does the software send data to the vendor? | No. No telemetry, no account, no control plane. Alerts and backups go only to destinations you configure |
| Where is data stored? | On your servers, and in the backup buckets you choose. Backups are encrypted on the server before upload |
| Who can access the servers? | Your accounts only: SSH keys you add, panel users you invite, tokens you create |
| Licence and cost? | MIT for every component; no licence fee, no per-seat or per-server pricing |
| Is the source available? | Yes, all of it, on [GitHub](https://github.com/cipi-sh). What runs as root is readable on the server |
| How are vulnerabilities reported and fixed? | Private reports through GitHub's vulnerability reporting ([security.txt](https://cipi.sh/.well-known/security.txt)); fixes ship in the latest release, installed with `sudo cipi self-update` |
| How are changes documented? | A detailed [changelog](https://github.com/cipi-sh/cipi/blob/master/CHANGELOG.md) per release, with the tests each release adds |
| What if the project is discontinued? | Servers keep working without it; the code can be forked; the server is standard Ubuntu |
| Can we exit? | Yes: apps are ordinary Laravel apps, data is in standard MariaDB, MySQL or PostgreSQL, files in standard directories |

## Roll it out in five steps {#rollout}

```flow
Pilot | one real, non-critical app
> Pick an internal tool with real users but limited impact. Install Cipi on a fresh VM, deploy it, run it for a month. Measure deploy time, incidents and hours spent.
Baseline | the golden server
> Write down the standard: Ubuntu version, VM size, Cipi version, backup destination and profiles, notification channels, CrowdSec on or off, Zero Trust on or off. Script it: `wget -O - https://cipi.sh/setup.sh | SSH_PUBKEY="…" bash`, then the same `cipi` commands every time.
Guardrails | access and change rules
> Panel with SSO and roles; API tokens per pipeline with only the abilities they need and an expiry date; branch protection on repositories with `cipi.yml`; `sudo cipi yml auto` only where pushing to main is already controlled.
Evidence | from day one
> Schedule `sudo cipi compliance --json` (exit 1 on any failure) and a monthly `sudo cipi compliance report`; forward syslog; keep the bundles' checksums in your GRC tool.
Scale | the fleet
> Add servers per business unit or per environment, all in one panel. Use cipi-cli profiles and the PHP SDK for automation, and `sudo cipi sync` to rebalance or move providers.
```

## What it costs {#cost}

| Line | Cost |
| --- | --- |
| Cipi, panel, API, CLI, SDK, WHMCS module | €0, MIT |
| Servers | Your VM or VPS prices, fixed |
| Backup storage | Your S3-compatible bucket |
| People | The platform owner's time: routine work (patching, renewals, backups, alerts) is automated; incidents, upgrades you schedule and onboarding remain |

The comparison that matters is not "free versus paid", but **fixed infrastructure plus some owned time** against **subscriptions, usage and supplier risk**. The [VPS, Kubernetes or managed platform](/guides/vps-vs-kubernetes-vs-managed-paas) guide shows how to put numbers on it.
