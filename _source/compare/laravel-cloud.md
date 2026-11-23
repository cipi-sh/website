---
title: "Cipi vs Laravel Cloud"
description: "Laravel Cloud is a fully managed, usage-based platform; Cipi is free software for your own VPS. Compare cost model, control, scaling and lock-in."
lead: "Laravel Cloud runs your app on managed infrastructure and bills usage. Cipi turns a VPS you own into a Laravel platform with a fixed bill."
name: Laravel Cloud
site: https://cloud.laravel.com
kind: Managed PaaS
family: paas
price: "from $5/mo plus usage"
updated: 2026-11-23
keywords: laravel cloud alternative, self-hosted laravel cloud
choose_cipi:
  - You want a predictable bill and full root
  - You want to run on any provider, including EU-only hosting
  - You host many small apps on one server
choose_them:
  - You want zero server management and autoscaling
  - Traffic is spiky and scale-to-zero saves money
---
## At a glance {#glance}

| | Cipi | Laravel Cloud |
| --- | --- | --- |
| Pricing | Free tool; fixed VPS price | Plans from $5/month plus usage |
| Servers | Your VPS, full root | None to manage, no root |
| Autoscaling, scale-to-zero | No: size the VPS | Yes |
| Managed databases and cache | On your VPS (MariaDB, PostgreSQL, Valkey) | Managed |
| Octane, queues, Reverb | Yes | Yes |
| Portability | Standard Ubuntu stack, any provider | Tied to the platform |
| Server settings in Git | `cipi.yml` | Environment settings in the platform |

## Where they differ {#differ}

This is a choice of model rather than features. Laravel Cloud hides servers and bills what you use: ideal for spiky traffic and teams that never want to administer anything. Cipi gives you a server you own, at a fixed price, with the automation a platform would give you: zero-downtime deploys, workers, backups, patching and alerts.

## Moving to Cipi {#move}

```flow
New VPS | Ubuntu 24.04 or 26.04
Install | one command
Create apps | same repos, same domains
Copy data | database dump and storage
Switch DNS | then issue certificates
```

Install Cipi on a fresh server, recreate each app with `cipi app create` (same repository and domain), import the database with `cipi db restore`, copy `storage/`, deploy, then move DNS and run `cipi ssl install`. Already on Cipi elsewhere? [`cipi sync`](/guides/migrate-server-cipi-sync) moves apps between servers in one command.
