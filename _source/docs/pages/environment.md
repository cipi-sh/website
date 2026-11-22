@section cli-app-env

Each Laravel app has one `.env` at `/home/myapp/shared/.env`, linked into every release, so it survives deploys and rollbacks. Cipi writes it at creation with every credential; you add your own keys.

## Edit {#edit}

```bash
$ cipi app env myapp                          # opens it in nano, as the app user
$ cipi app env myapp --show [--json]
$ cipi app env myapp --get=APP_URL
$ cipi app env myapp --set=APP_DEBUG=false
$ cipi app env myapp --unset=LEGACY_KEY
$ cipi worker restart myapp                   # after changing queue or cache drivers
```

New requests read the change immediately (Octane apps: reload on next deploy or `cipi worker restart`). Also via REST (`GET|PUT /api/apps/{name}/env`) and MCP. Custom apps have no `.env`.

## What Cipi writes {#variables}

| Variable | Value |
| --- | --- |
| `APP_KEY` | Generated once at creation |
| `APP_URL` | The domain; switched to `https://` by `cipi ssl install` |
| `APP_ENV`, `CIPI_ENV` | The environment label (`production` by default) |
| `DB_CONNECTION` | `mysql` (MariaDB) or `pgsql` |
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

Edit the `.env` with secrets masked and changes tracked. The [web panel](/docs/gui) is optional; everything here also works from the CLI.

<cipi-clips name="env"></cipi-clips>
