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
| Routing | `redirects-view`, `redirects-manage`, `proxies-view`, `proxies-manage`, `nginx-view`, `nginx-manage` (an app's directives and its [page cache](/docs/page-cache)) |
| Node | `node-view`, `node-manage` (SSR restart), `node-runtimes-manage` |
| Databases | `dbs-view`, `dbs-create`, `dbs-manage` |
| Backups | `backups-view` (never secret keys; the public key of an SFTP destination), `backups-manage` (profiles, runs, SFTP destinations) |
| Server | `status-view`, `php-view`, `php-manage`, `ssh-view`, `ssh-manage`, `services-view`, `services-manage`, `smtp-view`, `smtp-manage`, `health-view`, `health-manage`, `ip-whitelist-view`, `ip-whitelist-manage` |
| Firewall | `firewall-view` (UFW rules, Fail2ban threshold and bans, CrowdSec state and decisions), `firewall-manage` (open ports, block addresses, unban, threshold, CrowdSec on/off and allowlist) |
| Optional packages | `packages-view` (the catalog and its state), `packages-manage` (install and remove an entry of the closed catalog) |
| Read-only insights | `search-view`, `search-manage`, `monitor-view`, `zt-view`, `disk-view` |
| Zero Trust: the mesh network | `zt-manage` (join and leave a Tailscale or NetBird network, close and reopen SSH and 80/443, Tailscale SSH) — as strong as `ssh-manage` |
| Moving apps | `sync-manage` ([send apps to another server](#endpoints-sync), trust another server's key) — as strong as `ssh-manage` |
| Updates of Cipi | `updates-view`, `updates-manage` ([the signature check and the delay](#endpoints-self-update) of self-update; never an update itself) |
| Metrics | `metrics-view` (series, uptime, events, settings), `metrics-manage` (retention, probe, collector, heartbeat) |
| Notifications | `notifications-view` (channels without secrets, triggers), `notifications-manage` (add, change, test, toggle, remove channels; triggers) — `smtp-view` / `smtp-manage` are accepted too |
| MCP | `mcp-access` (covers every MCP tool) |

`php artisan cipi:token-abilities` (or the `cipi api token create` checklist) shows the canonical list.

Some routes have no ability of their own and sit under an area's: `nginx-*` for the [page cache](#endpoints-cache), `php-*` for the [PHP of an Octane app](#endpoints-octane), `services-*` for [Valkey per app](#endpoints-valkey), `notifications-*` for the [time zone and server name](#endpoints-notification-settings) of notifications. A token made for one of those areas can use them.

## REST endpoints {#endpoints}

Every call needs `Authorization: Bearer <token>`. **Reads are synchronous. Writes are async jobs**: they answer `202` with a `job_id`; poll `GET /api/jobs/{id}` (with the ability the job was created under) for status, output and a structured `result` (credentials, backup path, webhook token). A `running` job already carries `output` — what its command has printed so far, refreshed about once a second — so a deploy or an install can be followed while it runs; `result` comes with the finished job. **A job has a time limit**: two hours for a deploy and for a [transfer](#endpoints-sync) (a front-end build alone may take [30 minutes](/docs/deploying#time-limits), up to an hour where the app asks for it), ten minutes for any other; one that runs out of it ends as `failed` with `exit_code` 124, the output it had, and a line that says so. The [firewall](#endpoints-firewall) is the exception: its changes take a second and answer at once.

The API and the server's Cipi are updated separately (`cipi api update`, `cipi self-update`). A route whose command the server's Cipi doesn't have yet answers `503` and says so: update the server.

A server whose API is [behind Cloudflare Access](/docs/zero-trust#service-tokens) (`cipi zt access enable --api --allow=none`) also needs the headers of a service token: `CF-Access-Client-Id` and `CF-Access-Client-Secret` (`cipi zt service-token create <name> --for=api`).

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
| `GET`, `PUT` | `/api/apps/{name}/jit` ([the OPcache JIT of one app](/docs/php-jit): `enabled`, optional `buffer`) | `apps-view` / `apps-edit` |
| `GET`, `PUT`, `DELETE` | `/api/apps/{name}/health`, `POST …/health/check` | `health-view` / `health-manage` |
| `GET` | `/api/apps/{name}/logs?type=&page=&per_page=` | `apps-view` |

`POST /api/apps` takes `domain`, `repository`, `branch`, `php`, `env`, `engine` (`mariadb`/`pgsql`), `octane`, `node_build`, `custom` + `docroot` (repository optional for SFTP-only sites), or Node fields (`node`: `spa|static|ssr`, `framework`, `node_version`, `build`, `start`, `output`, `health_path`). The same rules as [`cipi app create`](/docs/create-app) apply. `PUT` forwards only fields that changed; a `domain` already used elsewhere answers `409`. App objects return `type` (`laravel`, `custom`, `node`), `env`, `suspended`, `basic_auth`, `octane`, `redirects`, `proxies` and `databases`.

`PUT /api/apps/{name}/env` takes `set` (keys and values), `unset` (keys) and `order`: every key of the file after `set`/`unset`, each once, in the order they should be in (comments above a key move with it; an `order` alone is enough). It answers `vars` in file order. `GET /api/apps/{name}/basicauth` returns `enabled`, `users` and `agent` (`mode`, `public_prefix`).

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

`deploy/status` is safe to poll: running, queued, interrupted or idle, with trigger, branch, phase, elapsed time and optional log tail. It also returns `paused_commit`: the commit whose automatic deploy failed, which the webhook does not deploy again ([paused commit](/docs/deploying#paused)); `deploy/unlock` resumes it, and its job result says `resumed` and `resumed_commit`. `deploy/audit` returns the [hash-chained ledger](/docs/deploy-audit).

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
| `POST` | `/api/backups/destinations` — an SFTP destination: `{type: "sftp", name, host, user, port?, path?}` | `backups-manage` |
| `PUT`, `DELETE` | `/api/backups/destinations/{name}` — change it (`host`, `port`, `user`, `path`, `new_key: true`), remove it | `backups-manage` |
| `GET` | `/api/backups/destinations/{name}/key` — its public key | `backups-view` |

Restore takes a server `file` or an `upload_id`: dumps (`.sql`, `.sql.gz`, up to 2 GB by default) are uploaded in chunks and deleted when the job ends. `dbs/engines` lists each engine with `status`, `port`, `default`, `server` and `label`: where [`cipi db switch mysql`](/docs/databases#mysql) ran, the engine is still `mariadb` and `server` is `mysql`. Backup profiles take `exclude_paths` ([paths left out](/docs/backups#exclude-paths)). **Only SFTP destinations are added over the API** ([SFTP](/docs/backups#sftp)): Cipi makes the key on the server, and `POST` answers `201` with the destination and its `public_key` — the remote must accept it before `POST /api/backups/destinations/test` with `{"name": "box"}` passes. Nothing secret is sent or returned. An S3 bucket takes a secret key, so it is added on the server with `cipi backup destination add`; a `POST` of another `type` is a `422`. `DELETE` refuses (`422`) a destination a profile still uses; the archives on it stay there.

```bash
$ curl -X POST https://api.example.com/api/backups/destinations \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"type": "sftp", "name": "box", "host": "u123456.your-storagebox.de", "user": "u123456", "port": 23, "path": "cipi"}'
{"data": {"name": "box", "type": "sftp", "host": "u123456.your-storagebox.de", "port": 23, "user": "u123456", "path": "cipi", "public_key": "ssh-ed25519 AAAA… cipi-backup-box@web1"}}
```

### Server {#endpoints-server}

| Method | Path | Ability |
| --- | --- | --- |
| `GET` | `/api/status` (same JSON as `cipi status`) | `status-view` |
| `GET`, `POST` | `/api/php`, `/api/php/install` | `php-view` / `php-manage` |
| `GET`, `POST` | `/api/frankenphp`, `/api/frankenphp/upgrade` (the FrankenPHP build of each Octane app) | `php-view` / `php-manage` |
| `GET`, `PUT`, `POST` | `/api/apps/{name}/octane`, `/octane/php`, `/octane/restart` ([the PHP of an Octane app](#endpoints-octane)) | `php-view` / `php-manage` |
| `GET`, `POST`, `DELETE` | `/api/ssh/keys[/{n}]` | `ssh-view` / `ssh-manage` |
| `GET`, `PUT`, `POST`, `DELETE` | `/api/ip-whitelist` (show; replace the list; add one; remove one), `POST /api/ip-whitelist/allow-all` ([IP allowlist](#cipi-api-ip-whitelist)) | `ip-whitelist-view` / `ip-whitelist-manage` |
| `GET`, `POST` | `/api/services`, `/services/{name}/restart` | `services-view` / `services-manage` |
| `GET`, `POST` | `/api/valkey`, `/valkey/isolate`, `/valkey/share`, `/valkey/{app}/restart`, `/valkey/flush-shared` ([Valkey per app](#endpoints-valkey)) | `services-view` / `services-manage` |
| `GET`, `PUT`, `DELETE`, `POST` | `/api/smtp`, `/smtp/enable`, `/disable`, `/test` | `smtp-view` / `smtp-manage` |
| `GET` | `/api/notifications`, `/api/notifications/triggers` ([notifications](/docs/notifications#panel)) | `notifications-view` or `smtp-view` |
| `POST`, `PUT`, `DELETE` | `/api/notifications/channels[/{id}]` (with `events`: what the channel receives), `/channels/{id}/enable`, `/disable`, `/test`, `/api/notifications/triggers`, `/triggers/reset` | `notifications-manage` or `smtp-manage` |
| `GET`, `PUT` | `/api/notifications/settings` ([time zone and server name](#endpoints-notification-settings)) | `notifications-view` / `notifications-manage`, or the `smtp-*` pair |
| `GET` | `/api/health` | `health-view` |
| `GET`, `POST`, `PUT`, `DELETE` | `/api/node`, `/node/install`, `/node/upgrade`, `/node/default`, `/node/{major}` | `node-view` / `node-runtimes-manage` |
| `GET`, `POST` | `/api/apps/{name}/node`, `/node/restart` (blue/green) | `node-view` / `node-manage` |
| `GET`, `POST` | `/api/search`, `/api/apps/{name}/search/enable`, `/disable` | `search-view` / `search-manage` |
| `GET` | `/api/disk`, `/api/disk/dbs` | `disk-view` |
| `GET` | `/api/packages` ([optional packages](#endpoints-packages)) | `packages-view` |
| `POST`, `DELETE` | `/api/packages/{id}` (jobs `package-install`, `package-remove`) | `packages-manage` |
| `GET` | `/api/monitor`, `/api/zt` (with `details`, the whole [Zero Trust](/docs/zero-trust#panel) picture: the Cloudflare tunnel and the mesh network) | `monitor-view`, `zt-view` |
| `POST`, `DELETE`, `PUT` | `/api/zt/mesh`, `/api/zt/mesh/lock`, `/api/zt/mesh/ssh` ([the mesh network](#endpoints-zt)) | `zt-manage` |
| `GET` | `/api/metrics`, `/api/metrics/series`, `/api/apps/{name}/metrics`, `/api/metrics/uptime`, `/api/metrics/events`, `/api/metrics/settings` ([metrics](/docs/metrics)) | `metrics-view` |
| `PUT`, `DELETE`, `POST` | `/api/metrics/settings`, `/api/metrics/heartbeat`, `/heartbeat/test` | `metrics-manage` |
| `GET`, `PUT` | `/api/apps/{name}/basicauth/agent` ([cipi/agent and basic auth](/docs/basic-auth#agent)) | `apps-basicauth` |
| `GET`, `POST`, `DELETE` | `/api/sync/key`, `/sync/check`, `/sync/trust`, `/sync/push` ([moving apps](#endpoints-sync)) | `sync-manage` |
| `GET`, `PUT` | `/api/self-update/policy` ([how the server updates Cipi](#endpoints-self-update)) | `updates-view` / `updates-manage` |
| `GET` | `/api/jobs/{id}` | the job's ability |

### Moving apps to another server {#endpoints-sync}

[`cipi sync`](/docs/sync) over the API. The server the token belongs to is the **source**: it exports the apps, encrypts the archive, sends it over SSH and has the target import it.

| Method | Path | Does |
| --- | --- | --- |
| `GET` | `/api/sync/key` | This server's sync key: `{key, type, fingerprint, comment}` — what a target trusts |
| `POST` | `/api/sync/check` — `{host, port?, user?}` | Can it send there: `{ok, host, port, user, cipi, reason, message}`; `reason` is `not-trusted`, `unreachable`, `host-key-changed`, `no-cipi` or `no-key` |
| `POST`, `DELETE` | `/api/sync/trust` — `{key}` | On the target: trust a source's key, or take it back (`changed`: whether anything changed) |
| `POST` | `/api/sync/push` — `{host, port?, user?, apps?, with_db?, with_storage?}` | `202`, a job of type `sync-push` with the transfer's output; no `apps` means every app |

There is no passphrase in any of them: the source makes one for the transfer and hands it to the target over SSH, on the target's standard input. `sync-manage` is as strong as `ssh-manage` — it sends apps, their databases and their files to a host the caller names, and lets another server send apps here — so give it only to who would have SSH. Node apps are not moved yet: `push` skips them and says so.

### How the server updates Cipi {#endpoints-self-update}

The two optional safeguards of [self-update](/docs/self-update): only releases signed by a trusted key (signed releases are not available at the moment), and a delay before a new release is installed.

| Method | Path | Ability |
| --- | --- | --- |
| `GET` | `/api/self-update/policy` | `updates-view` |
| `PUT` | `/api/self-update/policy` — `{verify?, delay_hours?, fingerprint?}` | `updates-manage` |

`GET` answers `verify`, `delay_hours` (0 to 168), `delay_default_hours`, `signers` (the keys this server trusts: `fingerprint`, `principal`), `signers_ready`, `shipped_signers` (the keys shipped with the installed Cipi), `pending` (a release waiting for its delay: `sha`, `version`, `first_seen`), `held` (why the last update wasn't installed: `reason`, `at`) and `installed_sha`. `PUT` changes what is given. Turning `verify` on the first time takes `fingerprint` — one of the `shipped_signers`, compared with the [published one](/docs/self-update#signers); anything else is a `422` and nothing changes. **Starting an update is not in the API**: it stays the server's, at night or at its shell.

```bash
$ curl -X PUT https://api.example.com/api/self-update/policy \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"delay_hours": 12}'
```

### Firewall {#endpoints-firewall}

What the [panel's Firewall tab](/docs/firewall#panel) uses.

| Method | Path | Ability |
| --- | --- | --- |
| `GET` | `/api/firewall` (UFW, protected ports, Zero Trust locks, Fail2ban, CrowdSec) | `firewall-view` |
| `POST`, `DELETE` | `/api/firewall/rules` (`port`, `from`, `proto`; `action: deny` to remove a deny) | `firewall-manage` |
| `POST`, `DELETE` | `/api/firewall/blocks` (`address`) | `firewall-manage` |
| `PUT` | `/api/firewall/attempts` (1–100, `null` for the default) | `firewall-manage` |
| `DELETE` | `/api/firewall/bans` (`address`: Fail2ban and CrowdSec at once) | `firewall-manage` |
| `POST`, `DELETE` | `/api/firewall/crowdsec/allowlist` (`address`) | `firewall-manage` |
| `POST` | `/api/firewall/crowdsec/enable`, `/disable` (jobs `crowdsec-enable`, `crowdsec-disable`) | `firewall-manage` |
| `PUT`, `DELETE` | `/api/firewall/real-ip` (on, or the ranges fetched again; off) | `firewall-manage` |
| `POST` | `/api/firewall/real-ip/refresh` (Cloudflare's ranges fetched again) | `firewall-manage` |

`GET /api/firewall` is `cipi firewall status --json`, typed: every UFW rule with `kind` (`port`, `block`, `other`), `family` (`both`, `v4`, `v6`), `managed_by` (`zero-trust`, `metrics`, `crowdsec`), `protected` and `removable`. Changes answer `{data, message}` with the firewall after them. The CLI's refusals ([what stays open](/docs/firewall#protected): SSH, 80 and 443, a Zero Trust lock, a block that takes in the caller's address, a rule that isn't there) are `422` with its message. Enabling CrowdSec answers `422` with `blockers` when the server can't take it, and allowlists the caller's address. The API never sends `--force`, and the CLI ignores it from the API anyway.

`GET /api/firewall` has `real_ip` — [the visitor's address behind Cloudflare](/docs/nginx#real-ip): `enabled`, `kept_by` (`real-ip`, `zero-trust`, `both`, `other` for a configuration Cipi didn't write), `ranges`, `refreshed_at`, `can_disable`, `bans_active` — `null` when the server's Cipi doesn't have it yet. `PUT /api/firewall/real-ip` turns it on, `DELETE` turns it off (`off --yes`: ask first, with what `bans_active` means) and answers `409` when the request itself came through Cloudflare (`CF-Connecting-IP`), since from then on the API would see Cloudflare instead of the caller.

### Zero Trust: the mesh network {#endpoints-zt}

A [Tailscale or NetBird network](/docs/mesh-network) joined, locked and left over the API. Synchronous: each call answers `{data, message}` — `data` is Zero Trust after the change, the same as `GET /api/zt`, and `message` what the CLI said.

| Method | Path | Body | Does |
| --- | --- | --- | --- |
| `POST` | `/api/zt/mesh` | `provider` (`tailscale`, `netbird`), `key`, `hostname`, `control_url`, `tags`, `direct`, `accept_dns`, `accept_routes`, `ssh`, `reauth` | Joins: installs the client, signs in, lets the mesh through UFW. Closes nothing. A minute or two |
| `DELETE` | `/api/zt/mesh` | — | Leaves: reopens what its locks closed, removes the client |
| `POST` | `/api/zt/mesh/lock` | `port`: `ssh` or `http` | Closes the SSH port, or 80 and 443, to the world: open on the mesh only |
| `DELETE` | `/api/zt/mesh/lock` | `port` | Reopens it |
| `PUT` | `/api/zt/mesh/ssh` | `enabled` | Tailscale SSH on or off |

`key` is a Tailscale auth key or a NetBird setup key: 8 to 512 characters, no spaces or quotes. It is passed to the CLI as a flag of a synchronous command — never a job — and is never stored or returned. Left out, a client that is already installed and connected is adopted. `tags`, `ssh` and `reauth` are Tailscale's; `control_url` is a Headscale or a self-hosted NetBird.

**The server refuses what would lock people out** (`422`, the reason in `error`), and there is no `--force` over the API:

| Call | Refused while |
| --- | --- |
| `lock` `ssh` | sshd has accepted no login that came over the mesh; the node key can expire; UFW is off; sshd doesn't listen on the mesh address; Tailscale SSH is on |
| `lock` `http` | An app renews its certificate over HTTP-01; the caller reaches the API on the public address the lock would close |
| `DELETE /api/zt/mesh` | The caller reaches the server over the mesh |

`GET /api/zt` answers it beforehand in `details.mesh.panel`: `via` (`mesh`, `local`, `tunnel`, `public`, `unknown` — how this call reached the server), `from`, and `blocked` with `lock_ssh`, `lock_http` and `disable`, each `null` or the reason. `details.mesh.ssh.seen` is the last SSH login that came over the mesh, `details.mesh.http01_apps` the apps still on HTTP-01.

A panel that runs on the server it manages reaches the API locally, but its own pages are on 80/443: it adds `client` — the address of the person's browser — to the body of a change and to `GET /api/zt?client=`, and `lock` `http` is refused while they look at the panel on the public address.

```bash
$ curl -X POST https://api.example.com/api/zt/mesh -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d '{"provider":"tailscale","key":"tskey-auth-…","tags":["cipi"]}'
$ curl -X POST https://api.example.com/api/zt/mesh/lock -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d '{"port":"ssh"}'
```

On a server whose Cipi has no mesh yet the routes answer `503` before anything runs, saying what to update.

### Notification channels: events {#endpoints-notification-events}

`POST /api/notifications/channels` and `PUT /api/notifications/channels/{id}` take `events`: `null` for [everything](/docs/notifications#events), or a list of categories (`security`, `deploy`, `backup`…), single triggers (`backup_fail`) and `urgent`. Alone, it changes only what the channel receives (for SMTP: no new settings, no test). `GET /api/notifications` gives every channel its `events` and lists the server's `categories` (`id`, `label`, `triggers`). A server whose Cipi doesn't know `events` yet refuses the request (`503`) rather than saving the channel without them.

```bash
$ curl -X PUT https://api.example.com/api/notifications/channels/oncall \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"events": ["urgent", "security"]}'
```

### Nginx directives {#endpoints-nginx}

`GET /api/apps/{name}/nginx` answers `{app, config, bytes, max_bytes, active, suspended}`: `config` is the text an app adds to [its own server block](/docs/nginx#custom), empty when it has none. `PUT` with `{"config": "…"}` replaces it (an empty one removes it), `DELETE` removes it. Both are **synchronous**: `nginx -t` runs before Nginx reloads.

A text that is refused changes nothing and answers `422` with `reasons`, one per line — `line 2: unknown directive "boom"` from Nginx, or the directive the API doesn't take. From the API only [a subset of Nginx's language](/docs/nginx#custom-api) is accepted: no log path, `include`, `listen`, `server_name`, `*_pass` or certificates, `root` and `alias` under the app's home.

### Page cache {#endpoints-cache}

The [page cache](/docs/page-cache) of an app: Nginx answers with the page PHP made, without running PHP — not OPcache, which is always on.

| Method | Path | Ability |
| --- | --- | --- |
| `GET` | `/api/apps/{name}/cache`, `/api/cache` (every app) | `nginx-view` |
| `PUT` | `/api/apps/{name}/cache` — `{enabled, ttl?, size?, clear_on_deploy?, exclude?}` | `nginx-manage` |
| `PUT` | `/api/apps/{name}/cache/exclude` — `{exclude: ["/cart*", "/feed"]}` | `nginx-manage` |
| `POST` | `/api/apps/{name}/cache/clear` | `nginx-manage` |
| `POST` | `/api/apps/{name}/cache/purge` — `{paths: ["/hello-world/", "/blog/*"]}` | `nginx-manage` |

`GET` answers `supported` (false for a Node app), `kind` (`fastcgi`, `proxy`), `enabled`, `active`, `ttl`, `ttl_seconds`, `size`, `clear_on_deploy`, `exclude` (the app's [own paths that are never cached](/docs/page-cache#exclude)), `files` and `bytes` on disk now, `path`, `suspended` and `clear_command` — what [a recipe of your own](/docs/page-cache#recipe) runs to empty it. `PUT` with `enabled: true` changes what is given and leaves the rest (`ttl`, `size`, `clear_on_deploy` and `exclude` with `enabled: false` are a `422`). `…/cache/exclude` sets the whole list, with the cache on or off; an empty one keeps none, and a path that isn't one (letters, digits, `. _ ~ % - /` and `*`, 50 at most) is a `422` before anything runs. `clear` answers the cache after it, with `cleared`. `purge` deletes only the pages given ([purge some pages](/docs/page-cache#purge)): a path, a prefix ending in `*`, or a URL on a domain of the app — no query string, 500 at most — and answers `{app, enabled, purged, targets}`, `purged` being the cached files that went; a page that isn't one is a `422` and nothing is purged. Synchronous: `nginx -t` runs before the reload, and a refusal is a `422` with the server's words.

```bash
$ curl -X PUT https://api.example.com/api/apps/blog/cache \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"enabled": true, "ttl": "1h"}'
$ curl -X POST https://api.example.com/api/apps/blog/cache/clear -H "Authorization: Bearer $TOKEN"
$ curl -X POST https://api.example.com/api/apps/blog/cache/purge \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"paths": ["/hello-world/", "/category/news/*"]}'
```

### The PHP of an Octane app {#endpoints-octane}

An [Octane app runs two PHP](/docs/octane#octane-php): the one inside its FrankenPHP build answers the requests, the server's runs Composer, artisan, cron and the workers.

| Method | Path | |
| --- | --- | --- |
| `GET` | `/api/apps/{name}/octane` | `php`, `octane_php`, `build`, `frankenphp`, `state` (`ok`, `mismatch`, `vulnerable`, `unpinned`, `missing`), `restart_pending`, `available_php`, and for a mismatch `fix: {command, why}` |
| `PUT` | `/api/apps/{name}/octane/php` — `{"php": "8.5"}` | Job `octane-php`: both on that version, by its number |
| `POST` | `/api/apps/{name}/octane/restart` | Job `octane-restart`: restarted on its build, and checked |

An app that isn't on Octane answers `422`. The job fails, with nothing changed, when no FrankenPHP release carries the PHP asked for or when Octane doesn't answer on the new build.

### Valkey per app {#endpoints-valkey}

[Who shares the server's Valkey](/docs/valkey#manage) and who has an instance of its own.

| Method | Path | |
| --- | --- | --- |
| `GET` | `/api/valkey` | `shared_port`, `apps` (`app`, `uses`: `own`, `shared`, `external`, `none`; `port`, `instance`, `memory`, `keys`), `shared` (the apps still on the shared instance), `isolated` |
| `POST` | `/api/valkey/isolate` — `{"app": "shop"}` or `{"all": true}`; `copy: false` to start empty | Job `valkey-isolate`; `result` has `moved`, `left`, `shared_can_be_flushed` |
| `POST` | `/api/valkey/share` — `{"app": "shop"}` | Job `valkey-share` |
| `POST` | `/api/valkey/{app}/restart` | Synchronous; the list after it |
| `POST` | `/api/valkey/flush-shared` | Empties the shared instance and changes its password; `409` while an app uses it |

> [!security] **No password leaves the server through these routes.** The list has none, and the new shared password that `cipi valkey flush-shared` prints once is neither returned nor put in an error: it stays in `cipi credentials`.

### Notification settings {#endpoints-notification-settings}

`GET /api/notifications/settings` answers `timezone` (`null`: the server's own), `server_timezone`, `server_name` (`null`: the hostname), `hostname` and `now` — the time as a notification would write it at this moment. `PUT` takes `timezone`, `server_name` or both; `null` puts the server's own back. The same object is in `GET /api/notifications` as `settings`. See [how notifications are written](/docs/notifications#written).

```bash
$ curl -X PUT https://api.example.com/api/notifications/settings \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"timezone": "Europe/Rome", "server_name": "production"}'
```

### Optional packages {#endpoints-packages}

`GET /api/packages` is `cipi package list --json`: `data.packages`, each entry with `id`, `packages` (apt), `description`, `installed`, `partial`, `kind` (`tools`, `libraries`), `binaries`, `missing`, `source` (`ubuntu`, or `upstream` for the [pinned releases](/docs/packages#upstream)), `version`, `installed_version` and `outdated`.

`POST /api/packages/{id}` installs an entry of the server's [closed catalog](/docs/packages#available) (or completes a partial one), `DELETE /api/packages/{id}` removes it, taking [only what no other package needs](/docs/packages#remove). Both are jobs — apt takes from seconds to a few minutes. An id outside the catalog is `404`, installing what is installed or removing what isn't is `409`; an `outdated` upstream entry can be installed (that updates it) and removed. A download that doesn't match its pinned SHA-256 fails the job, nothing installed. The job result says what happened: `installed`, `already`, `missing` for an install; `removed`, `apt`, `still_needed` for a removal. The API passes `--yes` and nothing else; `--force` and `--autoremove` stay at the server's shell. What the [panel's Packages tab](/docs/packages#panel) uses.

> [!security] **Kept off the API on purpose:** removing PHP versions, switching default PHP or engine, switching MariaDB and MySQL, dropping databases, installing Meilisearch, any apt package outside the [closed catalog](/docs/packages#available), stack upgrades, monitor thresholds, the OpenMetrics endpoint (it opens a port), every change to the Cloudflare side of Zero Trust (the tunnel, hostnames, Access, its locks), `cipi firewall deny`, closing SSH, 80 or 443 from the firewall routes, and the CrowdSec rescue listener. The [mesh network](#endpoints-zt) is the one place where SSH and 80/443 are closed over the API — under an ability of its own, and with the server refusing whatever would lock people out. Installing arbitrary software or destroying data is an operator decision taken at the CLI, so a compromised token can't do it: the package catalog is a fixed list of stateless tools from Ubuntu's repositories, and its removal never takes what other software needs.

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
| `sudo: I'm sorry www-data. I'm afraid I can't do that` on new endpoints (e.g. metrics) | The allowlist is older than the command. `sudo cipi self-update` rewrites it, split into rules of 40 commands for sudo-rs on Ubuntu 26.04 and validated with `visudo` first; check with `sudo -l -U www-data` |
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

`/mcp` exposes the server to AI assistants: apps, deploys and audit, domains, SSL, redirects, proxies, Node, databases, search, limits, disk, `cipi.yml`, server management, the optional packages and the firewall (read-only: `PackageList`, `FirewallStatus`), the page cache of an app (`PageCacheShow`, `PageCacheUpdate`, `PageCachePurge`, `PageCacheClear`), the PHP of an Octane app (`OctanePhpShow`, `OctanePhpSwitch`), Valkey per app (read-only: `ValkeyList`), logs, Artisan and job polling. A token with `mcp-access` covers every tool. Async tools return a `job_id` to poll with `JobShow`; log tools prepend a production warning and redact secrets.

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
