---
title: "Cipi vs RunCloud"
description: "Cipi is a free, self-hosted alternative to RunCloud with Laravel-native zero-downtime deploys, queues, Octane, cipi.yml and MCP, on any Ubuntu VPS."
lead: "RunCloud is a PHP and WordPress-friendly hosted panel. Cipi is free, runs on your server and automates Laravel end to end."
name: RunCloud
site: https://runcloud.io
kind: SaaS server panel
family: panel
price: "paid plans"
updated: 2026-11-23
keywords: runcloud alternative, free runcloud alternative
choose_cipi:
  - Your apps are Laravel and you want them automated end to end
  - You want no subscription
choose_them:
  - Your fleet is mostly WordPress and you want a hosted GUI built around it
---
## At a glance {#glance}

| | Cipi | RunCloud |
| --- | --- | --- |
| Price | Free | Paid plans per month |
| Where it runs | On your own VPS; no external control plane | runcloud.io (SaaS) + agent on the server |
| Laravel releases, workers, scheduler | Built in | Configured by hand or with scripts |
| Octane, Horizon, Reverb | One command each | Manual |
| Apache / WordPress focus | Nginx; WordPress as custom app | Yes |
| Server settings in Git | `cipi.yml` | No |
| AI assistants (MCP) | Built in | Not advertised |

## Where they differ {#differ}

RunCloud is strong for WordPress and generic PHP on Nginx or Apache. For Laravel, Cipi automates what a generic panel leaves to you: Deployer releases, `.env` handling, workers, scheduler, Horizon, Reverb and Octane. WordPress still runs on Cipi as a [custom app](/guides/deploy-wordpress-custom-app).

## Moving to Cipi {#move}

```flow
New VPS | Ubuntu 24.04 or 26.04
Install | one command
Create apps | same repos, same domains
Copy data | database dump and storage
Switch DNS | then issue certificates
```

Install Cipi on a fresh server, recreate each app with `cipi app create` (same repository and domain), import the database with `cipi db restore`, copy `storage/`, deploy, then move DNS and run `cipi ssl install`. Already on Cipi elsewhere? [`cipi sync`](/guides/migrate-server-cipi-sync) moves apps between servers in one command.
