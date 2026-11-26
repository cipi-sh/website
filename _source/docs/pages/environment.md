@section cli-app-env

Each Laravel app has one `.env` at `/home/myapp/shared/.env`, linked into every release, so it survives deploys and rollbacks. Cipi writes it at creation with every credential; you add your own keys.

## Edit {#edit}

```bash
$ cipi app env myapp                          # opens it in nano, as the app user
$ cipi app env myapp --show [--json]
$ cipi app env myapp --get=APP_URL
$ cipi app env myapp --set=APP_DEBUG=false
$ cipi app env myapp --unset=LEGACY_KEY
$ cipi app env myapp --order=APP_NAME,APP_ENV,…   # every key once
$ cipi worker restart myapp                   # after changing queue or cache drivers
```

Deploys cache the config, so rebuild it after a change: `cipi app artisan myapp config:cache` (or deploy). Workers and Octane also need `cipi worker restart myapp`. Also via REST (`GET|PUT /api/apps/{name}/env`) and MCP. Custom apps have no `.env`.

## Reorder {#order}

`--order` puts the keys in the order you list. The list names **every key once**; anything else is refused and the file is left as it was. It runs after `--set`/`--unset` in the same call, so a new key can go straight where it belongs:

```bash
$ cipi app env myapp --set=SENTRY_DSN=… --order=APP_NAME,…,LOG_CHANNEL,SENTRY_DSN,…
```

| What moves with a key | |
| --- | --- |
| Its line(s), untouched | Value, quotes, `export` |
| Comments right above it | They describe the key, so they follow it |
| A blank line that started a group | Stays in front of the key that started it |
| The file's header and tail | Stay first and last |

The [web panel](#in-the-panel) does the same by dragging rows, the [CLI client](/docs/cli-client) with `cipi-cli apps env order myapp DB_HOST DB_PORT --after APP_URL`, the [PHP SDK](/docs/php-sdk) with `env()->reorder()`, the API with `order` on `PUT /api/apps/{name}/env`.

## What Cipi writes {#variables}

| Variable | Value |
| --- | --- |
| `APP_KEY` | Generated once at creation |
| `APP_URL` | The domain; switched to `https://` by `cipi ssl install` |
| `APP_ENV`, `CIPI_ENV` | The environment label (`production` by default) |
| `DB_CONNECTION` | `mysql` (MariaDB or [MySQL](/docs/databases#mysql)) or `pgsql` |
| `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | The app's own database credentials |
| `CACHE_STORE`, `SESSION_DRIVER`, `QUEUE_CONNECTION` | `database`: isolated per app |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | The app's own Valkey instance, ready when you switch drivers |
| `BROADCAST_CONNECTION`, `REVERB_*`, `VITE_REVERB_*` | Set by `cipi app reverb enable` |
| `CIPI_WEBHOOK_TOKEN` | Secret that signs deploy webhooks |
| `CIPI_DEPLOY_BRANCH` | Only pushes to this branch deploy |
| `CIPI_APP_USER` | The app's Linux user |
| `CIPI_MCP` | `true`/`false`: the app's MCP endpoint |

> [!warning] Change database passwords with `cipi app reset-db-password myapp`, never by hand: it updates the database and `.env` together.

Your own keys (Stripe, mail, APIs) go anywhere in the file and are never overwritten by a deploy.

## In the web panel {#in-the-panel}

Edit the `.env` with secrets masked and changes tracked, and drag rows by their handle (or use ↑/↓ on it) to reorder them: the new order is saved with your other changes.

Variables that arrive as a block — from a README, a chat, another `.env` — don't have to be typed row by row. **Paste variables** takes `KEY=value` lines and splits them into the list: known keys take the new value, new ones are added, nothing is removed. **Edit as text** shows the whole list as text to edit by hand; what you apply replaces the list, so a line you take out removes that key. Quotes, `export`, comments and blank lines are understood; a value has to stay on one line. Either way nothing is sent until you press **Save .env**. The [web panel](/docs/gui) is optional; everything here also works from the CLI.

<cipi-clips name="env"></cipi-clips>

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| Change ignored | Config is cached by deploys: `cipi app artisan myapp config:cache`, then `cipi worker restart myapp` |
| Value with spaces breaks | Quote it: `--set='MAIL_FROM_NAME="Acme Shop"'` |
| `The MAC is invalid` | `APP_KEY` changed: restore the old one or set `APP_PREVIOUS_KEYS` |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Is `.env` in my repository? | Never. It lives in `/home/myapp/shared/.env` on the server. |
| Who can read it? | The app user and root; API tokens with `apps-env`. |
| More on secrets? | [.env and secrets guide](/guides/laravel-env-secrets). |
