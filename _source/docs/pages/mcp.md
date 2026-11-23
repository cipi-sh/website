@section agent-mcp

Talk to production from Claude, Cursor or VS Code: *"is the app healthy, what failed last night, deploy main"*. The agent's MCP server exposes **one app** to your assistant over HTTPS, with a token, guardrails and secret redaction. No SSH access needed.

```bash
$ php artisan cipi:service mcp --enable
$ php artisan cipi:generate-token mcp
$ php artisan cipi:mcp             # endpoint + ready-to-paste client config
```

Step-by-step with real prompts: [Manage Laravel in production with Claude and the Cipi MCP](/guides/cipi-mcp-ai-agents).

## Two MCP servers {#agent-vs-api}

| | Agent MCP | Server MCP |
| --- | --- | --- |
| Endpoint | `https://myapp.com/cipi/mcp` | `https://api.example.com/mcp` |
| Scope | One app: logs, DB, Artisan, deploy, `cipi.yml` | The whole server: create apps, SSL, databases, backups |
| Installed with | `composer require cipi/agent` | `cipi api api.example.com` |
| Use for | Debugging and deploying an app | Operating the server |

## Tools {#tools}

| Tool | Mode | Does |
| --- | --- | --- |
| `health` | read | App, database, cache, queue, storage, deploy state |
| `app_info` | read | Versions, drivers, features, environment, live commit; never secrets |
| `deploy_status` | read | Live release, rollback candidates, running/queued, last outcome, log tail |
| `logs` | read | `laravel`, `nginx`, `php`, `worker`, `horizon`, `reverb`, `deploy`; level and keyword filters |
| `db_schema` | read | Tables, columns, indexes, foreign keys; flags likely personal data |
| `env_check` | read | Which keys are set or missing vs `.env.example` and `cipi.yml`; names only |
| `cipi_yml` | read | Validate a draft, show, generate or example |
| `db_query` | configurable | Reads capped at 100 rows; writes unless `CIPI_MCP_DB_WRITE=false` |
| `artisan` | may change data | Runs commands non-interactively; dangerous ones blocked |
| `deploy` | action | Queues a zero-downtime deploy; records who asked in the audit ledger |
| `anonymizer` | action | Audit, scan, or start an anonymized dump |
| `panel_*` | via `cipi/sdk` | Rollback, audit ledger, DB backup, job status, server status |

Resources: `cipi://cipi.yml`, its schema and example, `cipi://anonymization.json` and its schema.

## Guardrails {#guardrails}

| Guard | Blocks |
| --- | --- |
| Artisan blocklist | `tinker`, `serve`, `queue:work`, `horizon`, `octane:start`, `reverb:start`, `db:wipe`, `migrate:fresh`, `migrate:reset`… (extendable) |
| SQL guard | DDL (`DROP`, `ALTER`, `TRUNCATE`, `CREATE`), `GRANT`, file I/O, `SET GLOBAL`, `KILL`, multi-statements |
| Redaction | Env assignments, bearer tokens, DSNs, `APP_KEY`, provider keys masked in output |
| Origin check | Browser requests from other hosts refused (DNS-rebinding guard) |
| Annotations | Every tool declares read-only/destructive hints so clients can ask before acting |

> [!warning] The MCP token can deploy, read logs and query the database. Keep it secret; rotate with `php artisan cipi:generate-token mcp` (restart Octane and workers after).

## Connect your client {#clients}

```json
// Cursor: ~/.cursor/mcp.json
{ "mcpServers": { "cipi-myapp": {
    "type": "http", "url": "https://myapp.com/cipi/mcp",
    "headers": { "Authorization": "Bearer YOUR_CIPI_MCP_TOKEN" } } } }
```

```json
// VS Code: .vscode/mcp.json (token asked once, never committed)
{ "inputs": [{ "type": "promptString", "id": "cipi-token", "description": "Cipi MCP token", "password": true }],
  "servers": { "cipi-myapp": { "type": "http", "url": "https://myapp.com/cipi/mcp",
    "headers": { "Authorization": "Bearer ${input:cipi-token}" } } } }
```

```bash
# Claude Code
$ claude mcp add --transport http cipi-myapp https://myapp.com/cipi/mcp \
    --header "Authorization: Bearer YOUR_CIPI_MCP_TOKEN"
```

```json
// Claude Desktop (stdio bridge): claude_desktop_config.json
{ "mcpServers": { "cipi-myapp": { "command": "npx",
    "args": ["-y", "mcp-remote", "https://myapp.com/cipi/mcp", "--header", "Authorization: Bearer YOUR_CIPI_MCP_TOKEN"] } } }
```

## What a session looks like {#example}

```text
You:    Is production healthy, and what commit is live?
Claude: [health, deploy_status] Healthy. Release 20261109103000, commit 0123456 (webhook, 42 s).
You:    Show the last errors and tell me which job fails.
Claude: [logs level=error] InvoiceJob: column invoices.paid_at not found.
        [artisan migrate:status] 2026_11_08_add_paid_at is pending.
You:    Deploy main and note that Jane asked.
Claude: [deploy actor=jane@example.com] Queued; it runs within a minute.
```

@section agent-mcp-panel

## Panel tools {#agent-mcp-panel}

With [cipi/sdk](/docs/php-sdk) and a server API token, the same MCP server gains server-side actions no in-app process could do:

```bash
$ composer require cipi/sdk
# on the server: cipi api token create   (abilities: apps-view, deploy-manage, dbs-manage, status-view)
```

```ini
CIPI_BASE_URL=https://api.myserver.com
CIPI_TOKEN=your-sanctum-token
```

| Tool | Does | Ability |
| --- | --- | --- |
| `panel_status` | The app as the panel sees it, plus server snapshot | `apps-view`, `status-view` |
| `panel_deploy_audit` | The hash-chained deploy ledger | `deploy-manage` |
| `panel_rollback` | Roll back the code (migrations stay) | `deploy-manage` |
| `panel_db_backup` | Server-side database snapshot, e.g. before a risky fix | `dbs-manage` |
| `panel_job` | Status and output of an async job | any |

Scope that token to exactly these abilities: it is the one credential that reaches beyond the app.
