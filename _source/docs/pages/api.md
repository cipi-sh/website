@section cipi-api

`cipi api <domain>` adds an **optional REST API and MCP server** to a Cipi server. It's what the [web panel](/docs/gui), [cipi-cli](/docs/cli-client), the [PHP SDK](/docs/php-sdk), [WHMCS](/docs/whmcs) and your AI assistant talk to. It's a separate Laravel app ([`cipi/api`](https://github.com/cipi-sh/api), MIT) that runs as `www-data` and calls an **allowlist of `cipi` commands** through sudo: credentials never leave Cipi, and destructive host operations stay on the CLI.

<cipi-term name="api"></cipi-term>

| It exposes | Where |
| --- | --- |
| REST API for apps, deploys, domains, SSL, databases, backups, Node, search, `cipi.yml`, server status | `/api/*` |
| MCP server for AI assistants | `/mcp` (Streamable HTTP) |
| Interactive reference (Swagger UI, OpenAPI) | `/docs` |

```stack
Client | panel, cipi-cli, SDK, CI, MCP
HTTPS + Sanctum token | abilities, IP allowlist
cipi/api | sync reads, async jobs (SQLite queue)
sudo allowlist | /etc/sudoers.d/cipi-api
cipi CLI | the same code path as SSH
```

This is **server-level** automation. The per-app [Cipi Agent](/docs/agent) (`cipi/agent`) is a different package.

## A domain of its own {#cipi-api-domain}

The API has its own vhost and certificate, so it needs a hostname **only it uses**. Point an `A`/`AAAA` record at the server first: the command checks DNS and stops with the record to create (`--skip-dns-check` behind a NAT or proxy it can't see through; the Cloudflare proxy counts as pointing here).

| What | Example | Set up with |
| --- | --- | --- |
| Your app | `example.com`, `www.example.com` | `cipi app create`, `cipi alias add` |
| API + MCP | `api.example.com` | `cipi api api.example.com` |
| Web panel | `panel.example.com` | `cipi gui panel.example.com` |

All three can share a server and a registered domain; each hostname belongs to one of them. Cipi refuses any overlap, in both directions (`cipi app create`, `alias add`, `app clone`, `sync import` and `cipi.yml` aliases won't take the API's or the panel's hostname). `cipi api status` warns if an old install shares a hostname with an app: fix it with [`cipi api move`](#cipi-api-move).

## Commands {#commands}

```bash
$ cipi api api.example.com          # DNS check, install, certificate, first token
$ cipi api ssl                      # (re)issue the certificate
$ cipi api status                   # versions, queue worker, pending jobs, FPM pool
$ cipi api token list
$ cipi api token create --name=panel --full-access
$ cipi api token create --name=ci --abilities=apps-view,deploy-manage --expires=2027-06-30
$ cipi api token revoke <id>
$ cipi api update                   # soft update (also nightly at 04:30)
$ cipi api upgrade                  # full rebuild, rollback kept at /opt/cipi/api.old
$ cipi api fix-permissions          # storage/database ownership back to www-data
```

Install flags: `--no-ssl`, `--no-token`, `--skip-dns-check`.

## Change domain: `cipi api move` {#cipi-api-move}

```bash
$ cipi api move api.newdomain.com           # move and issue the certificate
$ cipi api move api.newdomain.com --no-ssl  # certificate later with cipi api ssl
```

Tokens, job history and the IP allowlist stay. The vhost is rewritten (and restored if `nginx -t` fails), `/etc/cipi/api.json` and `APP_URL` updated, `cipi-queue` restarted, the old certificate deleted (never one still used by an app) and a new one issued. Then update the URL in every client: panel Connections, cipi-cli profile, SDK config, MCP clients. Running `cipi api <other-domain>` on a configured server points you here instead of silently moving.

## Remove: `cipi api remove` {#cipi-api-remove}

```bash
$ cipi api remove           # alias: uninstall; --force skips the prompt
```

Removes the `cipi-queue` worker, vhost, FPM pool, crons, certificate, `/opt/cipi/api` (and backups), `api.json`, the IP allowlist and logs. **All tokens die with it.** Apps, databases and the panel are untouched; the sudoers allowlist stays because it's part of every Cipi install.

## Tokens and abilities {#tokens}

Authentication is **Sanctum** Bearer tokens. Each token gets a list of abilities, or `--full-access` (the wildcard `*`, which also covers abilities added in future releases). Give a CI job only what it needs: `deploy-manage` alone deploys.

| Area | Abilities |
| --- | --- |
| Apps | `apps-view`, `apps-create`, `apps-edit`, `apps-delete`, `apps-suspend`, `apps-basicauth` |
| App tooling | `apps-env`, `apps-auth` (Composer `auth.json`), `apps-artisan`, `apps-run`, `apps-deploy-config` |
| Deploy | `deploy-manage` (deploy, rollback, unlock, audit, status) |
| `cipi.yml` | `yml-view`, `yml-manage` |
| Domains and SSL | `aliases-view`, `aliases-create`, `aliases-delete`, `www-manage`, `ssl-manage` |
| Routing | `redirects-view`, `redirects-manage`, `proxies-view`, `proxies-manage`, `nginx-view`, `nginx-manage` |
| Node | `node-view`, `node-manage` (SSR restart), `node-runtimes-manage` |
| Databases | `dbs-view`, `dbs-create`, `dbs-manage` |
| Backups | `backups-view` (never keys), `backups-manage` |
| Server | `status-view`, `php-view`, `php-manage`, `ssh-view`, `ssh-manage`, `services-view`, `services-manage`, `smtp-view`, `smtp-manage`, `health-view`, `health-manage`, `ip-whitelist-view`, `ip-whitelist-manage` |
| Firewall | `firewall-view` (UFW rules, Fail2ban threshold and bans, CrowdSec state and decisions), `firewall-manage` (open ports, block addresses, unban, threshold, CrowdSec on/off and allowlist) — 1.44+ |
| Optional packages | `packages-view` (the catalog and its state), `packages-manage` (install and remove an entry of the closed catalog) — manage 1.44+ |
| Read-only insights | `search-view`, `search-manage`, `monitor-view`, `zt-view`, `disk-view` |
| Metrics | `metrics-view` (series, uptime, events, settings), `metrics-manage` (retention, probe, collector, heartbeat) |
| Notifications | `notifications-view` (channels without secrets, triggers), `notifications-manage` (add, change, test, toggle, remove channels; triggers) — `smtp-view` / `smtp-manage` are accepted too |
| MCP | `mcp-access` (covers every MCP tool) |

`php artisan cipi:token-abilities` (or the `cipi api token create` checklist) shows the canonical list.

## REST endpoints {#endpoints}

Every call needs `Authorization: Bearer <token>`. **Reads are synchronous. Writes are async jobs**: they answer `202` with a `job_id`; poll `GET /api/jobs/{id}` (with the ability the job was created under) for status, output and a structured `result` (credentials, backup path, webhook token). A `running` job already carries `output` — what its command has printed so far, refreshed about once a second (1.44+) — so a deploy or an install can be followed while it runs; `result` comes with the finished job. The [firewall](#endpoints-firewall) is the exception: its changes take a second and answer at once.

### Apps {#endpoints-apps}

| Method | Path | Ability |
| --- | --- | --- |
| `GET` | `/api/apps`, `/api/apps/{name}` | `apps-view` |
| `POST` | `/api/apps` | `apps-create` |
| `PUT` | `/api/apps/{name}` | `apps-edit` |
| `DELETE` | `/api/apps/{name}` | `apps-delete` |
| `POST` | `/api/apps/{name}/suspend`, `/unsuspend` | `apps-suspend` |
| `POST` | `/api/apps/{name}/fix-permissions`, `/webhook/recreate` | `apps-edit` |
| `GET`, `POST` | `/api/apps/{name}/basicauth`, `/enable`, `/disable` | `apps-basicauth` |
| `GET`, `PUT` | `/api/apps/{name}/env` | `apps-env` |
| `GET` `POST` `PUT` `DELETE` | `/api/apps/{name}/auth` | `apps-auth` |
| `POST` | `/api/apps/{name}/artisan` | `apps-artisan` |
| `GET`, `POST` | `/api/run-commands`, `/api/apps/{name}/run` | `apps-run` |
| `GET`, `PUT` | `/api/apps/{name}/deploy-config` | `apps-deploy-config` |
| `GET`, `PUT` | `/api/apps/{name}/limits` | `apps-view` / `apps-edit` |
| `GET`, `PUT`, `DELETE` | `/api/apps/{name}/health`, `POST …/health/check` | `health-view` / `health-manage` |
| `GET` | `/api/apps/{name}/logs?type=&page=&per_page=` | `apps-view` |

`POST /api/apps` takes `domain`, `repository`, `branch`, `php`, `env`, `engine` (`mariadb`/`pgsql`), `octane`, `node_build`, `custom` + `docroot` (repository optional for SFTP-only sites), or Node fields (`node`: `spa|static|ssr`, `framework`, `node_version`, `build`, `start`, `output`, `health_path`). The same rules as [`cipi app create`](/docs/create-app) apply. `PUT` forwards only fields that changed; a `domain` already used elsewhere answers `409`. App objects return `type` (`laravel`, `custom`, `node`), `env`, `suspended`, `basic_auth`, `octane`, `redirects`, `proxies` and `databases`.

`PUT /api/apps/{name}/env` takes `set` (keys and values), `unset` (keys) and, with Cipi 5.13.0+ and API 1.43+, `order`: every key of the file after `set`/`unset`, each once, in the order they should be in (comments above a key move with it; an `order` alone is enough). It answers `vars` in file order. `GET /api/apps/{name}/basicauth` returns `enabled`, `users` and, from API 1.43, `agent` (`mode`, `public_prefix`).

### Deploy and cipi.yml {#endpoints-deploy}

| Method | Path | Ability |
| --- | --- | --- |
| `POST` | `/api/apps/{name}/deploy`, `/deploy/rollback`, `/deploy/unlock` | `deploy-manage` |
| `GET` | `/api/apps/{name}/deploy/status?tail=N` | `deploy-manage` |
| `GET` | `/api/apps/{name}/deploy/audit?days=90` | `deploy-manage` |
| `GET` | `/api/apps/{name}/deploy/history?limit=N`, `/api/deploys/last` | `apps-view` or `deploy-manage` |
| `GET` | `/api/apps/{name}/yml` | `yml-view` |
| `POST` | `/api/apps/{name}/yml/apply` (job) | `yml-manage` |
| `POST` | `/api/apps/{name}/yml/auto/enable`, `/disable` | `yml-manage` |

`deploy/status` is safe to poll: running, queued, interrupted or idle, with trigger, branch, phase, elapsed time and optional log tail. With Cipi 5.13.0+ it also returns `paused_commit`: the commit whose automatic deploy failed, which the webhook does not deploy again ([paused commit](/docs/deploying#paused)); `deploy/unlock` resumes it, and its job result says `resumed` and `resumed_commit`. `deploy/audit` returns the [hash-chained ledger](/docs/deploy-audit).

<p id="cipi-api-yml"><code>GET /api/apps/{name}/yml</code> is <code>cipi yml plan &lt;app&gt; --json</code>: the <code>file</code> of the live release, <code>env</code>, <code>auto</code>, <code>valid</code> and errors, <code>in_sync</code>, <code>warnings</code>, <code>changes</code> (kind, token, summary), <code>blockers</code> and <code>notes</code>. See <a href="/docs/yml">cipi.yml</a>.</p>

### Domains, SSL and routing {#endpoints-domains}

| Method | Path | Ability |
| --- | --- | --- |
| `GET`, `POST`, `DELETE` | `/api/apps/{name}/aliases[/{alias}]` | `aliases-*` |
| `GET`, `POST` | `/api/apps/{name}/www`, `/add`, `/force-to-root`, `/force-from-root`, `/clear` | `www-manage` |
| `POST` | `/api/apps/{name}/ssl` (`dns`, `account`, `wildcard`, `http`), `/ssl/force` | `ssl-manage` |
| `GET`, `PUT`, `DELETE` | `/api/ssl/dns[/{account}]` (Cloudflare accounts; token never returned) | `ssl-manage` |
| `GET` | `/api/apps/{name}/redirects` | `redirects-view` |
| `PUT`, `DELETE`, `POST` | `/api/apps/{name}/redirect`, `/redirect/enable`, `/disable`, `/redirects` | `redirects-manage` |
| `GET`, `POST`, `DELETE` | `/api/apps/{name}/proxies` | `proxies-view` / `proxies-manage` |
| `GET`, `PUT`, `DELETE` | `/api/apps/{name}/nginx` ([an app's own directives](#endpoints-nginx)) | `nginx-view` / `nginx-manage` |

Redirects and proxies use the CLI's own validation, regenerate the vhost and revert if `nginx -t` fails. The loopback guard on proxies is **never bypassed from the API**.

### Databases and backups {#endpoints-databases}

| Method | Path | Ability |
| --- | --- | --- |
| `GET` | `/api/dbs?engine=`, `/api/dbs/engines` | `dbs-view` |
| `POST` | `/api/dbs` (`name`, `engine`, `app`) | `dbs-create` |
| `POST` | `/api/dbs/{name}/backup`, `/restore`, `/password` | `dbs-manage` |
| `POST`, `DELETE` | `/api/dbs/{name}/link` | `dbs-manage` |
| `GET`, `POST`, `DELETE` | `/api/dbs/uploads/limits`, `/api/dbs/uploads`, `/uploads/{id}/chunks` | `dbs-manage` |
| `POST` | `/api/dbs/engines/install` | `dbs-manage` |
| `GET` | `/api/backups`, `/api/backups/runs` | `backups-view` |
| `POST`, `PUT`, `DELETE` | `/api/backups/run`, `/verify`, `/destinations/test`, `/profiles[/{name}]`, `…/enable`, `…/disable` | `backups-manage` |

Restore takes a server `file` or an `upload_id`: dumps (`.sql`, `.sql.gz`, up to 2 GB by default) are uploaded in chunks and deleted when the job ends. `dbs/engines` lists each engine with `status`, `port`, `default` and, from API 1.43, `server` and `label`: where [`cipi db switch mysql`](/docs/databases#mysql) ran, the engine is still `mariadb` and `server` is `mysql`. Backup profiles take `exclude_paths` (Cipi 5.13.0+, API 1.43+; [paths left out](/docs/backups#exclude-paths)). **Backup destinations are read-only** over the API: S3 secret keys are added on the server with `cipi backup destination add`.

### Server {#endpoints-server}

| Method | Path | Ability |
| --- | --- | --- |
| `GET` | `/api/status` (same JSON as `cipi status`) | `status-view` |
| `GET`, `POST` | `/api/php`, `/api/php/install` | `php-view` / `php-manage` |
| `GET`, `POST`, `DELETE` | `/api/ssh/keys[/{n}]` | `ssh-view` / `ssh-manage` |
| `GET`, `POST` | `/api/services`, `/services/{name}/restart` | `services-view` / `services-manage` |
| `GET`, `PUT`, `DELETE`, `POST` | `/api/smtp`, `/smtp/enable`, `/disable`, `/test` | `smtp-view` / `smtp-manage` |
| `GET` | `/api/notifications`, `/api/notifications/triggers` ([notifications](/docs/notifications#panel), 1.42+) | `notifications-view` or `smtp-view` |
| `POST`, `PUT`, `DELETE` | `/api/notifications/channels[/{id}]`, `/channels/{id}/enable`, `/disable`, `/test`, `/api/notifications/triggers`, `/triggers/reset` | `notifications-manage` or `smtp-manage` |
| `GET` | `/api/health` | `health-view` |
| `GET`, `POST`, `PUT`, `DELETE` | `/api/node`, `/node/install`, `/node/upgrade`, `/node/default`, `/node/{major}` | `node-view` / `node-runtimes-manage` |
| `GET`, `POST` | `/api/apps/{name}/node`, `/node/restart` (blue/green) | `node-view` / `node-manage` |
| `GET`, `POST` | `/api/search`, `/api/apps/{name}/search/enable`, `/disable` | `search-view` / `search-manage` |
| `GET` | `/api/disk`, `/api/disk/dbs` | `disk-view` |
| `GET` | `/api/packages` ([optional packages](#endpoints-packages)) | `packages-view` |
| `POST`, `DELETE` | `/api/packages/{id}` (jobs `package-install`, `package-remove`; 1.44+) | `packages-manage` |
| `GET` | `/api/monitor`, `/api/zt` | `monitor-view`, `zt-view` |
| `GET` | `/api/metrics`, `/api/metrics/series`, `/api/apps/{name}/metrics`, `/api/metrics/uptime`, `/api/metrics/events`, `/api/metrics/settings` ([metrics](/docs/metrics), 1.41+) | `metrics-view` |
| `PUT`, `DELETE`, `POST` | `/api/metrics/settings`, `/api/metrics/heartbeat`, `/heartbeat/test` | `metrics-manage` |
| `GET`, `PUT` | `/api/apps/{name}/basicauth/agent` ([cipi/agent and basic auth](/docs/basic-auth#agent)) | `apps-basicauth` |
| `GET` | `/api/jobs/{id}` | the job's ability |

### Firewall {#endpoints-firewall}

API 1.44+ with Cipi 5.14.0+ on the server (`503` on an older core). What the [panel's Firewall tab](/docs/firewall#panel) uses.

| Method | Path | Ability |
| --- | --- | --- |
| `GET` | `/api/firewall` (UFW, protected ports, Zero Trust locks, Fail2ban, CrowdSec) | `firewall-view` |
| `POST`, `DELETE` | `/api/firewall/rules` (`port`, `from`, `proto`; `action: deny` to remove a deny) | `firewall-manage` |
| `POST`, `DELETE` | `/api/firewall/blocks` (`address`) | `firewall-manage` |
| `PUT` | `/api/firewall/attempts` (1–100, `null` for the default) | `firewall-manage` |
| `DELETE` | `/api/firewall/bans` (`address`: Fail2ban and CrowdSec at once) | `firewall-manage` |
| `POST`, `DELETE` | `/api/firewall/crowdsec/allowlist` (`address`) | `firewall-manage` |
| `POST` | `/api/firewall/crowdsec/enable`, `/disable` (jobs `crowdsec-enable`, `crowdsec-disable`) | `firewall-manage` |

`GET /api/firewall` is `cipi firewall status --json`, typed: every UFW rule with `kind` (`port`, `block`, `other`), `family` (`both`, `v4`, `v6`), `managed_by` (`zero-trust`, `metrics`, `crowdsec`), `protected` and `removable`. Changes answer `{data, message}` with the firewall after them. The CLI's refusals ([what stays open](/docs/firewall#protected): SSH, 80 and 443, a Zero Trust lock, a block that takes in the caller's address, a rule that isn't there) are `422` with its message. Enabling CrowdSec answers `422` with `blockers` when the server can't take it, and allowlists the caller's address. The API never sends `--force`, and the CLI ignores it from the API anyway.

### Nginx directives {#endpoints-nginx}

`GET /api/apps/{name}/nginx` answers `{app, config, bytes, max_bytes, active, suspended}`: `config` is the text an app adds to [its own server block](/docs/nginx#custom), empty when it has none. `PUT` with `{"config": "…"}` replaces it (an empty one removes it), `DELETE` removes it. Both are **synchronous**: `nginx -t` runs before Nginx reloads.

A text that is refused changes nothing and answers `422` with `reasons`, one per line — `line 2: unknown directive "boom"` from Nginx, or the directive the API doesn't take. From the API only [a subset of Nginx's language](/docs/nginx#custom-api) is accepted: no log path, `include`, `listen`, `server_name`, `*_pass` or certificates, `root` and `alias` under the app's home. Needs Cipi 5.14.0+ (`503` before).

### Optional packages {#endpoints-packages}

`GET /api/packages` is `cipi package list --json`: `data.packages`, each entry with `id`, `packages` (apt), `description`, `installed`, `partial`, and on Cipi 5.14.0+ `kind` (`tools`, `libraries`), `binaries`, `missing`, `source` (`ubuntu`, or `upstream` for the [pinned releases](/docs/packages#upstream)), `version`, `installed_version` and `outdated`.

`POST /api/packages/{id}` installs an entry of the server's [closed catalog](/docs/packages#available) (or completes a partial one), `DELETE /api/packages/{id}` removes it, taking [only what no other package needs](/docs/packages#remove). Both are jobs — apt takes from seconds to a few minutes — and need API 1.44+ with Cipi 5.14.0+ on the server (`503` on an older core). An id outside the catalog is `404`, installing what is installed or removing what isn't is `409`; an `outdated` upstream entry can be installed (that updates it) and removed. A download that doesn't match its pinned SHA-256 fails the job, nothing installed. The job result says what happened: `installed`, `already`, `missing` for an install; `removed`, `apt`, `still_needed` for a removal. The API passes `--yes` and nothing else; `--force` and `--autoremove` stay at the server's shell. What the [panel's Packages tab](/docs/packages#panel) uses.

> [!security] **Kept off the API on purpose:** removing PHP versions, switching default PHP or engine, switching MariaDB and MySQL, dropping databases, installing Meilisearch, any apt package outside the [closed catalog](/docs/packages#available), stack upgrades, monitor thresholds, the OpenMetrics endpoint (it opens a port), every Zero Trust change, `cipi firewall deny`, closing SSH, 80 or 443, and the CrowdSec rescue listener. Installing arbitrary software or destroying data is an operator decision taken at the CLI, so a compromised token can't do it: the package catalog is a fixed list of stateless tools from Ubuntu's repositories, and its removal never takes what other software needs.

## Examples {#cipi-api-curl}

```bash
$ export CIPI_API_URL=https://api.example.com CIPI_API_TOKEN=<token>
$ H="Authorization: Bearer $CIPI_API_TOKEN"

$ curl -sS "$CIPI_API_URL/api/apps" -H "$H" -H "Accept: application/json"

$ curl -sS -X POST "$CIPI_API_URL/api/apps" -H "$H" -H "Content-Type: application/json" \
    -d '{"domain":"shop.example.com","repository":"git@github.com:you/shop.git","branch":"main","octane":true,"engine":"mariadb"}'
{"job_id":"9f1c…","status":"pending"}

$ curl -sS -X POST "$CIPI_API_URL/api/apps/shop/deploy" -H "$H"
$ curl -sS "$CIPI_API_URL/api/jobs/9f1c…" -H "$H"      # poll until completed

$ curl -sS -X PUT "$CIPI_API_URL/api/apps/shop/env" -H "$H" -H "Content-Type: application/json" \
    -d '{"set":{"APP_DEBUG":"false"},"unset":["LEGACY_KEY"]}'
$ curl -sS -X PUT "$CIPI_API_URL/api/apps/shop/env" -H "$H" -H "Content-Type: application/json" \
    -d '{"order":["APP_NAME","APP_ENV","APP_KEY","APP_DEBUG","APP_URL","DB_CONNECTION", "…every key"]}'

$ curl -sS -X POST "$CIPI_API_URL/api/apps/shop/artisan" -H "$H" -H "Content-Type: application/json" \
    -d '{"command":"cache:clear"}'

$ curl -sS -X POST "$CIPI_API_URL/api/apps/shop/proxies" -H "$H" -H "Content-Type: application/json" \
    -d '{"prefix":"/api/","upstream":"http://127.0.0.1:3000","strip_prefix":true}'
```

A database backup through the API is a **real** backup. For a dump people can share, use the [anonymizer](/docs/anonymizer).

## Host integration {#cipi-api-host}

The API runs as `www-data` and calls `cipi` through `/etc/sudoers.d/cipi-api`, an explicit allowlist of subcommands with their exact argument shapes, checked with `visudo -cf` whenever a migration or `cipi self-update` regenerates it, and split into rules of at most 40 commands because sudo-rs (the `sudo` of Ubuntu 26.04) refuses longer lists. Vault and MariaDB credentials stay inside Cipi, never in PHP. Its FPM pool has its own `open_basedir`.

| Symptom | Fix |
| --- | --- |
| HTTP 500 on `/docs` or `/mcp` after an update | `cipi api fix-permissions`, then `cipi api status` |
| `sudo: a terminal is required` | `cipi self-update` regenerates the allowlist |
| `sudo: I'm sorry www-data. I'm afraid I can't do that` on new endpoints (e.g. metrics) | The allowlist is older than the command. `sudo cipi self-update` (5.11.2+) rewrites it, split into rules of 40 commands for sudo-rs on Ubuntu 26.04 and validated with `visudo` first; check with `sudo -l -U www-data` |
| Panel says backups aren't configured | Compare `ls -l /etc/cipi/backup.json` with `sudo -u www-data sudo -n /usr/local/bin/cipi backup status --json` |

## IP allowlist {#cipi-api-ip-whitelist}

Restrict REST and MCP clients by source IP. `/etc/cipi/api-ip-whitelist` holds one IPv4/IPv6 address or CIDR per line; `*` or no file allows all. Rejected clients get `403 {"error":"IP not allowed","ip":"…"}`.

```bash
$ cipi api ip-whitelist show [--json]
$ cipi api ip-whitelist add 203.0.113.10
$ cipi api ip-whitelist set --ips=203.0.113.0/24,2001:db8::/32
$ cipi api ip-whitelist allow-all
```

Over REST (`/api/ip-whitelist`), `PUT` adds the caller's IP when tightening the list unless `ensure_client_ip: false`, so you can't lock yourself out by accident. The file is replaced atomically.

## MCP server {#mcp}

`/mcp` exposes the server to AI assistants: apps, deploys and audit, domains, SSL, redirects, proxies, Node, databases, search, limits, disk, `cipi.yml`, server management, the optional packages and the firewall (read-only: `PackageList`, `FirewallStatus`), logs, Artisan and job polling. A token with `mcp-access` covers every tool. Async tools return a `job_id` to poll with `JobShow`; log tools prepend a production warning and redact secrets.

```bash
$ claude mcp add --transport http cipi-api https://api.example.com/mcp \
    --header "Authorization: Bearer <token>"
```

Setup for Cursor, VS Code, Claude Desktop and others is in [MCP servers](/docs/mcp).

@section cipi-api-package

## The `cipi/api` package {#package}

`cipi api <domain>` provisions everything (`/opt/cipi/api`, Nginx, SSL, SQLite job queue, `cipi-queue.service`). For custom setups:

```bash
$ composer require cipi/api
$ php artisan vendor:publish --tag=cipi-config
$ php artisan vendor:publish --tag=cipi-assets
$ php artisan migrate
$ php artisan cipi:seed-api-user
$ php artisan cipi:token-create
```

Requires PHP 8.3+ and Laravel 12.41+ or 13. The panel reads `CIPI_APPS_JSON=/etc/cipi/apps.json` (or the `apps-public.json` projection). Abilities live in `config/cipi.php`.
