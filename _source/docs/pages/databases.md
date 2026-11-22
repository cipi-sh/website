@section cli-db

Each Laravel app gets its own database and user, so no app can read another's data. MariaDB is the default; PostgreSQL can be added and chosen per app or per database.

<cipi-term name="db"></cipi-term>

## Engines {#engines}

```bash
$ cipi db install pgsql             # add PostgreSQL next to MariaDB
$ cipi db default mariadb|pgsql     # default when --engine is omitted
$ cipi db engines
$ cipi db uninstall pgsql           # destroys its data: asks first
```

| | MariaDB | PostgreSQL |
| --- | --- | --- |
| Port | 3306 (localhost) | 5432 (localhost) |
| Installed | Always | `cipi db install pgsql` |
| Laravel `DB_CONNECTION` | `mysql` | `pgsql` |
| Why choose it | [Design decisions](/docs/design-decisions#why-mariadb) | [Design decisions](/docs/design-decisions#why-postgresql) |

## Databases {#lifecycle}

```bash
$ cipi db create --name=analytics --engine=pgsql
$ cipi db create --name=wpblog --app=blog     # belongs to the "blog" app
$ cipi db link wpblog blog                    # or link an existing one
$ cipi db list [--json]                       # sizes and owning app
$ cipi db backup myapp
$ cipi db restore myapp backup.sql.gz
$ cipi db password myapp                      # new password, .env updated
$ cipi db delete analytics
```

Each database has its own user and password. Linking is a label: a linked database is listed with its app (in the CLI and the panel) and is **kept** when the app is deleted; only a Laravel app's own database goes with it. Connect from TablePlus or DBeaver with the `mariadb+ssh://` URL shown at creation: no database port is ever exposed.

## Restores you can trust {#restore}

| Guard | Effect |
| --- | --- |
| Stops at the first failing statement | Clear error, exit 1, no "restored" lie |
| PostgreSQL restore in one transaction | A truncated or failing dump rolls back; your data stays |
| Empty dumps refused | A backup of nothing never wipes a database |
| Newer `pg_dump` into older server | Unknown `SET` lines are dropped so it still restores |
| Files from an app's home opened as that user | A malicious symlink can't make root read other files |

## Upgrades {#upgrade}

Database engines are excluded from unattended upgrades, so they never restart under you. Patch when you choose (brief restart):

```bash
$ cipi db upgrade [mariadb|pgsql] [--yes]
```

Or schedule it with [cipi autoupdate](/docs/stack-upgrades).
