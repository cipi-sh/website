---
title: "Cipi vs fortrabbit"
description: "fortrabbit is a managed PHP platform; Cipi is free software for running Laravel and PHP on your own VPS with full root."
lead: "fortrabbit hosts PHP apps for you. Cipi turns your own VPS into the same kind of platform."
name: fortrabbit
site: https://www.fortrabbit.com
kind: Managed PHP PaaS
family: paas
price: "from about €4.50/mo"
updated: 2026-11-23
keywords: fortrabbit alternative
choose_cipi:
  - You want root and Laravel-specific automation
choose_them:
  - You want managed PHP hosting with no sysadmin work at all
---
## At a glance {#glance}

| | Cipi | fortrabbit |
| --- | --- | --- |
| Pricing | Free tool; fixed VPS price | Plans from a few euros plus resources |
| Servers | Your VPS, full root | Managed, SSH/SFTP to the app |
| Octane, Horizon, Reverb | Yes | PHP platform, not Octane-first |
| MCP | Built in | Offered |

## Where they differ {#differ}

fortrabbit is a mature, PHP-specialised host. Cipi gives you control of the server and its stack, at the price of the VPS.

## Moving to Cipi {#move}

```flow
New VPS | Ubuntu 24.04 or 26.04
Install | one command
Create apps | same repos, same domains
Copy data | database dump and storage
Switch DNS | then issue certificates
```

Install Cipi on a fresh server, recreate each app with `cipi app create` (same repository and domain), import the database with `cipi db restore`, copy `storage/`, deploy, then move DNS and run `cipi ssl install`. Already on Cipi elsewhere? [`cipi sync`](/guides/migrate-server-cipi-sync) moves apps between servers in one command.
