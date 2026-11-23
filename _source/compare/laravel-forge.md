---
title: "Cipi vs Laravel Forge"
description: "Cipi is a free, self-hosted alternative to Laravel Forge: zero-downtime Laravel deploys, an optional web panel, cipi.yml, MCP for AI assistants and nightly security patching, with no subscription."
lead: "Both deploy Laravel to a VPS with zero downtime. Forge is a polished SaaS from the Laravel team; Cipi is free software that lives on the server it manages."
name: Laravel Forge
site: https://forge.laravel.com
kind: SaaS server panel
family: panel
price: "from $12/mo per account"
updated: 2026-11-23
keywords: laravel forge alternative, free forge alternative, self-hosted laravel forge
choose_cipi:
  - You want to stop paying for the panel and keep everything on your own server
  - You want server settings reviewed in pull requests with `cipi.yml`
  - You want AI assistants to operate apps safely through MCP
  - You need EU data sovereignty with no third-party processor
choose_them:
  - You want servers created for you on cloud providers from a dashboard
  - You prefer a hosted product with commercial support from the Laravel team
  - Your team never wants to touch a terminal
faq:
  - Is Cipi a drop-in replacement for Forge? | For running Laravel on your own servers, yes: zero-downtime deploys, queues, scheduler, SSL, databases, backups and a web panel. The difference is that you create the VPS yourself at your provider.
  - Can I try Cipi without leaving Forge? | Yes. Install Cipi on a new VPS, deploy a staging copy of an app, and compare.
---
## At a glance {#glance}

| | Cipi | Laravel Forge |
| --- | --- | --- |
| Price | Free | Hobby $12, Growth $19, Business $39 per month (account plans) |
| Where it runs | On your own VPS; no external control plane | forge.laravel.com (SaaS) |
| Server provisioning on clouds | You create the VPS; Cipi installs everything | Creates servers on major clouds and on Laravel VPS |
| Zero-downtime deploys | Yes, atomic releases with rollback | Yes |
| Server settings in Git | `cipi.yml`, planned and applied | Deploy script in the dashboard |
| Web dashboard | Optional, self-hosted, multi-server, roles and SSO | Yes, hosted |
| CLI and API | Full CLI, REST API, cipi-cli, PHP SDK | API and CLI |
| AI assistants (MCP) | Two built-in MCP servers | Community MCP servers via the API |
| Security patching | PHP nightly, nginx via autoupdate, alerts while vulnerable | Server packages via unattended upgrades |
| Deploy audit trail | Hash-chained ledger of every deploy | Deployment history |
| Your infrastructure data | Stays on your server | Stored by a US-based SaaS |

## Where they differ {#differ}

**Where the control plane lives.** Forge manages your servers from its own SaaS. Cipi is installed on each server: there's no account to keep paying, and nothing breaks if a third party is down. The optional [web panel](/docs/gui) is also self-hosted.

**Configuration as code.** With Cipi, PHP version, workers, scheduler, domains, health checks and backups can live in [`cipi.yml`](/cipi-yml) and change through a pull request, with a plan before anything is applied.

**Safety by default.** Each app gets its own Linux user, PHP pool and database user. PHP is patched every night from the fastest source and the server alerts while a known-vulnerable build is installed ([case study](/guides/php-nginx-cve-patching)).

**Where Forge wins.** Server creation on cloud providers, Laravel VPS, a mature hosted dashboard and the backing of the Laravel team.

## Moving to Cipi {#move}

```flow
New VPS | Ubuntu 24.04 or 26.04
Install | one command
Create apps | same repos, same domains
Copy data | database dump and storage
Switch DNS | then issue certificates
```

Install Cipi on a fresh server, recreate each app with `cipi app create` (same repository and domain), import the database with `cipi db restore`, copy `storage/`, deploy, then move DNS and run `cipi ssl install`. Already on Cipi elsewhere? [`cipi sync`](/guides/migrate-server-cipi-sync) moves apps between servers in one command.
