@section gui-architecture

The panel is a standard **Laravel** application distributed as the `cipi/gui` package ([cipi-sh/gui](https://github.com/cipi-sh/gui)). It holds **no state about your servers**: it authenticates to each server's API, submits jobs and polls them. Tear it down and rebuild it elsewhere without touching a managed server. What it keeps of its own are accounts, roles, server connections and, for admins who use them, the credentials of [connectors](/docs/gui-connectors).

## Components {#components}

| Aspect | Detail |
| --- | --- |
| Framework | Laravel 12 or 13, Livewire 3.6+ or 4, no asset build step |
| Package | `cipi/gui` from GitHub, Composer VCS `dev-main` |
| Install path | `/opt/cipi/gui` |
| Config | `/etc/cipi/gui.json` |
| Isolation | Own FPM pool, `open_basedir` limited to its own directories |
| Auth | Session login, optional TOTP or [passkeys](/docs/gui-install#passkeys) (WebAuthn checked by the panel itself, 4.8.0+), optional OpenID Connect SSO |
| Connectors | Providers' APIs called from the panel over HTTPS (4.8.0+); credentials encrypted with `APP_KEY` in `cipi_connector_accounts`, never sent back to the page |
| Jobs | No local queue worker: remote jobs polled through each server's API |

```stack
Panel (cipi/gui) | sessions, roles, server connections
HTTPS + Bearer token | one per server, IP allowlist
Cipi API (cipi/api) | queues async jobs
cipi CLI via sudoers | the same code path as SSH
```

## API coverage {#coverage}

| Area | Endpoints used |
| --- | --- |
| Server | `GET /api/status`; PHP, DB engines, Node runtimes, SSH keys, services, SMTP, search, packages (`POST`/`DELETE /api/packages/{id}` to install and remove, API 1.44+), monitor, Zero Trust (`GET /api/zt` with `details`, API 1.46+), `GET /api/disk` and `/api/disk/dbs`, IP allowlist |
| Apps | CRUD, suspend, fix-permissions, basic auth, logs, `.env`, `auth.json`, Artisan, app commands; create with `engine`, `octane`, Node options; webhook rotation; per-app health check |
| Deploy | Deploy, rollback, unlock, `deploy/audit`, `deploy/history`, `GET /api/deploys/last`, `deploy-config` |
| `cipi.yml` | `GET /api/apps/{name}/yml`, `POST …/yml/apply`, `…/yml/auto/enable|disable` |
| Domains | Aliases, www ↔ apex, SSL install and force HTTPS |
| Routing | `/api/apps/{name}/redirect*`, `/api/apps/{name}/proxies` |
| Node | `GET /api/node`, `/api/apps/{name}/node`, SSR restart |
| Search | `GET /api/search`, per-app enable/disable |
| Databases | List, create, back up, restore (with chunked upload), rotate password, link to apps; deletion stays on the host CLI |
| Backups | `/api/backups…` profiles, runs, destinations test |
| Firewall | `/api/firewall…`: rules, blocks, bans, the SSH login threshold, CrowdSec on/off and allowlist ([firewall](/docs/firewall#panel), API 1.44+), Cloudflare real IP (`/api/firewall/real-ip`, API 1.45+) |
| Jobs | Status, output and parsed `result` (credentials, backup file, webhook token) |

A server with an older API keeps every page it supports; a missing tab says what it needs. Disk sizes are measured when the tab opens, with their own timeout (`CIPI_GUI_HTTP_DISK_TIMEOUT`, 180 s). `cipi ssh apps`, `cipi firewall deny`, the CrowdSec rescue, disk limits and DNS accounts are changed on the host.

## Connectors {#connectors}

The [connectors](/docs/gui-connectors) are the one part of the panel that doesn't go through a Cipi server: Cloudflare, DigitalOcean, AWS, Sentry and the rest are called **from the panel's server**, with the account an admin saved. Requests leave from its IP — the address to allow where a provider filters by IP (Namecheap requires it; Cloudflare tokens can). A server behind [Cloudflare Access](/docs/zero-trust#service-tokens) is still called through its API, with the service token saved on Connections.

```stack
Panel (cipi/gui) | Infrastructure pages, admins
HTTPS + the account's credentials | encrypted at rest
Provider API | Cloudflare, AWS, DigitalOcean, Sentry…
```

> [!info] Prefer the terminal? The [CLI client](/docs/cli-client) does the same over the API, and the [WHMCS module](/docs/whmcs) automates it for hosting providers.
