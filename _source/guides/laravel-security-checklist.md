---
title: Laravel production security checklist
description: A practical checklist for a Laravel app on your own server, covering the app, the PHP and nginx stack, access, data and monitoring, with the command that covers each item.
category: security
order: 3
published: 2026-02-18
updated: 2026-11-23
keywords: laravel security checklist, laravel production hardening, secure laravel server, laravel vps security
related:
  - php-nginx-cve-patching
  - cloudflare-zero-trust-laravel
  - anonymized-database-dumps
---
Security on your own server is a list of boring things done every time. Here's the list, split between what's yours (the app) and what the server should do for you.

## The app

| Check | How |
| --- | --- |
| `APP_DEBUG=false`, `APP_ENV=production` | `sudo cipi app env shop --get=APP_DEBUG` |
| Dependencies without known CVEs | `composer audit` in CI; [Checkpoint](https://checkpoint.web.ap.it/) for a broader Laravel audit |
| Secrets only in `.env`, never committed | `cipi.yml` lists required names (`env.required`), never values |
| Rate limiting on login, API and forms | `RateLimiter::for(...)` and the `throttle` middleware |
| Authorization on every route | Policies and gates; test them |
| Mass-assignment guarded | `$fillable` on models |
| Uploads validated and stored outside `public/` | `mimes:` rules, `Storage::disk('local')` |
| Admin tools (Horizon, Telescope, Pulse) gated | `viewHorizon` gate; Telescope off in production |
| Security headers | CSP, HSTS (after HTTPS works everywhere), `X-Frame-Options` |

## The server

| Check | Cipi does it with |
| --- | --- |
| Each app isolated from the others | Own Linux user, PHP pool with `open_basedir`, database user |
| SSH by key only, no root login | Installer default; `sudo cipi ssh list` |
| Firewall with only 22, 80, 443 | UFW by default; `sudo cipi firewall list` |
| Brute-force bans | fail2ban; `sudo cipi firewall attempts 3`; optional [CrowdSec](/docs/crowdsec) |
| PHP patched the day fixes ship | Nightly at 03:30; `sudo cipi php upgrade` ([case study](/guides/php-nginx-cve-patching)) |
| nginx patched | `sudo cipi nginx security`, `sudo cipi autoupdate on nginx` |
| Credentials encrypted at rest | The vault (AES-256) for configs, tokens and keys |
| HTTPS everywhere | `sudo cipi ssl install shop` and `sudo cipi ssl force shop` |
| Malware and integrity checks | `sudo cipi scan`, nightly integrity checks |
| Compliance report | `sudo cipi compliance` |

## Access

| Check | How |
| --- | --- |
| Per-person SSH keys, removed when people leave | `sudo cipi ssh add`, `sudo cipi ssh remove` |
| Panel with 2FA or SSO, least-privilege roles | [Web panel](/docs/gui-sso) |
| API tokens scoped and expiring | `cipi api token create --abilities=… --expires=…` |
| Staging and admin behind a login | [Cloudflare Access](/guides/cloudflare-zero-trust-laravel) or basic auth |

## Data

| Check | How |
| --- | --- |
| Encrypted off-site backups, restored at least once | [Backups to S3](/guides/backup-vps-s3) with `encrypt: true` and `cipi backup verify` |
| No production data on laptops | [Anonymized dumps](/guides/anonymized-database-dumps) |
| Logs that expire | [Log retention](/docs/log-retention) |

## Monitoring

| Check | How |
| --- | --- |
| Alerts where you look | Telegram, Slack, e-mail or webhooks ([guide](/guides/server-monitoring-alerts)) |
| Health check with automatic rollback | `health.rollback_on_unhealthy: true` in `cipi.yml` |
| Who deployed what | The [deploy audit](/docs/deploy-audit) |
