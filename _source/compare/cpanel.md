---
title: "Cipi vs cPanel"
description: "cPanel is built for selling shared hosting; Cipi is a free platform for deploying Laravel and PHP apps on your own VPS."
lead: "cPanel manages e-mail, FTP, DNS and many customer sites under a licence. Cipi deploys your own apps, for free."
name: cPanel
site: https://cpanel.net
kind: Hosting control panel
family: hosting
price: "licence per server"
updated: 2026-11-23
keywords: cpanel alternative laravel
choose_cipi:
  - You deploy your own Laravel or PHP apps
choose_them:
  - You sell hosting with e-mail and many customer accounts
---
## At a glance {#glance}

| | Cipi | cPanel |
| --- | --- | --- |
| Price | Free | Per-server licence |
| Built for | Deploying your apps | Shared hosting resale |
| Web server | Nginx | Apache by default |
| Zero-downtime Git deploys | Yes | No |
| E-mail, FTP, DNS hosting | Not the focus | Yes |

## Where they differ {#differ}

Different jobs. For a development team, a hosting reseller panel is weight you don't need.

## Moving to Cipi {#move}

```flow
New VPS | Ubuntu 24.04 or 26.04
Install | one command
Create apps | same repos, same domains
Copy data | database dump and storage
Switch DNS | then issue certificates
```

Install Cipi on a fresh server, recreate each app with `cipi app create` (same repository and domain), import the database with `cipi db restore`, copy `storage/`, deploy, then move DNS and run `cipi ssl install`. Already on Cipi elsewhere? [`cipi sync`](/guides/migrate-server-cipi-sync) moves apps between servers in one command.
