---
title: Cipi Agent: connect your Laravel app to its server
description: Install cipi/agent to get push-to-deploy, a health endpoint, an MCP server for AI assistants, cipi.yml validation and GDPR-safe database dumps in any Laravel app.
category: agent
order: 2
published: 2026-04-02
updated: 2026-11-23
howto: yes
keywords: cipi agent, laravel deploy webhook package, laravel health endpoint, laravel mcp package
related:
  - cipi-mcp-ai-agents
  - cipi-agent-webhook-deploy
  - anonymized-database-dumps
docs:
  - agent-install
  - agent-config
  - mcp
  - agent-yml
  - anonymizer
faq:
  - Does the agent slow my app down? | No. It adds routes under `/cipi/*` that are off until enabled, and does work only when called.
  - Can I change the `/cipi` prefix? | Yes, with `CIPI_ROUTE_PREFIX` in `.env`. Update webhooks and monitors that use the old path.
  - Does it work outside Cipi servers? | The `cipi.yml` validator and the anonymizer work anywhere; deploy, health and MCP features expect a Cipi server.
  - How do I remove it? | `composer remove cipi/agent`, deploy. Routes and tokens go with it.
  - What if a step fails? | Read the troubleshooting table above first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community. Most commands print the fix when they refuse something.
  - Do I need the web panel for this? | No. Every step works from the CLI. The optional [web panel](/web-panel) shows the same things in a browser.
  - Can I run these commands from my laptop? | Many of them, through [cipi-cli](/docs/cli-client) and the [API](/api), with a scoped token. Otherwise `ssh cipi@your-server` and use `sudo cipi …`.
---
`cipi/agent` is a Laravel package that lets your app talk to the server it runs on. One `composer require` and the app gains five features, each behind its own token and each off until you want it.

| Feature | Endpoint / command | Guide |
| --- | --- | --- |
| Push-to-deploy | `POST /cipi/webhook` | [Webhook deploys](/guides/cipi-agent-webhook-deploy) |
| Health | `GET /cipi/health` | [Uptime monitoring](/guides/cipi-agent-health-monitoring) |
| MCP for AI assistants | `/cipi/mcp` | [Claude, Cursor and the Cipi MCP](/guides/cipi-mcp-ai-agents) |
| `cipi.yml` tooling | `php artisan cipi:yml` | [cipi.yml](/guides/manage-apps-with-cipi-yml) |
| Anonymized dumps | `php artisan cipi:anonymize`, `/cipi/db` | [Safe data for developers](/guides/anonymized-database-dumps) |

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Agent** | A Composer package inside your app that talks to the server it runs on |
| **Service** | One feature of the agent (health, MCP, anonymizer…), each off by default |
| **Token** | One secret per service, in the app's `.env` |

## 1. Install

```bash
$ composer require cipi/agent
$ git commit -am "Add Cipi Agent" && git push
```

On a Cipi server, `sudo cipi app create` already wrote the `.env` variables; the service provider auto-discovers. Laravel 12 or 13, PHP 8.3+.

## 2. Check it after the deploy

```bash
$ sudo cipi app artisan shop cipi:status
```

`cipi:status` shows configuration, environment, live release and commit, enabled features, `cipi.yml` validity and database connectivity.

## 3. Turn on what you need

```bash
$ php artisan cipi:service health --enable && php artisan cipi:generate-token health
$ php artisan cipi:service mcp --enable && php artisan cipi:generate-token mcp
$ php artisan cipi:service anonymize --enable && php artisan cipi:generate-token anonymize
```

Run them as the app user (`ssh shop@server`) or through `sudo cipi app artisan shop …`. Each feature has its own token; a disabled feature answers **404**, so it's invisible.

## 4. Use it in CI

```yaml
- run: php artisan cipi:yml validate --json --app=shop
```

The agent ships the same `cipi.yml` validator as the server, so a broken file fails the pipeline instead of the deploy.

## Agent or API?

The agent works **inside one app**, on its domain. The [Cipi API](/docs/api) runs on its own domain and manages the **whole server**. Install the [PHP SDK](/docs/php-sdk) next to the agent and the app's MCP gains server-side tools: rollback, database backup, job status.

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `cipi:status` says not configured | The `.env` lacks the `CIPI_*` keys Cipi writes at creation: compare with a fresh app and add the missing ones |
| An endpoint answers 404 | The service is disabled: `cipi:service <name> --enable` |
| 403 with a valid-looking token | Token from another service: each has its own |
| Package refuses to install | Laravel 12 or 13 and PHP 8.3+ are required |
