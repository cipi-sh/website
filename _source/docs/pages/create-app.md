@section cli-app-create

One command creates a complete, isolated app: Linux user, PHP pool (or Octane), Nginx vhost, database, worker, scheduler, deploy key and a ready `.env`.

<cipi-term name="create-app"></cipi-term>

## Pick the app type {#types}

| Type | For | Flag |
| --- | --- | --- |
| **Laravel** (default) | Laravel apps, on PHP-FPM or Octane | none, or `--octane` |
| **Node** | React, Vue, Svelte, Next.js, Nuxt, SvelteKit, Astro, Remix | `--node=spa\|static\|ssr` |
| **Custom** | WordPress, plain PHP, static files, SFTP-only sites | `--custom` |

Details per type: [Laravel Octane](/docs/octane), [Node apps](/docs/node-apps), [Custom PHP & static sites](/docs/custom-apps).

## Interactive {#interactive}

```bash
$ cipi app create
```

The wizard asks, with the default pre-selected (Enter accepts it): app type, PHP-FPM or Octane, database engine, then name, domain, repository, branch, PHP version and an optional asset build. For a custom or a Node app it also asks *New database for this app*: a name creates one with the app, Enter creates none. Before the summary it **tests the deploy key** against the repository; if it cannot read it, it offers to save a Git token and register the key for you.

## With flags {#flags}

Any type flag skips the menus; without a terminal every default applies.

```bash
$ cipi app create --user=myapp --domain=myapp.com \
    --repository=git@github.com:you/myapp.git --branch=main --php=8.6

# Octane, PostgreSQL, front-end build
$ cipi app create --user=api --domain=api.myapp.com \
    --repository=git@github.com:you/api.git --octane --engine=pgsql \
    --node-build='npm ci && npm run build'

# A staging copy of the same repository
$ cipi app create --user=myapp-stg --domain=staging.myapp.com \
    --repository=git@github.com:you/myapp.git --branch=develop --env=staging

# WordPress: a custom app with its database, in one command
$ cipi app create --custom --user=blog --domain=blog.example.com --db=blog
```

| Flag | Meaning | Default |
| --- | --- | --- |
| `--user` | Linux user and app name: unique, lowercase, alphanumeric | asked |
| `--domain` | Primary domain; sets the vhost and `APP_URL` | asked |
| `--repository` | Git URL over **SSH** (`git@…`) | asked (required for Laravel) |
| `--branch` | Branch to deploy | `main` |
| `--php` | An installed PHP version (8.3–8.6) | server default |
| `--octane` | Serve with Octane (FrankenPHP) instead of PHP-FPM | off |
| `--engine` | `mariadb` or `pgsql` (after `cipi db install pgsql`) | `mariadb` |
| `--valkey` | `shared` to use the server's Valkey instead of the app's own | own instance |
| `--node-build` | Asset build run in every deploy (npm, npx, yarn, pnpm, bun, node), with [30 minutes](/docs/deploying#time-limits) to finish unless the app is given more | none |
| `--db=NAME` | **Custom and Node apps**: a new database made with the app ([below](#database)). `--db` alone names it like the app; `--no-db` skips the question | none |
| `--env` | Environment label: sets `APP_ENV` and picks `cipi-<env>.yml` | `production` |

## A database with a custom or a Node app {#database}

A Laravel app is created with its own database, named like the app and already written to its `.env`. A custom or a Node app has none unless you ask — and a WordPress, a Symfony or a Next.js with Prisma needs one:

```bash
$ cipi app create --custom --user=blog --domain=blog.example.com --db=blog
$ cipi app create --custom --user=crm --domain=crm.example.com --db=crm_prod --engine=pgsql
$ cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --node=ssr --framework=next --db
```

| | |
| --- | --- |
| What is made | The database, a user **with the same name**, and a 40-character password |
| Where you see it | In the summary of the create, once, on the line `Database`: name, password, engine |
| Whose it is | The app's: linked to it, so `cipi db list` and the panel show it under the app. Deleting the app leaves it in place |
| Which engine | `--engine=mariadb\|pgsql`, else the server's default. At a terminal with both installed, you are asked |
| The name | Lowercase letters, digits and `_`, starting with a letter, 2 to 64 characters. `--db` with no value uses the app's name |
| Without the flag | At a terminal the wizard asks; Enter means none. Without a terminal (a script, the API) no database is made. `--no-db` never asks |

The name has to be new: a database that already exists is refused before anything is created, with the command that links it instead (`cipi db link <database> <app>`). `--db` on a Laravel app is refused too — it has its own; one more is `cipi db create --name=<name> --app=<app>` afterwards.

The app is not told the credentials: put them where it reads them — `wp-config.php`, or `.env` with [cipi app env](/docs/environment). The same from the [web panel](/docs/gui) (*New database* in the create form), the [REST API](/docs/api) (`db` on `POST /api/apps`), [cipi-cli](/docs/cli-client) (`apps create --db NAME`) and the [PHP SDK](/docs/php-sdk).

## After creation {#after}

The summary shows the server IP for DNS, the deploy key, the database credentials with a `mariadb+ssh://` URL for TablePlus or DBeaver, and the webhook URL and token. **It is shown once.**

```flow
Save the summary | shown once
> The summary shows the database password, the deploy key, the webhook URL and token. **It is shown once**: copy it to your password manager now.
Deploy key on Git | automatic with a token
> The deploy key must be added to the repository as a read-only deploy key. With a Git provider token saved (`cipi git github-token …`), Cipi did it already.
Point DNS | A record → server IP
> Create an `A` record for the domain pointing at the server's IP. Check with `dig +short myapp.com`.
cipi deploy | first release
> `cipi deploy myapp` builds the first release: clone, Composer, migrations, swap. Then open `http://myapp.com`.
cipi ssl install | HTTPS
> Once DNS points at the server, `cipi ssl install myapp` issues the certificate and switches `APP_URL` to `https://`.
```

> [!tip] With a Git provider token configured, the deploy key and the push webhook are added to the repository automatically. See [Git providers & deploy keys](/docs/git).

## In the web panel {#in-the-panel}

Create an app from the browser: the same wizard, with a server picker. The [web panel](/docs/gui) is optional; everything here also works from the CLI.

<cipi-clips name="create"></cipi-clips>

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| `--repository` refused | Use the SSH form: `git@github.com:you/app.git`, not `https://` |
| Name refused | Lowercase letters and numbers only, unique on the server |
| `--engine=pgsql` refused | Install PostgreSQL first: `cipi db install pgsql` |
| Domain already used | Each hostname belongs to one app; remove it from the other app first |
| `--db` refused: *is for custom and Node apps* | A Laravel app has its own database. One more: `cipi db create --name=<name> --app=<app>` |
| `--db` refused: *already exists* | `--db` makes a new one. To show an existing database as the app's: `cipi db link <database> <app>` |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| I lost the creation summary. | `cipi app show myapp` shows domain, deploy key and webhook; `cipi db password myapp` makes a new database password. |
| Laravel, custom or Node? | Laravel for Laravel apps, Node for front ends (Next, Nuxt, Vite…), custom for WordPress, plain PHP and static sites. |
| Can I change the PHP version later? | Yes: `cipi app edit myapp --php=8.6`, with zero downtime. |
