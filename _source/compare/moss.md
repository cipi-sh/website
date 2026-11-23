---
title: "Cipi vs moss.sh"
description: "Cipi is a free, self-hosted alternative to moss.sh: unlimited deploys, an optional self-hosted panel, cipi.yml and MCP, on your own VPS."
lead: "moss.sh is a hosted "virtual sysadmin" for PHP, Node and more. Cipi runs on your server with no deploy quotas."
name: moss.sh
site: https://moss.sh
kind: SaaS server panel
family: panel
price: "free tier, then paid plans"
updated: 2026-11-23
keywords: moss.sh alternative
choose_cipi:
  - You want unlimited deploys and no subscription
  - You deploy Laravel and want it automated end to end
choose_them:
  - You want a hosted GUI for agency workflows across stacks
---
## At a glance {#glance}

| | Cipi | moss.sh |
| --- | --- | --- |
| Price | Free, no limits | Limited free tier, then paid plans |
| Where it runs | On your own VPS; no external control plane | moss.sh SaaS |
| Deploy limits | None | On the free tier |
| Laravel automation | Releases, workers, scheduler, Octane, Horizon, Reverb | Laravel-friendly |
| Server settings in Git | `cipi.yml` | No |
| AI assistants (MCP) | Built in | Not advertised |

## Where they differ {#differ}

moss.sh supports several stacks from a hosted dashboard. Cipi is Laravel-first, free and on your server, with PHP apps and Node front ends supported too.

## Moving to Cipi {#move}

```flow
New VPS | Ubuntu 24.04 or 26.04
Install | one command
Create apps | same repos, same domains
Copy data | database dump and storage
Switch DNS | then issue certificates
```

Install Cipi on a fresh server, recreate each app with `cipi app create` (same repository and domain), import the database with `cipi db restore`, copy `storage/`, deploy, then move DNS and run `cipi ssl install`. Already on Cipi elsewhere? [`cipi sync`](/guides/migrate-server-cipi-sync) moves apps between servers in one command.
