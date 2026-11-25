---
title: Manage Laravel in production with Claude, Cursor and the Cipi MCP
description: Connect Claude Code, Cursor or VS Code to your live Laravel app and to your server through Cipi's two MCP servers, with tokens, guardrails, secret redaction and an audit trail.
category: agent
order: 1
published: 2026-07-22
updated: 2026-11-23
howto: yes
keywords: laravel mcp server, claude code laravel production, cursor mcp laravel, mcp server deploy, ai devops laravel
related:
  - cipi-agent-laravel-mcp
  - anonymized-database-dumps
  - cipi-agent-health-monitoring
faq:
  - Can the assistant drop my database? | The SQL guard blocks DDL (`DROP`, `ALTER`, `TRUNCATE`, `CREATE`), `GRANT`, file I/O and multi-statements, and dangerous Artisan commands (`db:wipe`, `migrate:fresh`, `tinker`…) are blocked. Set `CIPI_MCP_DB_WRITE=false` for read-only queries.
  - Does it see my secrets? | Output is redacted: env assignments, bearer tokens, DSNs, `APP_KEY` and provider keys are masked. `env_check` returns variable names, never values.
  - Which one should I install? | The agent MCP to debug and deploy one app; the server MCP to operate the whole server. Many teams use both.
  - Which assistants work? | Any MCP client that speaks HTTP: Claude Code, Claude Desktop, Cursor, VS Code, Windsurf and others.
  - Can I limit what the assistant does on the server MCP? | Yes. Give its API token only the abilities it needs, for example read-only `apps-view` plus `deploy`, instead of full access.
  - Does the assistant run commands on my laptop or the server? | Only through the tools the MCP server exposes, over HTTPS, with your token. It can't open a shell.
  - How do I revoke access? | Rotate the agent token (`php artisan cipi:generate-token mcp`) or delete the API token (`cipi api token revoke`). The old one stops working at once.
docs:
  - mcp
  - agent-config
  - api
  - deploy-audit
---
MCP (Model Context Protocol) lets an AI assistant call tools. Cipi ships two MCP servers, so you can ask *"is production healthy, what failed last night, deploy main"* and get answers from the real app, not guesses.

| | Agent MCP | Server MCP |
| --- | --- | --- |
| Endpoint | `https://shop.example.com/cipi/mcp` | `https://api.example.com/mcp` |
| Scope | One app: health, logs, database, Artisan, deploy, `cipi.yml` | The server: apps, domains, SSL, databases, backups, PHP |
| Installed with | `composer require cipi/agent` | `cipi api api.example.com` |

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **MCP** | Model Context Protocol: a standard way for an AI assistant to call tools |
| **Tool** | One action the assistant can take: read logs, run a query, deploy |
| **Token** | The secret your assistant sends with every call; scoped and revocable |
| **Guard** | A rule that blocks dangerous calls whatever the assistant asks |

```flow
You ask | in Claude, Cursor, VS Code
> You type a question in plain words in Claude Code, Claude Desktop, Cursor or VS Code: "is production healthy?"
Assistant | picks a tool
> The assistant chooses which tool to call (`health`, `logs`, `deploy`…) and with which arguments.
MCP server | checks token and guards
> The MCP server checks the token, then the guards: blocked SQL, blocked Artisan commands, read-only mode.
App or server | runs it, output redacted
> The tool runs against the real app or server. Secrets are masked in the output before the assistant sees it.
```

## 1. Turn on the agent's MCP server

```bash
$ composer require cipi/agent        # commit, push, deploy
# as the app user on the server (or: sudo cipi app artisan shop …)
$ php artisan cipi:service mcp --enable
$ php artisan cipi:generate-token mcp
$ php artisan cipi:mcp               # endpoint + ready-to-paste config
```

## 2. Connect your assistant

```bash
# Claude Code
$ claude mcp add --transport http cipi-shop https://shop.example.com/cipi/mcp \
    --header "Authorization: Bearer YOUR_CIPI_MCP_TOKEN"
```

```json
// Cursor: ~/.cursor/mcp.json
{ "mcpServers": { "cipi-shop": {
    "type": "http", "url": "https://shop.example.com/cipi/mcp",
    "headers": { "Authorization": "Bearer YOUR_CIPI_MCP_TOKEN" } } } }
```

VS Code and Claude Desktop configs are in the [MCP docs](/docs/mcp#clients). VS Code can prompt for the token so it's never committed.

## 3. Ask real questions

```text
You:    Is production healthy, and what commit is live?
Claude: [health, deploy_status] Healthy. Release 20261109103000, commit 0123456 (webhook, 42 s).
You:    Show the last errors and tell me which job fails.
Claude: [logs level=error] InvoiceJob: column invoices.paid_at not found.
        [artisan migrate:status] 2026_11_08_add_paid_at is pending.
You:    Deploy main and note that Jane asked.
Claude: [deploy actor=jane@example.com] Queued; it runs within a minute.
```

| Tool | What it's good for |
| --- | --- |
| `health`, `deploy_status` | "Is it up? What's live? Is a deploy running?" |
| `logs` | Laravel, Nginx, PHP, worker, Horizon, Reverb and deploy logs with level and keyword filters |
| `db_schema`, `db_query` | Understand data; reads capped at 100 rows |
| `artisan` | `migrate:status`, `queue:retry`, cache commands; dangerous ones blocked |
| `env_check`, `cipi_yml` | Missing variables; validate a `cipi.yml` draft before you commit it |
| `deploy` | Queue a zero-downtime deploy, recorded in the audit with who asked |

## 4. Add the server MCP

For server work ("create a staging app", "issue the certificate", "back up the database"), install the API on its own domain and create a token with `mcp-access`:

```bash
$ sudo cipi api api.example.com
$ sudo cipi api token create --name=claude --abilities=mcp-access
$ claude mcp add --transport http cipi-server https://api.example.com/mcp \
    --header "Authorization: Bearer <token>"
```

Destructive host operations (dropping databases, removing PHP versions, installing software outside the [closed package catalog](/docs/packages)) are kept off the API on purpose, and the server MCP doesn't install or remove even those packages: it lists them.

## Guardrails in one table

| Guard | Effect |
| --- | --- |
| One token per feature | Rotate with `php artisan cipi:generate-token mcp`; disabled routes answer 404 |
| SQL and Artisan guards | No DDL, no `GRANT`, no `migrate:fresh`, no `tinker` |
| Redaction | Secrets masked in every output |
| Origin check | Browser requests from other hosts refused |
| Tool annotations | Clients know which tools are read-only and ask before acting |
| Audit | Deploys record the actor in the [hash-chained ledger](/docs/deploy-audit) |

> [!tip] For production, start with `CIPI_MCP_DB_WRITE=false`. Need realistic data for the assistant to experiment on? Give it an [anonymized dump](/guides/anonymized-database-dumps) instead of production.

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| 401 Unauthorized | Wrong or old token: generate a new one, update the client config |
| 404 on `/cipi/mcp` | Service disabled: `php artisan cipi:service mcp --enable` |
| Tool refused: blocked command | By design (DDL, `migrate:fresh`, `tinker`): run it yourself if you really need it |
| Query returns 100 rows only | Reads are capped: ask for a narrower query or an aggregate |
| Client can't connect | The client needs HTTP transport support; update it |
