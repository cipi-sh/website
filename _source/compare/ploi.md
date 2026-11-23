---
title: "Cipi vs Ploi"
description: "Cipi is a free, self-hosted alternative to Ploi.io for Laravel and PHP: zero-downtime deploys, an optional self-hosted panel, cipi.yml, MCP and nightly patching, with no plan limits."
lead: "Both manage your VPS for Laravel and PHP. Ploi is an EU-based SaaS with tiered plans; Cipi is free software on the server itself."
name: Ploi
site: https://ploi.io
kind: SaaS server panel
family: panel
price: "€8–30/mo by server count"
updated: 2026-11-23
keywords: ploi alternative, ploi.io alternative free, self-hosted ploi
choose_cipi:
  - You want no per-server or per-plan pricing at all
  - You want the control plane and its data on your own server
  - You want server config versioned with `cipi.yml`
choose_them:
  - You want a hosted dashboard that also creates servers for you
  - You prefer an EU-hosted SaaS with support
---
## At a glance {#glance}

| | Cipi | Ploi |
| --- | --- | --- |
| Price | Free | Free tier (1 server, 5 deploys/month), then €8, €13 or €30/month by number of servers |
| Where it runs | On your own VPS; no external control plane | ploi.io (SaaS, Netherlands) |
| Limits | None | Servers per plan; deploys on the free tier |
| Zero-downtime deploys | Yes | Yes |
| Server settings in Git | `cipi.yml` | Dashboard settings and deploy scripts |
| Web dashboard | Optional, self-hosted | Yes, hosted |
| AI assistants (MCP) | Two built-in MCP servers, on your server | Hosted MCP server |
| API | REST API on each server | REST API with plan-based rate limits |
| Server provisioning on clouds | You create the VPS | Connects DigitalOcean, Hetzner, AWS, Vultr and more |

## Where they differ {#differ}

Ploi is a well-made, Forge-like SaaS based in the Netherlands, with a free tier and plans priced by server count, plus an MCP server for AI clients. Cipi gives you the same day-to-day jobs (deploys, queues, SSL, databases, backups, monitoring) with no plan at all, because it runs on the server you already pay for.

The trade-off is creation: Ploi can create servers at your cloud provider; with Cipi you create the VPS and run one command. Not to be confused with [Ploi Cloud](/alternative-to-ploi-cloud), a separate PaaS.

## Moving to Cipi {#move}

```flow
New VPS | Ubuntu 24.04 or 26.04
Install | one command
Create apps | same repos, same domains
Copy data | database dump and storage
Switch DNS | then issue certificates
```

Install Cipi on a fresh server, recreate each app with `cipi app create` (same repository and domain), import the database with `cipi db restore`, copy `storage/`, deploy, then move DNS and run `cipi ssl install`. Already on Cipi elsewhere? [`cipi sync`](/guides/migrate-server-cipi-sync) moves apps between servers in one command.
