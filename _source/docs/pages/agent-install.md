@section agent-install

**Cipi Agent** (`cipi/agent`) is a Laravel package that connects your app to the server it runs on. Install it once and the app gains push-to-deploy, a health endpoint, an MCP server for AI assistants, `cipi.yml` tooling and a GDPR-friendly database anonymizer.

```bash
$ composer require cipi/agent
$ git commit -am "Add Cipi Agent" && git push
$ php artisan cipi:status        # after the next deploy
```

On a Cipi server, `sudo cipi app create` already wrote the `.env` variables the agent needs; the service provider auto-discovers. Health, MCP, `cipi.yml` validation and the anonymizer also work on any Laravel host.

## What you get {#features}

| Feature | Endpoint / command | Read |
| --- | --- | --- |
| Push-to-deploy | `POST /cipi/webhook` | [Webhook & health](/docs/agent-webhook) |
| Health check | `GET /cipi/health` (Bearer token) | [Webhook & health](/docs/agent-webhook#agent-health) |
| MCP server | `/cipi/mcp` | [MCP server](/docs/mcp) |
| `cipi.yml` tooling | `php artisan cipi:yml` | [cipi.yml tooling](/docs/agent-yml) |
| Anonymized dumps | `php artisan cipi:anonymize`, `/cipi/db` | [Database anonymizer](/docs/anonymizer) |
| Panel tools | MCP `panel_*` via `cipi/sdk` | [MCP server](/docs/mcp#agent-mcp-panel) |

| Requirement | |
| --- | --- |
| PHP | 8.3+ |
| Laravel | 12 or 13 |
| Anonymizer | MySQL/MariaDB or PostgreSQL, with `mysqldump`/`pg_dump` on the server |
| Optional | `cipi/sdk` for panel tools; `ext-zlib` for gzip dumps |

## Artisan commands {#commands}

| Command | Does |
| --- | --- |
| `cipi:status` | Configuration, environment, live release and commit, features, `cipi.yml` validity, DB connectivity |
| `cipi:mcp [--json]` | MCP endpoint, tools and ready-to-paste setup for Cursor, VS Code, Claude Code, Claude Desktop |
| `cipi:generate-token mcp\|health\|anonymize` | Create a secure token in `.env` |
| `cipi:service mcp\|health\|anonymize --enable\|--disable` | Toggle a feature |
| `cipi:deploy-key` | Print the app's deploy key |
| `cipi:yml validate\|show\|generate\|example\|schema` | [cipi.yml tooling](/docs/agent-yml) |
| `cipi:init-anonymize [--scan]`, `cipi:anonymize-audit`, `cipi:anonymize` | [Anonymizer](/docs/anonymizer) |

```bash
$ php artisan vendor:publish --tag=cipi-agent-config    # only for custom defaults
```

> [!note] The agent runs **inside one app** (`/cipi/*` on its domain). The [REST API](/docs/api) runs on its own domain and manages the **whole server**. Comparison: [Agent vs API](/docs/mcp#agent-vs-api).
