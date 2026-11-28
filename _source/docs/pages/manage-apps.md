@section cli-app-manage

Everything you do to an app after creating it: inspect, change, convert, clone, delete. Every change is applied in place, with zero downtime where the runtime allows it.

## Inspect {#inspect}

| Command | Shows |
| --- | --- |
| `sudo cipi app list` | Every app: domain, PHP, status (`suspended` when offline) |
| `sudo cipi app show myapp` | Domain, PHP or Node mode, environment, workers, deploy key, webhook, redirects, proxies |

## Change {#edit}

`sudo cipi app edit` flags can be combined in one call.

| Command | What happens |
| --- | --- |
| `sudo cipi app edit myapp --php=8.6` | Moves pool, vhost, workers, cron, deploy recipe and `.env` to the new PHP. No downtime |
| `sudo cipi app edit myapp --domain=new.example.com` | New primary domain; the old one becomes an alias; vhost, `APP_URL`, webhook and certificate follow |
| `sudo cipi app edit myapp --branch=develop` | Deploy another branch (also updates `CIPI_DEPLOY_BRANCH`) |
| `sudo cipi app edit myapp --env=staging` | New environment label: `APP_ENV`, `CIPI_ENV`, and reads `cipi-staging.yml` |
| `sudo cipi app edit myapp --repository=git@…` | Attach or change the repository (e.g. turn an SFTP site into a Git one) |
| `sudo cipi app edit myapp --node-build='npm ci && npm run build'` | Front-end build in every deploy, with [30 minutes](/docs/deploying#time-limits) to finish; `--no-node-build` removes it |
| `sudo cipi app edit myapp --node-version=24` | Pin Node for this app's builds; `default` follows the server |
| `sudo cipi app edit myapp --predeploy-snapshot` | Dump the database before every deploy ([Safe deploy](/docs/safe-deploy)) |
| `sudo cipi app convert myapp --to=octane\|fpm` | Switch runtime ([Laravel Octane](/docs/octane)) |
| `sudo cipi app jit myapp on\|off` | PHP JIT for this app ([PHP JIT](/docs/php-jit)) |

On an Octane app, changing PHP moves CLI, cron and workers at once; web workers follow when you pin a matching [FrankenPHP build](/docs/octane#cli-frankenphp).

## Credentials {#credentials}

| Command | Effect |
| --- | --- |
| `sudo cipi app reset-password myapp` | New SSH/SFTP password for the app user, shown once |
| `sudo cipi app reset-db-password myapp` | New database password, written to `.env` in the same step |
| `sudo cipi app webhook recreate myapp --rotate-secret` | Recreate the Git webhook with a new secret |

## Delete {#delete}

```bash
$ sudo cipi app delete myapp       # asks for confirmation
$ sudo cipi app delete myapp --force  # for scripts
```

Removes the user, files, database, vhost, PHP pool, workers, search keys and every rule Cipi created for the app. Back up first if you might need the data.

@section cli-use

## A default app: `sudo cipi use` {#cipi-use}

Working on one app for a while? Set it once and leave the name out.

```bash
$ sudo cipi use shop
$ sudo cipi deploy  # → shop (default app — sudo cipi use)
$ sudo cipi app logs --type=php
$ sudo cipi use --clear
```

It is stored on the server; `CIPI_APP=shop` sets it for one shell only. For safety, destructive commands (`app delete`, password resets, `convert`, `clone`, `db …`) always require the name, and commands that mean "all apps" without a name keep that meaning.

@section cli-app-clone

## Clone an app {#clone}

Make a staging or review copy of a Laravel app with its own domain, user and (optionally) a fresh database.

```bash
$ sudo cipi app clone myapp --domain=staging.myapp.com --name=myapp-stg \
    --branch=develop --env=staging --with-db
```

| Flag | Meaning |
| --- | --- |
| `--domain` | Required. The clone's domain |
| `--name` | Linux user for the clone |
| `--branch` / `--env` | Deploy branch and environment (default: the source's) |
| `--with-db` / `--no-db` | Create a fresh database, or none |

> [!security] A clone never talks to production by accident: it gets its own Reverb credentials, its own search key and prefix (production search keys are not copied), and no webhook or Git IDs from the source.

@section cli-app-fix-permissions

## Repair permissions {#fix-permissions}

```bash
$ sudo cipi app fix-permissions myapp  # one app
$ sudo cipi app fix-permissions    # every app
```

Restores the layout Cipi created, after an archive unpacked as root or a careless `chmod`:

| Path | Mode | Why |
| --- | --- | --- |
| Home | `750` | Nginx (in the app group) can read; other apps cannot |
| `.ssh` | `700` | SSH refuses a deploy key with looser permissions |
| `shared/.env` | `640` | Secrets readable by the app only |
| `logs/` | `2775` setgid | Nginx writes logs as `www-data` |
| `storage/` | `775` | Laravel writes cache and uploads |

Also available as a button in the [web panel](/docs/gui-overview).
