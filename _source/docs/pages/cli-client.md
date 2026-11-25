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
| `apps env order <app> KEY… [--after K / --before K]` | Move keys, the others keep their place (Cipi 5.13.0+, API 1.43+) |
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
| `deploy status <app> [--tail N]` | Running, queued, interrupted or idle, the last run, and a [paused commit](/docs/deploying#paused) (5.13.0+) |
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
| `backup profile add <name> --dest local,s3 [flags]`, `edit <name> [flags]` | `--scope`, `--apps`, `--databases`, `--exclude-databases`, `--exclude-tables`, `--exclude-paths` (5.13.0+), `--every` or `--cron`, `--keep`, `--keep-days`, `--keep-weeks`, `--encrypt` |
| `backup profile enable|disable|remove <name>` | |
| `backup destination test [name]` | Reach each S3 destination with its credentials |

```bash
$ cipi-cli backup profile edit nightly --exclude-paths storage/app/uploads,*.mp4
$ cipi-cli backup profile edit nightly --exclude-paths ""     # take everything again
```

Destinations are added on the server (`cipi backup destination add`): an S3 secret never goes through the API. See [Backups](/docs/backups), and [Exclude files and folders from backups](/guides/exclude-files-from-backups) for patterns and `cipi.yml` examples.

## `php` {#php}

| Command | Does |
| --- | --- |
| `php list` | Installed versions, FPM status, default; legacy versions marked |
| `php install <version>` | `8.3`, `8.4`, `8.5` or `8.6` (async job) |

Switching the default and removing versions stay on the server (`cipi php switch|remove`).

@section cli-services

## `services` and `ssh-keys` {#services}

| Command | Does |
| --- | --- |
| `services list [name]` | Status of system services |
| `services restart <name>` | e.g. `nginx`, `mariadb`, `php8.6-fpm` |
| `ssh-keys list` | Authorized keys of the `cipi` user, with ids |
| `ssh-keys add [key] [--file F]` | Add a public key |
| `ssh-keys remove <id>` | Remove one |

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

Read-only, `--json` everywhere: `search status`, `node list`, `monitor`, `packages`, `zt` (Zero Trust), `run-commands`.

[Optional packages](/docs/packages) are installed and removed too (Cipi 5.14.0+, API 1.44+, `packages-manage`; jobs the CLI waits for):

```bash
$ cipi-cli packages                              # the catalog: status, what each brings
$ cipi-cli packages install browsershot
$ cipi-cli packages install sec-nuclei           # a pinned upstream release; again to update
$ cipi-cli prod packages remove ffmpeg -y
```

[Metrics](/docs/metrics) (API 1.41+), with sparklines in the terminal:

```bash
$ cipi-cli metrics                               # server and apps now
$ cipi-cli metrics show --app shop --range 7d
$ cipi-cli metrics uptime --range 30d
$ cipi-cli metrics events --source deploy
$ cipi-cli metrics retention --raw 14 --rollup 90
$ cipi-cli metrics heartbeat set https://hc-ping.com/<uuid>
```

## Notifications {#notifications}

Every channel and trigger ([notifications](/docs/notifications), API 1.42+):

```bash
$ cipi-cli notifications                         # channels and how many triggers are on
$ cipi-cli notifications add slack ops --url https://hooks.slack.com/services/… --test
$ cipi-cli notifications update oncall --chat-id -1009999    # secrets left out are kept
$ cipi-cli notifications test all                # exits 1 when a channel refuses it
$ cipi-cli notifications triggers off deploy_success ssh_login
$ cipi-cli notifications triggers all-off --except deploy_fail,backup_fail,health_fail
```

@section cli-status

## `status` {#status}

```bash
$ cipi-cli status
 NAME      IP             CPU   RAM          HDD          APPS  SVC     CIPI
 prod*     203.0.113.10   12%   48% (3840M)  42G/80G 53%  3     8/8 ok  5.11.0
 staging   203.0.113.20    4%   31% (2048M)  18G/40G 45%  1     8/8 ok  5.11.0

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

`jobs show <id>` and `jobs wait <id>` (blocking). Write commands wait for their job by default.

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
| `db` | `dbs-view`, `dbs-create`, `dbs-manage` (anonymize: `apps-view` + `apps-env`) |
| `backup` | `backups-view` (status, runs), `backups-manage` |
| `php`, `services`, `ssh-keys`, `smtp`, `health`, `ip-whitelist` | matching `*-view` / `*-manage` |
| `status`, `disk`, insights | `status-view`, `disk-view`, `*-view` |

Simplest: `cipi api token create --name=laptop --full-access`. Keep server and API current with `cipi self-update` so every command is available.
