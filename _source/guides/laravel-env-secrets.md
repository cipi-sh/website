---
title: Laravel .env and secrets in production, done right
description: What the .env file is, why it never goes in Git, where Cipi keeps it so it survives deploys and rollbacks, how to change values safely from the CLI, the panel or the API, rotating database passwords and API keys, config caching, and keeping secrets out of logs and AI tools.
category: laravel
order: 15
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel env production, laravel secrets management, laravel env file server, rotate laravel app key, laravel config cache env, laravel env deploy
docs:
  - environment
  - vault
  - security-model
related:
  - laravel-security-checklist
  - cipi-yml-staging-production
  - laravel-ci-cd-git-workflow
faq:
  - Should I commit `.env`? | Never. Commit `.env.example` with the key names and no values. The real `.env` lives only on the server.
  - Where is the `.env` on a Cipi server? | At `/home/<app>/shared/.env`, linked into every release. Deploys and rollbacks never replace it.
  - Why does my change not show up? | Every deploy caches the config (`config:cache`), and a cached config doesn't read `.env` again. After a change, run `cipi app artisan shop config:cache` (or deploy), then restart workers and Octane.
  - Can I rotate `APP_KEY`? | Yes, but it logs everyone out and makes data encrypted with `Crypt` unreadable unless you keep the old key in `APP_PREVIOUS_KEYS`. Do it on purpose, not by accident.
  - Who can read the `.env`? | The app user and root. Other apps can't. Through the API, only tokens with the `apps-env` ability.
  - How do I give my CI a secret? | Store it in your CI's secret store for the build, and set runtime values on the server with `cipi app env --set` (or the API) once. The server doesn't need your CI's secrets.
---
Every Laravel app reads its settings and secrets (database password, Stripe key, mail credentials) from a file called `.env`. Getting it right is mostly about **where it lives, who can read it and how you change it** without breaking a running app.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **`.env`** | A text file of `KEY=value` lines, read when Laravel boots |
| **Secret** | A value that grants access: passwords, API keys, tokens |
| **`config:cache`** | Laravel's compiled config: after it, `.env` isn't read again until the cache is rebuilt |
| **Rotation** | Replacing a secret with a new one and retiring the old |
| **Shared folder** | `/home/<app>/shared`: files that stay the same across releases |

```tree
/home/shop/
  shared/
    .env            ← the only copy, survives deploys
    storage/
  releases/
    20261122_101500/
      .env -> ../../shared/.env
  current -> releases/20261122_101500
```

## Before you start {#before}

- A Laravel app on Cipi. Cipi wrote its `.env` at creation with the database, Valkey, app key and webhook values.

## 1. Read and change values {#change}

```bash
$ sudo cipi app env shop --show            # secrets visible: careful when screen sharing
$ sudo cipi app env shop --get=APP_URL
$ sudo cipi app env shop --set=STRIPE_SECRET=sk_live_…
$ sudo cipi app env shop --unset=OLD_KEY
$ sudo cipi app env shop                   # open in nano, as the app user
```

Every deploy caches Laravel's config, and a cached config doesn't read `.env` again. So after any change:

```bash
$ sudo cipi app artisan shop config:cache     # web requests see the new value
$ sudo cipi worker restart shop               # workers, Horizon and Octane too
```

Or simply deploy: the deploy rebuilds the cache and restarts workers.

The same edit is available in the [web panel](/web-panel) (secrets masked, changes tracked), through the REST API (`PUT /api/apps/shop/env`) and through MCP.

In the [web panel](/web-panel), secrets are masked and every change is tracked:

<cipi-clips name="env"></cipi-clips>

## 2. Keep secrets out of Git {#git}

```text
# .gitignore
.env
.env.*
!.env.example
```

```text
# .env.example: the names, never the values
STRIPE_KEY=
STRIPE_SECRET=
MAIL_MAILER=smtp
```

If a secret was ever committed, **rotate it**: removing it from history doesn't un-leak it.

## 3. Rotate the database password {#db-password}

```bash
$ sudo cipi db password shop
```

Cipi changes the password in the database and in `.env` together. Rebuild the config cache right after (`sudo cipi app artisan shop config:cache`) so the app picks it up. Never change it by hand in one place only.

## 4. Rotate third-party keys {#rotate}

```flow
Create new key | at the provider
> At the provider (Stripe, AWS, Mailgun…) create a second key. Most providers allow two valid keys at once.
Set it | cipi app env --set
> Save it on the server: `sudo cipi app env shop --set=STRIPE_SECRET=…`, then `sudo cipi app artisan shop config:cache`.
Restart workers | if jobs use it
> If queued jobs use the key, `sudo cipi worker restart shop` so they reload it.
Check | logs, a test payment
> Check the logs and try the feature (a test payment, an e-mail) with the new key.
Revoke old key | at the provider
> Only then delete the old key at the provider. If something was missed, it fails now, while you're watching.
```

Most providers (Stripe, Mailgun, AWS) let two keys be valid at once, so there's no gap.

## 5. APP_KEY {#app-key}

`APP_KEY` encrypts cookies, sessions and anything you store with `Crypt::`. Cipi generates it once. Rotating it:

```bash
$ sudo cipi app env shop --set=APP_PREVIOUS_KEYS=base64:OLDKEY…
$ sudo cipi app artisan shop key:generate --force
```

With `APP_PREVIOUS_KEYS`, Laravel can still decrypt values made with the old key. Users are logged out once.

## 6. Different values per environment {#environments}

Staging and production are separate apps with separate `.env` files: a staging key can never reach production. `APP_ENV`/`CIPI_ENV` are set by `--env=staging` at creation ([staging guide](/guides/cipi-yml-staging-production)).

## Keep secrets from leaking {#leaks}

| Leak | Prevention |
| --- | --- |
| Error pages | `APP_DEBUG=false` in production, always |
| Logs | Don't log request bodies or headers with tokens |
| Screenshots, screen sharing | Use `--get` for one value instead of `--show` |
| AI assistants | Give them [anonymized data](/guides/anonymized-database-dumps); MCP tokens without `apps-env` can't read `.env` |
| Backups | [Encrypt them](/guides/backup-vps-s3); the server's own config is [encrypted at rest](/docs/vault) |
| `phpinfo()` routes | Remove them: they print the environment |

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Change ignored | Cached config: `cipi app artisan shop config:cache`, then `cipi worker restart shop` |
| `env()` returns `null` in code | `env()` only works inside `config/` files once config is cached: read via `config('services.stripe.secret')` |
| `The MAC is invalid` | `APP_KEY` changed without `APP_PREVIOUS_KEYS` |
| `Access denied for user` | Password changed by hand: run `sudo cipi db password shop` |
| Value with spaces breaks | Quote it: `--set='MAIL_FROM_NAME="Acme Shop"'` |
