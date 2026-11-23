---
title: "Cipi vs Dokku"
description: "Dokku is a git-push Docker PaaS on your server; Cipi is a native Laravel and PHP platform with full server management, cipi.yml and MCP."
lead: "Both are free and CLI-driven. Dokku builds containers on git push; Cipi provisions and runs a native stack."
name: Dokku
site: https://dokku.com
kind: Self-hosted Docker PaaS
family: docker
price: "Free"
updated: 2026-11-23
keywords: dokku alternative laravel
choose_cipi:
  - You want the whole server managed, not just the deploy
choose_them:
  - You want Heroku-style git push with containers
---
## At a glance {#glance}

| | Cipi | Dokku |
| --- | --- | --- |
| Price | Free (MIT) | Free (MIT) |
| Model | Native stack | Containers via git push |
| Server management | Firewall, patching, backups, monitoring | PaaS-focused, plugins |
| Laravel lifecycle | Built in | Buildpacks or Dockerfile |
| AI assistants (MCP) | Built in | Not advertised |

## Where they differ {#differ}

Dokku is a great "Heroku on your VPS". Cipi is a whole server platform for Laravel and PHP.

## Moving to Cipi {#move}

```flow
New VPS | Ubuntu 24.04 or 26.04
Install | one command
Create apps | same repos, same domains
Copy data | database dump and storage
Switch DNS | then issue certificates
```

Install Cipi on a fresh server, recreate each app with `cipi app create` (same repository and domain), import the database with `cipi db restore`, copy `storage/`, deploy, then move DNS and run `cipi ssl install`. Already on Cipi elsewhere? [`cipi sync`](/guides/migrate-server-cipi-sync) moves apps between servers in one command.
