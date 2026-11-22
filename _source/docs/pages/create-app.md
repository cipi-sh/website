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

The wizard asks, with the default pre-selected (Enter accepts it): app type, PHP-FPM or Octane, database engine, then name, domain, repository, branch, PHP version and an optional asset build. Before the summary it **tests the deploy key** against the repository; if it cannot read it, it offers to save a Git token and register the key for you.

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
| `--node-build` | Asset build run in every deploy (npm, npx, yarn, pnpm, bun, node) | none |
| `--env` | Environment label: sets `APP_ENV` and picks `cipi-<env>.yml` | `production` |

## After creation {#after}

The summary shows the server IP for DNS, the deploy key, the database credentials with a `mariadb+ssh://` URL for TablePlus or DBeaver, and the webhook URL and token. **It is shown once.**

```flow
Save the summary | shown once
Deploy key on Git | automatic with a token
Point DNS | A record → server IP
cipi deploy | first release
cipi ssl install | HTTPS
```

> [!tip] With a Git provider token configured, the deploy key and the push webhook are added to the repository automatically. See [Git providers & deploy keys](/docs/git).

## In the web panel {#in-the-panel}

Create an app from the browser: the same wizard, with a server picker. The [web panel](/docs/gui) is optional; everything here also works from the CLI.

<cipi-clips name="create"></cipi-clips>
