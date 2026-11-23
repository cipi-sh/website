---
title: The Cipi web panel and REST API
description: Add an optional, self-hosted web panel for your team and clients, a REST API for automation, a CLI client for your laptop, and roles, 2FA and SSO, without giving up the terminal.
category: ops
order: 4
published: 2026-04-28
updated: 2026-11-23
howto: yes
keywords: laravel server panel self-hosted, forge alternative with gui, server management api laravel, cipi panel
related:
  - cipi-mcp-ai-agents
  - cloudflare-zero-trust-laravel
  - server-monitoring-alerts
docs:
  - gui-overview
  - gui-install
  - api
  - cli-client
  - mcp
faq:
  - Do I need the panel? | No. Everything works from the CLI. The panel helps teams and people who prefer a browser.
  - Is the panel safe to expose? | It's on its own subdomain with HTTPS, users with roles and optional SSO. Put it behind Zero Trust for an extra layer.
  - Can the API delete servers or drop databases? | Destructive host operations stay CLI-only by design.
---
Cipi is CLI-first, but not CLI-only. Two optional pieces, each on its own subdomain, open it up: the **API** (for automation, the panel, the CLI client and AI assistants) and the **web panel** (for people).

<cipi-clips></cipi-clips>

```stack
Browser, cipi-cli, SDK, MCP | clients
Cipi API | api.example.com, token per client
cipi CLI | same code path as SSH
```

## 1. Install the API

```bash
$ sudo cipi api api.example.com
$ sudo cipi api token create --name=panel --full-access
```

The API checks DNS, issues its certificate and runs as `www-data`, calling an allowlist of `cipi` commands. Installing software or dropping data stays on the CLI.

## 2. Install the panel

```bash
$ sudo cipi gui panel.example.com
```

Log in with the admin account it asks for, then **Connections → add server** with the API URL and token. Add more servers the same way: the panel shows them as one fleet.

## 3. Invite the team

| Role | Sees |
| --- | --- |
| Admin | Everything |
| User | Only granted servers (View or Manage) or apps (View, Deploy, Edit, Environment, Logs, Commands, Delete) |

Invites are copyable links that work once and expire after seven days. Turn on TOTP 2FA per user, or [single sign-on](/docs/gui-sso) with Entra ID, Google Workspace, Okta or any OIDC provider.

## 4. Automate with the API

```bash
$ cipi-cli api token add prod      # on your laptop
$ cipi-cli prod apps list
$ cipi-cli prod deploy shop
```

Or from PHP with the [SDK](/docs/php-sdk), from WHMCS with the [module](/docs/whmcs), or from an assistant with the [MCP server](/guides/cipi-mcp-ai-agents).

## 5. Lock it down

| Step | How |
| --- | --- |
| IP allowlist for the API | `sudo cipi api ip-whitelist set --ips=203.0.113.0/24` |
| Panel behind Cloudflare Access | `sudo cipi zt access enable --gui` ([guide](/guides/cloudflare-zero-trust-laravel)) |
| Small tokens | One per client, only the abilities it needs, with an expiry |
| Keep it current | `sudo cipi gui update`, `sudo cipi api update` (the API also updates nightly) |

See [Web panel](/web-panel), [API](/api) and [MCP](/mcp) for the full picture.

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| API install fails on DNS | The API's hostname must point at the server first |
| 403 from the API | Token lacks the ability: create one with the right `--abilities` |
| Panel can't reach the API | Check `cipi api status`; tokens and URL in the panel settings |
