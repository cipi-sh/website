---
title: Server monitoring and alerts on Telegram, Slack and e-mail
description: Watch CPU, memory, disk, services, certificates and app health on your own server, and get alerted on Telegram, Slack, e-mail or a webhook when something actually breaks.
category: ops
order: 3
published: 2026-08-26
updated: 2026-11-23
howto: yes
keywords: laravel server monitoring, server alerts telegram, slack alerts server, uptime laravel self-hosted
related:
  - cipi-agent-health-monitoring
  - backup-vps-s3
  - php-nginx-cve-patching
docs:
  - monitor
  - notifications
  - health-checks
faq:
  - What does Cipi watch? | Load, memory, disk, services (Nginx, PHP-FPM, databases, Valkey, Supervisor), failed deploys, backups, certificates, security updates and health checks.
  - Will I get spammed? | Alerts fire on state changes (problem, then recovery), not every five minutes. Disable triggers you don't want.
  - What if a step fails? | Read the troubleshooting table above first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community. Most commands print the fix when they refuse something.
  - Do I need the web panel for this? | No. Every step works from the CLI. The optional [web panel](/web-panel) shows the same things in a browser.
  - Can I run these commands from my laptop? | Many of them, through [cipi-cli](/docs/cli-client) and the [API](/api), with a scoped token. Otherwise `ssh cipi@your-server` and use `sudo cipi …`.
  - Will this affect other apps on the server? | No, unless the step says it's server-wide (installing a PHP version, firewall, Cloudflare tunnel). Each app has its own user, PHP pool, database and Valkey.
  - Why do commands start with `sudo cipi`? | You log in as the `cipi` admin user, which may run `cipi` with `sudo` without a password. Root login is disabled for safety.
---
Cipi checks the server every five minutes with a cron job and a few state files: no agent, no metrics database, no external service. You choose where the alerts go.

<cipi-term name="monitor"></cipi-term>

## 1. Add a channel

```bash
$ sudo cipi notification add telegram oncall --token=<bot-token> --chat-id=<id>
$ sudo cipi notification add slack ops --url=https://hooks.slack.com/services/…
$ sudo cipi notification add webhook pager --url=https://example.com/hooks/cipi --secret=…
$ sudo cipi notification test all
```

For Telegram: create a bot with @BotFather, send it `/start`, and read the chat id from `getUpdates`. Group chats have negative ids.

## 2. Pick what notifies

```bash
$ sudo cipi notification triggers
$ sudo cipi notification triggers disable monitor_load
```

Deploy failures, backups, health checks, monitor alerts, security events and SSO changes are separate triggers.

## 3. Tune the monitor

```bash
$ sudo cipi monitor list
$ sudo cipi monitor set disk --warn=85 --crit=95
$ sudo cipi monitor test
```

| Check | Alerts on |
| --- | --- |
| CPU, load, memory, swap | Sustained high usage |
| Disk | Thresholds per filesystem; [`sudo cipi disk`](/docs/disk) shows which app is filling it |
| Services | nginx, databases, Valkey, Supervisor, PHP-FPM down |
| Certificates | Expiring soon |
| App disk | An app over its soft limit |

## 4. Watch each app from outside

```bash
$ sudo cipi health set shop --url=https://shop.example.com/up --expect=200
$ sudo cipi health check shop
```

The same check runs after every deploy and can [roll back automatically](/guides/laravel-zero-downtime-migrations). For a richer per-app status (database, cache, queue, storage, deploy), use the [agent's health endpoint](/guides/cipi-agent-health-monitoring) with an external uptime service.

More channels and webhook signatures: [notifications and alerts](/guides/notifications-alerts).

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| No alerts at all | No channel configured: add one with `sudo cipi notification add`, then `sudo cipi notification test all` |
| Telegram silent | Bot never received `/start`, or wrong chat id (groups are negative) |
| Too many disk alerts | Clean logs and releases; lower `--keep-releases` |
