---
title: "Cipi vs Cleavr"
description: "Cipi is a free, self-hosted alternative to Cleavr for Laravel teams: zero-downtime deploys, an optional self-hosted panel, cipi.yml and MCP, with no subscription."
lead: "Cleavr is a hosted panel with Laravel support. Cipi does the same jobs from the server itself, for free."
name: Cleavr
site: https://cleavr.io
kind: SaaS server panel
family: panel
price: "from about $8/mo"
updated: 2026-11-23
keywords: cleavr alternative
choose_cipi:
  - You want no subscription and no external control plane
  - You want configuration as code and MCP
choose_them:
  - You prefer a hosted GUI and the vendor's support
---
## At a glance {#glance}

| | Cipi | Cleavr |
| --- | --- | --- |
| Price | Free | Paid plans |
| Where it runs | On your own VPS; no external control plane | Cleavr SaaS |
| Zero-downtime deploys | Yes | Yes |
| Web dashboard | Optional, self-hosted | Yes |
| Server settings in Git | `cipi.yml` | No |
| AI assistants (MCP) | Built in | Not advertised |
| Encrypted credentials at rest | Vault (AES-256) | Not advertised |

## Where they differ {#differ}

Both deploy Laravel with zero downtime. Cleavr keeps the control plane in its SaaS; Cipi keeps it on each server and adds a self-hosted [panel](/docs/gui) only if you want one.

## Moving to Cipi {#move}

```flow
New VPS | Ubuntu 24.04 or 26.04
Install | one command
Create apps | same repos, same domains
Copy data | database dump and storage
Switch DNS | then issue certificates
```

Install Cipi on a fresh server, recreate each app with `cipi app create` (same repository and domain), import the database with `cipi db restore`, copy `storage/`, deploy, then move DNS and run `cipi ssl install`. Already on Cipi elsewhere? [`cipi sync`](/guides/migrate-server-cipi-sync) moves apps between servers in one command.
