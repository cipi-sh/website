---
title: "Cipi vs Kamal"
description: "Kamal deploys containers to servers you prepare; Cipi provisions the whole Laravel stack and deploys natively, with backups, patching and MCP."
lead: "Kamal is a deploy tool. Cipi is a server platform that also deploys."
name: Kamal
site: https://kamal-deploy.org
kind: Deploy tool
family: deploy
price: "Free"
updated: 2026-11-23
keywords: kamal alternative laravel
choose_cipi:
  - You want one tool to provision, secure, deploy and operate
choose_them:
  - You already run Docker infrastructure and need only the deploy step
---
## At a glance {#glance}

| | Cipi | Kamal |
| --- | --- | --- |
| Price | Free (MIT) | Free (MIT) |
| Provisioning | Full stack: web server, PHP, databases, firewall, SSL | None: bring your own |
| Model | Native | Docker containers |
| Backups, monitoring, patching | Built in | Not included |
| Laravel lifecycle | Built in | Through your image |

## Where they differ {#differ}

Kamal does one thing well. Cipi covers everything around the deploy too.

## Moving to Cipi {#move}

```flow
New VPS | Ubuntu 24.04 or 26.04
Install | one command
Create apps | same repos, same domains
Copy data | database dump and storage
Switch DNS | then issue certificates
```

Install Cipi on a fresh server, recreate each app with `cipi app create` (same repository and domain), import the database with `cipi db restore`, copy `storage/`, deploy, then move DNS and run `cipi ssl install`. Already on Cipi elsewhere? [`cipi sync`](/guides/migrate-server-cipi-sync) moves apps between servers in one command.
