@section cli-db

Each Laravel app gets its own database and user, so no app can read another's data. MariaDB is the default; PostgreSQL can be added and chosen per app or per database, and port 3306 can run [MySQL instead of MariaDB](#mysql).

<cipi-term name="db"></cipi-term>

## Engines {#engines}

```bash
$ cipi db install pgsql             # add PostgreSQL next to MariaDB
$ cipi db default mariadb|pgsql     # default when --engine is omitted
$ cipi db engines [--json]          # which server runs on 3306, too
$ cipi db uninstall pgsql           # destroys its data: asks first
```

| | MariaDB | PostgreSQL |
| --- | --- | --- |
| Port | 3306 (localhost) | 5432 (localhost) |
| Installed | Always | `cipi db install pgsql` |
| Laravel `DB_CONNECTION` | `mysql` | `pgsql` |
| Why choose it | [Design decisions](/docs/design-decisions#why-mariadb) | [Design decisions](/docs/design-decisions#why-postgresql) |

## MySQL instead of MariaDB {#mysql}

MariaDB stays the default. Since 5.13.0, a server can run **MySQL** on port 3306 instead — only as an explicit choice, from the command line, and **only on a server with no databases on 3306 yet**:

```bash
$ cipi db switch mysql            # asks first (--yes in scripts)
$ cipi db engines                 # mariadb  running  3306  MySQL
$ cipi db switch mariadb          # back, on the same terms
```

| | |
| --- | --- |
| When | No database, no app and nothing in the registry on 3306. The data is never converted: no in-place upgrade exists between the two, and what a dump can't carry (MariaDB's `uuid`/`inet6` types, sequences, SQL only one of them understands) would surface later, in your apps |
| Which MySQL | From the Ubuntu archive: 8.0 on 24.04 (security fixes backported by Ubuntu), 8.4 LTS on 26.04. No extra repository or key |
| Checked first | A `mysql-server` package is available, and removing MariaDB would remove nothing but its own packages and client libraries. Otherwise nothing changes |
| What it does | Stops MariaDB, keeps its data directory aside (`/var/lib/mysql.mariadb-<time>`), purges it, installs MySQL with the same root password (`caching_sha2_password`) and Cipi's tuning (`/etc/mysql/mysql.conf.d/99-cipi.cnf`). If the install fails, MariaDB comes back with its data |
| What stays the same | The engine is still called `mariadb` (`--engine=mariadb`, `cipi.yml`, backups, API) and apps keep `DB_CONNECTION=mysql`. `cipi db upgrade`, autoupdate, `cipi service`, `cipi monitor`, credentials and labels follow the server that runs |
| Not in the panel or API | Replacing a database server is an operator decision; the [panel](/docs/gui) shows *MySQL* where it runs. A `db_switch` [notification](/docs/notifications) is sent |

Step by step, with what to check in your code first: [Run Laravel on MySQL instead of MariaDB](/guides/laravel-mysql-instead-of-mariadb).

**A server already in use** moves the way an app moves anywhere: a new server, `cipi db switch mysql` there before its first app, then [`cipi sync`](/docs/sync). The old server stays as it was, which is your way back. Dumps cross between the two: restoring into MySQL drops MariaDB's sandbox line and maps its UCA 14 collations to MySQL's `0900` ones (and back into MariaDB); rows are never touched.

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

Each database has its own user and password. Linking is a label: a linked database is listed with its app (in the CLI and the panel) and is **kept** when the app is deleted; only a Laravel app's own database goes with it. Connect from TablePlus or DBeaver with the `mariadb+ssh://` URL (`mysql+ssh://` on MySQL) shown at creation: no database port is ever exposed.

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

## In the web panel {#in-the-panel}

Every database on every server, with backup, restore and password rotation. The [web panel](/docs/gui) is optional; everything here also works from the CLI.

<cipi-clips name="databases"></cipi-clips>

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| `Access denied for user` | Password changed by hand: `cipi db password myapp` updates database and `.env` together |
| Restore stops with an error | Cipi stops at the first failing statement: read it, fix the dump or the target |
| Can't connect from TablePlus | Use the SSH tunnel settings (`mariadb+ssh://` URL from creation); no database port is open |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| MariaDB or PostgreSQL? | Both supported; see [Laravel on PostgreSQL](/guides/laravel-postgresql). |
| Can I use MySQL? | Yes, in place of MariaDB on a new server: `cipi db switch mysql` before the first app ([above](#mysql)). MariaDB stays the default. |
| Can I open the database port? | Avoid it; use SSH tunnels. If you must, allow one IP with `cipi firewall allow 3306 --from=…`. |
| Need a copy without personal data? | [Anonymized dumps](/guides/anonymized-database-dumps). |
