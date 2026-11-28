@section cli-install

`cipi-cli` manages your Cipi servers **from your laptop, without SSH**. It's a single Go binary (Linux and macOS, amd64 and arm64, MIT) that talks to each server's [Cipi API](/docs/api): apps, deploys, `cipi.yml`, SSL, databases and anonymized dumps, PHP, services, keys, SMTP, health checks and disk usage. One profile per server, so a fleet is one command away.

<cipi-term name="cli-client"></cipi-term>

> [!info] Each server needs [`cipi api`](/docs/api) installed, and a token from `cipi api token create`.

## Install {#install}

```bash
$ chmod +x cipi-cli-* && sudo mv cipi-cli-* /usr/local/bin/cipi-cli   # from GitHub Releases
$ cipi-cli version
```

Binaries ship with SHA-256 checksums on [GitHub Releases](https://github.com/cipi-sh/cli/releases). From source: `git clone https://github.com/cipi-sh/cli && cd cli && make build && sudo make install`.

@section cli-configure

## Configure a server {#configure}

A **profile** is one server: API endpoint plus token, stored in `~/.cipi/config.json` (mode `0600`).

```bash
$ cipi-cli api token add prod
Cipi API endpoint: https://api.example.com
API token: 1|yourtoken...
Server profile "prod" saved → ~/.cipi/config.json

$ cipi-cli profiles add staging --endpoint https://api.staging.example.com --token "1|…"
```

@section cli-profiles

## Profiles {#profiles}

Prefix any command with a profile to target that server, or set a default.

```bash
$ cipi-cli prod deploy shop
$ cipi-cli profiles use prod
$ cipi-cli apps list               # uses prod
$ cipi-cli staging apps list       # an explicit prefix still wins
```

| Command | Does |
| --- | --- |
| `profiles` / `profiles list` | List servers (alias `servers`) |
| `profiles add <name>` | Add or update (`--endpoint`, `--token`) |
| `profiles show [name]` | One profile, token masked, or all |
| `profiles use <name>` | Default server |
| `profiles delete <name>` | Local credentials only; nothing changes on the server |

@section cli-apps

## `apps` {#apps}

| Command | Does |
| --- | --- |
| `apps list`, `apps show <app>` | List, details (environment included) |
| `apps create [flags]` | Create; prints credentials, deploy key and whether the key can read the repository |
| `apps edit <app> [flags]` | PHP, repository, branch, environment, domain, Node settings |
| `apps delete <app> [-y]` | Delete |
| `apps suspend`, `unsuspend <app>` | 503 maintenance page, without deleting |
| `apps logs <app> [--type --page --per-page]` | nginx, php, laravel, worker, deploy; page 1 is newest |
| `apps artisan <app> <cmd>` | Artisan as an async job |
| `apps run <app> <cmd>` | Allowlisted binaries (`cipi-cli run-commands`) |
| `apps env show|set <app>` | Read `.env` in file order, or `--set KEY=VALUE` / `--unset KEY` / `--order K1,K2,…` |
| `apps env order <app> KEY… [--after K / --before K]` | Move keys, the others keep their place |
| `apps auth show|create|update|delete <app>` | Composer `auth.json` |
| `apps basicauth status|enable|disable <app>` | HTTP Basic Auth: status with users and cipi/agent routes |
| `apps node status|restart <app>` | Node status, blue/green restart |
| `apps search enable|disable <app>` | Meilisearch for one app |
| `apps webhook recreate <app> [--rotate-secret]` | New Git webhook, optionally a new secret |
| `apps fix-permissions <app>` | Restore home permissions |

| Create flag | Meaning |
| --- | --- |
| `--user`, `--domain` | App name (Linux user, database), primary domain |
| `--repository`, `--branch` | Git source |
| `--php` | e.g. `8.6` |
| `--env` | Environment label; picks [`cipi-<env>.yml`](/docs/yml) |
| `--engine` | `mariadb` or `pgsql` |
| `--octane` | `true` / `frankenphp` |
| `--node-build` | Asset build on every deploy, e.g. `npm ci && npm run build` |
| `--custom`, `--docroot` | Non-Laravel app |
| `--node`, `--framework`, `--node-version`, `--build`, `--start`, `--output`, `--health-path` | [Node apps](/docs/node-apps) |

```bash
$ cipi-cli apps create --user=shop --domain=shop.com --php=8.6 \
    --repository=git@github.com:acme/shop.git --branch=main --node-build='npm ci && npm run build'
$ cipi-cli apps create --user=shop-stg --domain=staging.shop.com \
    --repository=git@github.com:acme/shop.git --branch=develop --env=staging
$ cipi-cli apps create --user=web --domain=web.acme.com --node=ssr --framework=next \
    --repository=git@github.com:acme/web.git
$ cipi-cli apps artisan shop migrate --force
$ cipi-cli apps env set shop --set APP_DEBUG=false --unset OLD_KEY
$ cipi-cli apps env order shop DB_HOST DB_PORT --after APP_URL
$ cipi-cli apps logs shop --type=deploy
```

Subcommands need the matching token abilities (`apps-artisan`, `apps-run`, `apps-env`, `apps-auth`).

@section cli-domains

## `domains` {#domains}

Every primary domain and alias on the server in one table: handy to audit DNS or spot missing certificates.

```bash
$ cipi-cli domains
 DOMAIN          APP    KIND     TYPE     PHP  SSL
 shop.com        shop   primary  Laravel  8.6  ✓
 www.shop.com    shop   alias    Laravel  8.6  ✓
```

@section cli-deploy

## `deploy` and `yml` {#deploy}

| Command | Does |
| --- | --- |
| `deploy <app>` | Zero-downtime deploy, waits for the job |
| `deploy rollback <app> [-y]` | Previous release |
| `deploy status <app> [--tail N]` | Running, queued, interrupted or idle, the last run, and a [paused commit](/docs/deploying#paused) |
| `deploy unlock <app>` | Clear a stuck lock now; resume a paused commit |
| `deploy config show|set <app>` | `deploy.php` options: `--optimize`, `--storage-link`, `--queue-restart`, `--horizon-terminate`, `--predeploy-snapshot`, `--node-build`, `--extra-artisan` |
| `deploy audit <app> [--days N]` | [Deploy ledger](/docs/deploy-audit): origin, operator, IP, commit |
| `yml <app>` | The live `cipi.yml`: file, environment, validity, what applying would change |
| `yml apply <app>` | Apply it as a job |
| `yml auto <app> on|off|status` | Apply after every deploy (asks for confirmation) |

```bash
$ cipi-cli deploy shop
Deploying shop...
Polling job #42... completed
Deployed to release #14. Zero downtime.
```

`yml` needs a token with `yml-view` / `yml-manage`. With auto-apply on, anyone who can push can change the app's server settings: that's the point, and the reason it asks first.

@section cli-ssl

## `ssl` {#ssl}

| Command | Does |
| --- | --- |
| `ssl install <app>` | Let's Encrypt for the primary domain and all aliases |
| `ssl force <app>` | Re-apply the HTTP → HTTPS redirect |

@section cli-www

## `www` {#www}

| Command | Does |
| --- | --- |
| `www status <app>` | Current www / apex setup |
| `www add <app>` | Add the counterpart as an alias |
| `www force-to-root` / `force-from-root <app>` | 301 to apex / to www |
| `www clear <app>` | Remove the canonical redirect |

@section cli-redirect

## `redirect` and `proxies` {#redirect}

| Command | Does |
| --- | --- |
| `redirect list <app>` | Whole-app and path redirects |
| `redirect set <app> --to URL [--code] [--keep-path]` | Whole app to a URL, one hop |
| `redirect enable|disable|unset <app>` | Toggle or remove it |
| `redirect add <app> --from /path --to URL` | Path redirect; a trailing `/` means prefix |
| `redirect remove <app> --from /path` | Remove |
| `proxies list|add|remove <app>` | Prefix proxies (`--prefix`, `--upstream`, `--strip-prefix`, `--preserve-host`, `--timeout`, `--buffering`) |

```bash
$ cipi-cli redirect add shop --from /blog/ --to https://blog.acme.com/
$ cipi-cli proxies add shop --prefix /api --upstream http://127.0.0.1:8080 --strip-prefix
```

## `nginx` {#nginx}

An app's [own Nginx directives](/docs/nginx#custom): headers, caching, limits, rewrites, `location` blocks, kept by Cipi and included in the app's server block.

| Command | Does |
| --- | --- |
| `nginx show <app>` | Print them (redirect to a file to keep a copy; `--json` for scripts) |
| `nginx edit <app>` | Open them in `$VISUAL` / `$EDITOR` on your computer; a changed text is sent, tested and made live |
| `nginx set <app> --file <path>` | Replace them with a file's content (`-` for stdin) |
| `nginx reset <app>` | Remove them (`-y` to skip the question) |

```bash
$ cipi-cli nginx edit shop
$ cipi-cli nginx show shop > shop.nginx.conf
$ cipi-cli prod nginx set shop --file shop.nginx.conf
```

The server tests every change with `nginx -t`; a refused text changes nothing, its reasons are printed line by line and `edit` offers the editor again. From the API [a subset of Nginx's language](/docs/nginx#custom-api) is accepted. Needs the `nginx-view` / `nginx-manage` abilities.

## `cache` {#cache}

The [page cache](/docs/page-cache) of an app: Nginx keeps the page PHP made and answers the next visitors without running PHP. Not OPcache, which is always on.

| Command | Does |
| --- | --- |
| `cache` | Every app: on or off, how long pages are kept, pages and bytes on disk |
| `cache show <app>` | One app, with the command that empties it on the server |
| `cache on <app> [--ttl 10m] [--size 256m] [--exclude '/cart*,/feed'] [--deploy-clear=false]` | Turn it on, or change it when it is on |
| `cache ttl <app> <time>` | How long a page is kept: `30s`, `10m`, `1h`, `7d` |
| `cache exclude <app> [add\|remove\|set <path>…]` | The app's [own paths that are never cached](/docs/page-cache#exclude): the list, more, fewer (`remove --all` for none), exactly these |
| `cache purge <app> <page>…` | Delete only those pages: a path (`/hello-world/`), a prefix (`/blog/*`), a URL on a domain of the app — the rest stays cached ([purge some pages](/docs/page-cache#purge)) |
| `cache clear <app>` | Delete the cached pages now |
| `cache off <app>` | Every request runs PHP again |

```bash
$ cipi-cli cache on blog --ttl 1h
$ cipi-cli cache exclude blog add '/wishlist*' /feed
$ cipi-cli cache purge blog /hello-world/ '/category/news/*'
$ cipi-cli cache clear blog
```

Cipi empties the cache after every deploy by itself. Needs the `nginx-view` / `nginx-manage` abilities.

@section cli-aliases

## `aliases` {#aliases}

```bash
$ cipi-cli aliases add shop www.shop.com
$ cipi-cli aliases list shop
$ cipi-cli aliases remove shop old.shop.com -y
$ cipi-cli ssl install shop      # re-issue to cover new aliases
```

@section cli-db

## `db` {#db}

| Command | Does |
| --- | --- |
| `db engines`, `db install <engine>` | Installed engines, with the server on 3306 (MariaDB or [MySQL](/docs/databases#mysql)); install `mariadb` or `pgsql` |
| `db list [--engine]` | Databases with sizes |
| `db create <name> [--engine]` | Create |
| `db backup <name>` | Compressed backup on the server |
| `db restore <name> [-y]` | Restore the latest backup |
| `db password <name>` | New password, linked app `.env` updated |
| `db anonymize <app> --email` | Anonymized dump through `cipi/agent` |
| `db anonymize download <url> [-o file]` | Download from the signed link (`-o -` for stdout) |

<h3 id="cli-db-anonymize">Anonymized dumps</h3>

The CLI reads `APP_URL` and the anonymizer token from the app's `.env` through the API and calls the [agent](/docs/anonymizer) on the app. The signed link arrives by e-mail and lasts 15 minutes.

```bash
$ cipi-cli apps artisan shop cipi:service anonymize --enable
$ cipi-cli apps artisan shop cipi:generate-token anonymize
$ cipi-cli apps artisan shop cipi:init-anonymize
$ cipi-cli prod db anonymize shop --email dev@example.com
✓ Anonymization job queued for 'shop'
$ cipi-cli db anonymize download "<signed url>" -o - | mysql -u root shop_local
```

Flags: `--email`, `--url` (when the app redirects, redirects are never followed), `--token`, `-o`, `--force`. Custom and Node apps are refused.

@section cli-php

## `backup` {#backup}

| Command | Does |
| --- | --- |
| `backup`, `backup status` | Destinations, profiles, last runs, what no profile covers |
| `backup runs [--profile P]` | Runs each destination holds |
| `backup run [profile]`, `backup verify [profile]` | Start a run in the background; check that the newest run opens |
| `backup profile add <name> --dest local,s3 [flags]`, `edit <name> [flags]` | `--scope`, `--apps`, `--databases`, `--exclude-databases`, `--exclude-tables`, `--exclude-paths`, `--every` or `--cron`, `--keep`, `--keep-days`, `--keep-weeks`, `--encrypt` |
| `backup profile enable|disable|remove <name>` | |
| `backup destination test [name]` | Reach each remote destination: an S3 bucket with its credentials, an SFTP server with its key |
| `backup destination add <name> --host <host> --user <user> [--port 22] [--path dir]` | An [SFTP destination](/docs/backups#sftp): a VPS, a Hetzner Storage Box (`--port 23`). Prints the public key the remote must accept |
| `backup destination edit <name> [--host …] [--port …] [--user …] [--path …] [--new-key]` | Change it; `--new-key` makes a new key, to install on the remote again |
| `backup destination key <name>` | Its public key again |
| `backup destination remove <name> [-y]` | Remove an SFTP destination no profile uses (its archives stay on it) |

```bash
$ cipi-cli backup profile edit nightly --exclude-paths storage/app/uploads,*.mp4
$ cipi-cli backup profile edit nightly --exclude-paths ""     # take everything again
```

```bash
$ cipi-cli backup destination add box --host u123456.your-storagebox.de --user u123456 --port 23 --path cipi
$ cipi-cli backup destination test box          # once the remote accepts the key
$ cipi-cli backup profile edit nightly --dest local,box
```

SFTP destinations are made here: the server makes the key, and nothing secret is sent. S3 buckets are added on the server (`cipi backup destination add`): an S3 secret never goes through the API. See [Backups](/docs/backups), and [Exclude files and folders from backups](/guides/exclude-files-from-backups) for patterns and `cipi.yml` examples.

## `php` {#php}

| Command | Does |
| --- | --- |
| `php list` | Installed versions, FPM status, default; legacy versions marked |
| `php install <version>` | `8.3`, `8.4`, `8.5` or `8.6` (async job) |

Switching the default and removing versions stay on the server (`cipi php switch|remove`).

## `octane` {#octane}

The [PHP of an Octane app](/docs/octane#octane-php): the one inside its FrankenPHP build answers the requests, the server's runs Composer, artisan, cron and the workers.

| Command | Does |
| --- | --- |
| `octane show <app>` | Both PHP, the build, and — when they are two versions — the command that puts them on one |
| `octane php <app> <version>` | Both on that version, by its number (async job): Octane is checked, and the previous build returns if it doesn't answer |
| `octane restart <app>` | Restart Octane on its build and check it |
| `octane builds` | The FrankenPHP build of every Octane app |
| `octane upgrade [app]` | The newest build on the app's own PHP — never another version |

```bash
$ cipi-cli octane show shop
$ cipi-cli octane php shop 8.6
```

Needs the `php-view` / `php-manage` abilities.

@section cli-services

## `services` and `ssh-keys` {#services}

| Command | Does |
| --- | --- |
| `services list [name]` | Status of system services |
| `services restart <name>` | e.g. `nginx`, `mariadb`, `php8.6-fpm` |
| `ssh-keys list` | Authorized keys of the `cipi` user, with ids |
| `ssh-keys add [key] [--file F]` | Add a public key |
| `ssh-keys remove <id>` | Remove one |

## `valkey` {#valkey}

[Valkey per app](/docs/valkey#manage), for the whole server:

| Command | Does |
| --- | --- |
| `valkey` | Every Laravel app with what it uses: its own instance, or the shared one |
| `valkey isolate <app>` / `--all` | Give an app, or every app still on the shared instance, its own (`--no-copy` to start empty; `-y` skips the question) |
| `valkey share <app>` | Move it back and remove its instance |
| `valkey restart <app>` | Restart an app's instance |
| `valkey flush-shared` | Once nobody uses it: empty the shared instance and change its password |

No password travels through the API: the new shared one stays on the server (`cipi credentials`). Needs the `services-view` / `services-manage` abilities.

@section cli-smtp

## `smtp` {#smtp}

Server notification e-mail. The stored password is never shown.

```bash
$ cipi-cli smtp set --host smtp.example.com --port 587 --user notify@example.com \
    --password "s3cret" --from notify@example.com --to ops@example.com
$ cipi-cli smtp test
```

Also `smtp show`, `smtp enable|disable`, `smtp delete`. Omitted flags keep stored values; `--no-test` skips the test e-mail.

@section cli-health

## `health` {#health}

| Command | Does |
| --- | --- |
| `health list`, `health show <app>` | Checks and last result |
| `health set <app> [--url] [--expect]` | Enable (default `https://<domain>/up`, expect `200`) |
| `health unset <app>` | Disable |
| `health check <app>` | Run now; **exits 1 when unhealthy**, a ready-made CI gate |

@section cli-ip-whitelist

## `ip-whitelist` {#ip-whitelist}

```bash
$ cipi-cli ip-whitelist set 203.0.113.10 198.51.100.0/24
$ cipi-cli ip-whitelist add|remove <ip>
$ cipi-cli ip-whitelist allow-all
```

Your current IP is kept when tightening the list (`--no-ensure-client-ip` to skip).

@section cli-insights

## Server insights {#insights}

Read-only, `--json` everywhere: `search status`, `node list`, `monitor`, `packages`, `zt` (Zero Trust: the status of both sides — the [mesh network](#zt) is managed too), `run-commands`.

[Optional packages](/docs/packages) are installed and removed too (`packages-manage`; jobs the CLI waits for):

```bash
$ cipi-cli packages                              # the catalog: status, what each brings
$ cipi-cli packages install browsershot
$ cipi-cli packages install sec-nuclei           # a pinned upstream release; again to update
$ cipi-cli prod packages remove ffmpeg -y
```

[Metrics](/docs/metrics), with sparklines in the terminal:

```bash
$ cipi-cli metrics                               # server and apps now
$ cipi-cli metrics show --app shop --range 7d
$ cipi-cli metrics uptime --range 30d
$ cipi-cli metrics events --source deploy
$ cipi-cli metrics retention --raw 14 --rollup 90
$ cipi-cli metrics heartbeat set https://hc-ping.com/<uuid>
```

## `zt`: the mesh network {#zt}

`cipi-cli zt` shows both sides of Zero Trust: the [Cloudflare tunnel](/docs/zero-trust) (read-only here) and the [mesh network](/docs/mesh-network) — Tailscale or NetBird — which is joined, locked and left from your terminal:

| Command | Does |
| --- | --- |
| `zt` | The tunnel and its locks; the mesh: connected or not, address and name, peers, node key, the last SSH login over it, its locks, how this client reaches the server, and — on `refused` lines — what the server would not do from here, and why |
| `zt join <tailscale\|netbird>` | Puts the server on a network. The key is asked for; `--key-file` reads it from a file, `--key` takes it on the command line, `--adopt` takes a client already connected. `--hostname`, `--tags`, `--control-url`, `--direct`, `--accept-dns`, `--accept-routes`, `--ssh`, `--reauth` |
| `zt lock <ssh\|http>` | Closes SSH, or 80/443, to the world: open on the mesh only (`-y` skips the question) |
| `zt unlock <ssh\|http>` | Reopens it |
| `zt ssh <on\|off>` | Tailscale SSH |
| `zt leave` | Takes the server off the network: what the locks closed is reopened first |

```bash
$ cipi-cli zt join tailscale --tags cipi
$ cipi-cli zt                            # the address on the network: sign in over it once
$ cipi-cli zt lock ssh
```

The server refuses [what would lock people out](/docs/mesh-network#panel-guards) and prints its reason. `zt lock http` is refused while this client reaches the API on the server's public address: point the profile's endpoint at the server's mesh name (or its hostname on the Cloudflare tunnel) and run it again. Needs `zt-view`; changes need `zt-manage`.

## `sync`: moving apps {#sync}

[Server sync](/docs/sync) from your terminal. **The server of the profile in use is the source**: it exports the apps, encrypts the archive, sends it over SSH and has the target import it. Apps that aren't on the target are created there; the others are updated. Nothing is removed or stopped on the source.

| Command | Does |
| --- | --- |
| `sync push [app…] --to <profile>` | Send apps to another server of yours: the client puts the source's key on the target, checks the way, and takes the key back out when the transfer ends (`--keep-trust` leaves it) |
| `sync push [app…] --host <address>` | …to a server that isn't a profile: it must trust the source's key already |
| `--with-db`, `--with-storage`, `--port` | Databases (replacing the target's), each app's `shared/storage`, the target's SSH port |
| `sync check <host> [--port 22]` | Can the source send there: the key accepted, Cipi answering — or why not |
| `sync key [--raw]` | The source's sync key |
| `sync trust [key]`, `sync untrust [key]` | On the target: let a server send apps here, or not any more (`--from <profile>`, `--key-file <file>`) |

```bash
$ cipi-cli prod sync push --to staging --with-db
$ cipi-cli prod sync push shop blog --host 203.0.113.9 --with-db --with-storage
```

No apps means every app. Node apps are skipped: create them on the target, they deploy from Git. There is no passphrase to type or keep — the source makes one for the transfer and hands it to the target over SSH. A transfer is a job followed for up to two hours. Needs `sync-manage` on the source, and on the target for `--to`, `trust` and `untrust`.

## `updates`: how the server updates Cipi {#updates}

The two optional safeguards of [self-update](/docs/self-update), both off by default:

| Command | Does |
| --- | --- |
| `updates` | Whether releases must be signed, the delay, the keys trusted, the release waiting, why the last one wasn't installed |
| `updates --delay 12h` | Install a new release once the server has seen it for 12 hours (`6h` … `7d`, `off`) |
| `updates --verify on --fingerprint SHA256:…` | Only releases signed by a trusted key — the first time with the fingerprint you compared with [the published one](/docs/self-update#signers) |
| `updates --verify off` | Back to any release |

```bash
$ cipi-cli prod updates --delay 12h
$ cipi-cli staging updates --delay off      # staging sees a release first
```

Starting an update is not in the client: it stays the server's. Needs `updates-view`, and `updates-manage` to change it.

## Notifications {#notifications}

Every channel and trigger ([notifications](/docs/notifications)):

```bash
$ cipi-cli notifications                         # channels and how many triggers are on
$ cipi-cli notifications add slack ops --url https://hooks.slack.com/services/… --test
$ cipi-cli notifications update oncall --chat-id -1009999    # secrets left out are kept
$ cipi-cli notifications test all                # exits 1 when a channel refuses it
$ cipi-cli notifications triggers off deploy_success ssh_login
$ cipi-cli notifications triggers all-off --except deploy_fail,backup_fail,health_fail
$ cipi-cli notifications timezone Europe/Rome    # the Time line of every notification
$ cipi-cli notifications server-name production  # "production (vmi12334)" instead of the hostname
$ cipi-cli notifications settings                # what they are now
```

@section cli-status

## `status` {#status}

```bash
$ cipi-cli status
 NAME      IP             CPU   RAM          HDD          APPS  SVC     CIPI
 prod*     203.0.113.10   12%   48% (3840M)  42G/80G 53%  3     8/8 ok  5.17.0
 staging   203.0.113.20    4%   31% (2048M)  18G/40G 45%  1     8/8 ok  5.17.0

$ cipi-cli status prod      # full detail for one server
```

@section cli-disk

## `disk` {#disk}

```bash
$ cipi-cli disk
 APP    FILES    DATABASE  TOTAL    DISK  LIMIT
 shop   2.00 GB  1.00 GB   3.00 GB  3.0%  10 GB (30%)
 blog   0.50 GB  120.4 MB  0.62 GB  0.6%  —
$ cipi-cli disk db          # every database, in MB
```

Same figures as [`cipi disk`](/docs/disk). Sizes are measured on request (up to three minutes). LIMIT is the soft limit from [`cipi app limits`](/docs/limits): alerts only.

@section cli-jobs

## `jobs` {#jobs}

`jobs show <id>` and `jobs wait <id>` (blocking). Write commands wait for their job by default. `deploy` and `sync push` follow their job for up to two hours — as long as the API lets one run; a front-end build alone may take [30 minutes](/docs/deploying#time-limits), up to an hour where the app asks for it — and every other command for ten minutes; a command whose wait is over says that the job is still running and how to pick it up: `jobs wait <id>`.

@section cli-update

## `update` {#update}

```bash
$ cipi-cli update          # highest release, checksum verified (aliases self-update, upgrade)
$ cipi-cli update --force  # reinstall, allows downgrade
```

@section cli-completion

## `completion` {#completion}

```bash
$ cipi-cli completion install                # detects zsh, bash or fish
$ cipi-cli completion install --shell bash
```

@section cli-global-flags

## Global flags {#flags}

| Flag | Effect |
| --- | --- |
| `--json` | Machine-readable output for scripts and CI |
| `--no-color` | Plain output |
| `--help` | Help for any command |

```bash
$ cipi-cli apps list --json | jq '.[].name'
```

@section cli-requirements

## Token abilities by command {#requirements}

| Commands | Abilities |
| --- | --- |
| `apps list/show`, `domains`, `apps logs` | `apps-view` |
| `apps create/edit/delete/suspend` | `apps-create`, `apps-edit`, `apps-delete`, `apps-suspend` |
| `apps env/auth/artisan/run`, `deploy config` | `apps-env`, `apps-auth`, `apps-artisan`, `apps-run`, `apps-deploy-config` |
| `deploy`, `deploy audit` | `deploy-manage` |
| `yml` | `yml-view`, `yml-manage` |
| `ssl`, `www`, `aliases`, `redirect`, `proxies` | `ssl-manage`, `www-manage`, `aliases-*`, `redirects-*`, `proxies-*` |
| `nginx`, `cache` | `nginx-view`, `nginx-manage` |
| `octane` | `php-view`, `php-manage` |
| `valkey` | `services-view`, `services-manage` |
| `db` | `dbs-view`, `dbs-create`, `dbs-manage` (anonymize: `apps-view` + `apps-env`) |
| `backup` | `backups-view` (status, runs), `backups-manage` |
| `php`, `services`, `ssh-keys`, `smtp`, `health`, `ip-whitelist` | matching `*-view` / `*-manage` |
| `zt join/leave/lock/unlock/ssh` | `zt-manage` (`zt` alone: `zt-view`) |
| `status`, `disk`, insights | `status-view`, `disk-view`, `*-view` |

Simplest: `cipi api token create --name=laptop --full-access`. Keep server and API current with `cipi self-update` so every command is available.
