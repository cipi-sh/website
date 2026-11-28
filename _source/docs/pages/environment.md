@section cli-app-env

Each Laravel app has one `.env` at `/home/myapp/shared/.env`, linked into every release, so it survives deploys and rollbacks. Cipi writes it at creation with every credential; you add your own keys.

## Edit {#edit}

```bash
$ sudo cipi app env myapp                     # opens it in nano, as the app user
$ sudo cipi app env myapp --show [--json]
$ sudo cipi app env myapp --get=APP_URL
$ sudo cipi app env myapp --set=APP_DEBUG=false
$ sudo cipi app env myapp --unset=LEGACY_KEY
$ sudo cipi app env myapp --order=APP_NAME,APP_ENV,…  # every key once
$ sudo cipi app env myapp --raw [--json]           # the file as it is
$ sudo cipi app env myapp --stdin < new.env        # the whole file, written as it is
$ sudo cipi worker restart myapp              # after changing queue or cache drivers
```

Deploys cache the config, so rebuild it after a change: `sudo cipi app artisan myapp config:cache` (or deploy). Workers and Octane also need `sudo cipi worker restart myapp`. Also via REST (`GET|PUT /api/apps/{name}/env`) and MCP. Custom apps have no `.env`.

## The whole file, as text {#raw}

`--show`, `--get` and `--json` read **values**: quotes taken off, comments and blank lines left out. `--raw` reads the **file**: every line, comment, blank line and space, byte for byte (`--json` wraps it as `{"app": …, "text": …}`).

`--stdin` writes the whole file from standard input, **exactly as given**: no line is parsed, quoted, trimmed or moved. It is what you want for a `.env` kept somewhere else, or edited by hand on your laptop:

```bash
$ sudo cipi app env myapp --raw > myapp.env        # take it
$ nano myapp.env                                   # change it
$ sudo cipi app env myapp --stdin < myapp.env      # put it back
```

Nothing on standard input, more than 64 KB or a NUL byte is refused, and the file is left as it was. What you send is what Laravel reads, so check the syntax yourself: a value with spaces goes in double quotes. `--raw` and `--stdin` work on the whole file and don't go with `--show`, `--get`, `--set`, `--unset` or `--order`.

## Reorder {#order}

`--order` puts the keys in the order you list. The list names **every key once**; anything else is refused and the file is left as it was. It runs after `--set`/`--unset` in the same call, so a new key can go straight where it belongs:

```bash
$ sudo cipi app env myapp --set=SENTRY_DSN=… --order=APP_NAME,…,LOG_CHANNEL,SENTRY_DSN,…
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
| `APP_URL` | The domain; switched to `https://` by `sudo cipi ssl install` |
| `APP_ENV`, `CIPI_ENV` | The environment label (`production` by default) |
| `DB_CONNECTION` | `mysql` (MariaDB or [MySQL](/docs/databases#mysql)) or `pgsql` |
| `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | The app's own database credentials |
| `CACHE_STORE`, `SESSION_DRIVER`, `QUEUE_CONNECTION` | `database`: isolated per app |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | The app's own Valkey instance, ready when you switch drivers |
| `BROADCAST_CONNECTION`, `REVERB_*`, `VITE_REVERB_*` | Set by `sudo cipi app reverb enable` |
| `CIPI_WEBHOOK_TOKEN` | Secret that signs deploy webhooks |
| `CIPI_DEPLOY_BRANCH` | Only pushes to this branch deploy |
| `CIPI_APP_USER` | The app's Linux user |
| `CIPI_MCP` | `true`/`false`: the app's MCP endpoint |

> [!warning] Change database passwords with `sudo cipi app reset-db-password myapp`, never by hand: it updates the database and `.env` together.

Your own keys (Stripe, mail, APIs) go anywhere in the file and are never overwritten by a deploy.

## In the web panel {#in-the-panel}

Edit the `.env` with secrets masked and changes tracked, and drag rows by their handle (or use ↑/↓ on it) to reorder them: the new order is saved with your other changes.

Variables that arrive as a block — from a README, a chat, another `.env` — don't have to be typed row by row. **Paste variables** takes `KEY=value` lines and splits them into the list: known keys take the new value, new ones are added, nothing is removed. **Edit as text** shows the whole list as text to edit by hand; what you apply replaces the list, so a line you take out removes that key. Quotes, `export`, comments and blank lines are understood; a value has to stay on one line. Either way nothing is sent until you press **Save .env**. The [web panel](/docs/gui) is optional; everything here also works from the CLI.

<cipi-clips name="env"></cipi-clips>

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| Change ignored | Config is cached by deploys: `sudo cipi app artisan myapp config:cache`, then `sudo cipi worker restart myapp` |
| Value with spaces breaks | Give it as it is, Cipi adds the quotes: `--set='MAIL_FROM_NAME=Acme Shop'` (quotes inside the value become part of it) |
| A value shows up in quotes, or with blanks at its end | A `.env` line with blanks or a comment after the value. `--json`, `--get` and the panel read it the way Laravel does: the value without them |
| `The MAC is invalid` | `APP_KEY` changed: restore the old one or set `APP_PREVIOUS_KEYS` |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Is `.env` in my repository? | Never. It lives in `/home/myapp/shared/.env` on the server. |
| Who can read it? | The app user and root; API tokens with `apps-env`. |
| More on secrets? | [.env and secrets guide](/guides/laravel-env-secrets). |
