---
title: The self-hosted Laravel developer stack (2026)
description: Which parts of a Laravel team's toolchain are worth owning (servers, deploys, backups, search, analytics, error tracking) and which are still better bought, with the cost math.
category: laravel
order: 11
published: 2026-02-03
updated: 2026-11-23
keywords: self-hosted laravel stack, laravel tools self-hosted, reduce saas costs laravel, open source laravel tools
related:
  - laravel-ecosystem-2026
  - deploy-laravel-ubuntu-vps
  - backup-vps-s3
---
Every SaaS in a Laravel team's toolchain is reasonable on its own. Together they add up to a bill per developer, per server and per project, plus a pile of places where your data lives. Here's what's worth owning.

## What to own, what to buy

| Job | Self-hosted option | Bought option | Own it when |
| --- | --- | --- | --- |
| Server management and deploys | [Cipi](/) (free) | Forge, Ploi | Almost always: it's the part you run every day |
| Backups | `cipi backup` to any S3-compatible bucket | Panel add-ons | Always: you need them anyway |
| Search | Meilisearch on the server | Algolia | Index fits in RAM |
| Object storage | [Johnny](https://johnny.web.ap.it/), MinIO | S3, R2 | You have a second VPS |
| Error tracking and uptime | [Boogle](https://boogle.web.ap.it/) | Sentry, Flare, Better Stack | Error payloads contain personal data |
| Analytics | [IndieStats](https://indiestats.web.ap.it/) | Google Analytics, Plausible | You don't want consent banners |
| Transactional e-mail | — | Postmark, SES, Mailgun | Buy: deliverability is a full-time job |
| CI | — | GitHub Actions, GitLab CI | Buy: free tiers are generous |

## The cost math

The pattern that matters is **per-server pricing**. A server panel charged per server per month costs more every time you add a staging or client server, while the servers themselves keep getting cheaper. Self-hosting the panel turns that line into zero; the VPS bill stays the same either way.

What you pay instead is attention: updates, backups and security. That's why the self-hosted tool has to do those by itself: nightly PHP and nginx patches, verified backups, alerts. If it doesn't, the saving is an illusion.

## When SaaS still wins

| Situation | Why |
| --- | --- |
| No one on the team is comfortable on a server | A managed platform hides it |
| Autoscaling to zero matters more than cost | Serverless platforms do it better |
| Compliance requires a vendor's certifications | Buying them is cheaper than earning them |

## A sensible default

Own the server, the deploys, the backups and the data. Buy e-mail delivery and CI. Add self-hosted error tracking and analytics once you have a second server for them. Start with [Deploy Laravel on an Ubuntu VPS](/guides/deploy-laravel-ubuntu-vps).
