@section agent-security

Each feature of the agent has **its own token** and can be switched off independently. A disabled route answers 404: hidden, not just forbidden.

| Feature | Token | Endpoint |
| --- | --- | --- |
| Webhook deploy | `CIPI_WEBHOOK_TOKEN` | `POST /cipi/webhook` |
| Health | `CIPI_HEALTH_TOKEN` (falls back to the webhook token) | `GET /cipi/health` |
| MCP | `CIPI_MCP_TOKEN` | `POST /cipi/mcp` |
| Anonymizer | `CIPI_ANONYMIZER_TOKEN` | `POST /cipi/db`, `/cipi/db/user` |
| Panel tools | `CIPI_TOKEN` (server API token) | outbound, via `cipi/sdk` |

| Area | Protection |
| --- | --- |
| Webhooks | HMAC signatures (GitHub, Bitbucket, Gitea) or token header (GitLab, Azure), constant-time comparisons; what the push claims is recorded as a claim, never as a fact |
| MCP | Command and SQL blocklists, one statement per call, row caps, optional read-only DB, secret redaction, Origin check, no sessions |
| Anonymizer | Config outside the repository (`0640`); DB passwords via environment, never on a command line; raw dump deleted right after; outputs `0600`; signed, expiring download links |

Source: [github.com/cipi-sh/agent](https://github.com/cipi-sh/agent) (MIT).

@section agent-env

## Environment variables {#env}

Written by `cipi app create`; toggle features with `php artisan cipi:service <type> --enable|--disable`.

| Variable | Purpose | Default |
| --- | --- | --- |
| `CIPI_WEBHOOK_TOKEN` | Webhook secret | generated |
| `CIPI_APP_USER` | The app's Linux user | set by Cipi |
| `CIPI_DEPLOY_BRANCH` | Branch that deploys (empty = any) | the app's branch |
| `CIPI_ENV` | Environment label; picks `cipi-<env>.yml` | `production` |
| `CIPI_HOME`, `CIPI_DEPLOY_SCRIPT` | Paths overrides | `/home/<user>`, `~/.deployer/deploy.php` |
| `CIPI_PHP_VERSION` | Reported PHP; used by `cipi:yml generate` | system PHP |
| `CIPI_ROUTE_PREFIX` | Prefix of all agent routes | `cipi` |
| `CIPI_LOG_CHANNEL` | Log channel for deploy events | none |
| `CIPI_HEALTH_CHECK`, `CIPI_HEALTH_TOKEN` | Health endpoint | on, none |
| `CIPI_MCP`, `CIPI_MCP_TOKEN` | MCP endpoint | off, none |
| `CIPI_MCP_ALLOWED_ORIGINS` | Extra browser origins | the app host |
| `CIPI_MCP_DB_WRITE` | Allow writes in `db_query` | `true` |
| `CIPI_MCP_MAX_ROWS` | Row cap (max 500) | 100 |
| `CIPI_MCP_REDACT` | Mask secrets in output | `true` |
| `CIPI_ANONYMIZER`, `CIPI_ANONYMIZER_TOKEN` | Anonymizer endpoint | off, none |
| `CIPI_ANONYMIZER_CONFIG`, `CIPI_ANONYMIZER_TTL` | Config path; link validity (minutes) | `~/.db/anonymization.json`, 15 |
| `CIPI_MYSQLDUMP`, `CIPI_PG_DUMP` | Dump binaries | from `PATH` |
| `CIPI_PANEL`, `CIPI_PANEL_APP` | Panel MCP tools; app name on the panel | on, `CIPI_APP_USER` |
| `CIPI_BASE_URL`, `CIPI_TOKEN` | Server API URL and token for `cipi/sdk` | none |

> [!tip] For production, set `CIPI_MCP_DB_WRITE=false` unless you really want your assistant to write data.
