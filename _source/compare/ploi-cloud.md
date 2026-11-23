---
title: "Cipi vs Ploi Cloud"
description: "Ploi Cloud is a managed EU PaaS for Laravel, PHP and Node; Cipi is free software for your own VPS. Compare control, cost model and lock-in."
lead: "Ploi Cloud runs apps on its managed platform. Cipi runs them on a VPS you own. Not the same product as Ploi.io, the server panel."
name: Ploi Cloud
site: https://ploi.cloud
kind: Managed PaaS
family: paas
price: "resource-based pricing"
updated: 2026-11-23
keywords: ploi cloud alternative
choose_cipi:
  - You want root, a fixed bill and any provider
choose_them:
  - You want an EU-managed platform with no servers to run
---
## At a glance {#glance}

| | Cipi | Ploi Cloud |
| --- | --- | --- |
| Pricing | Free tool; fixed VPS price | Resource-based |
| Servers | Your VPS, full root | Managed, no root |
| Regions | Wherever you rent a VPS | The platform's regions |
| Managed services | On your VPS | Managed databases and storage |
| AI assistants (MCP) | Built in, on your server | Hosted MCP |

## Where they differ {#differ}

Same trade-off as any managed platform: convenience and scaling versus control and a fixed price. If you're comparing with Ploi's server panel instead, see [Cipi vs Ploi](/alternative-to-ploi).

## Moving to Cipi {#move}

```flow
New VPS | Ubuntu 24.04 or 26.04
Install | one command
Create apps | same repos, same domains
Copy data | database dump and storage
Switch DNS | then issue certificates
```

Install Cipi on a fresh server, recreate each app with `cipi app create` (same repository and domain), import the database with `cipi db restore`, copy `storage/`, deploy, then move DNS and run `cipi ssl install`. Already on Cipi elsewhere? [`cipi sync`](/guides/migrate-server-cipi-sync) moves apps between servers in one command.
