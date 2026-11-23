---
title: Laravel on PostgreSQL, on your own server
description: From zero to a Laravel app on PostgreSQL with Cipi: what Postgres is good at, installing it next to MariaDB, creating apps and extra databases on it, connecting from your laptop, backups, restores, upgrades and moving an existing app from MySQL.
category: laravel
order: 12
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel postgresql vps, laravel postgres production, cipi postgresql, laravel pgsql ubuntu, migrate mysql to postgresql laravel, pgvector laravel
docs:
  - databases
  - create-app
  - backups
  - design-decisions
related:
  - backup-vps-s3
  - anonymized-database-dumps
  - laravel-zero-downtime-migrations
faq:
  - MariaDB or PostgreSQL for a new app? | Both work with Laravel out of the box. Pick PostgreSQL if you want JSONB, strict types, partial indexes, transactional migrations or extensions such as pgvector; pick MariaDB if your team, hosting or packages expect MySQL.
  - Can one server run both? | Yes. MariaDB is always there; `cipi db install pgsql` adds PostgreSQL on port 5432. Each app picks one with `--engine`, and you can create extra databases on either.
  - Is the database reachable from the internet? | No. PostgreSQL listens on `localhost` only and the firewall never opens 5432. You connect from your laptop over an SSH tunnel.
  - Can I switch an existing app's engine with one command? | No. Create a new app on PostgreSQL and move the data (see the migration section). It's a one-off job you test on a copy first.
  - Does PostgreSQL get security updates automatically? | It's excluded from unattended upgrades so it never restarts under you. Patch it when you choose with `cipi db upgrade pgsql`, or schedule it with `cipi autoupdate`.
  - Which PostgreSQL version? | The one Ubuntu ships for your release (`postgresql` package), with `postgresql-contrib`. `cipi db engines` shows it.
  - Can I use pgvector? | Install the extension package for your PostgreSQL version as root, then create the extension in the app's database as the `postgres` superuser. App users own their database but aren't superusers.
---
PostgreSQL is an open-source database known for being strict, predictable and extensible. Laravel supports it natively: same Eloquent, same migrations, `DB_CONNECTION=pgsql`. This guide sets it up on a Cipi server, explains what changes compared to MySQL, and covers the day-two tasks.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Engine** | The database server program: MariaDB (MySQL-compatible) or PostgreSQL |
| **Database** | One container of tables, e.g. `shop` |
| **Database user** | The login an app uses. On Cipi each app has its own, which owns its database |
| **Superuser** | `postgres`: can do anything. Cipi keeps its password in the encrypted vault |
| **SSH tunnel** | A way to reach the database from your laptop through SSH, without opening a port |

```stack
Your Laravel app | DB_CONNECTION=pgsql, own user
PostgreSQL | port 5432, localhost only
MariaDB | port 3306, localhost only, always installed
Ubuntu server | firewall: 22, 80, 443 open
```

## When PostgreSQL is the better choice {#why}

| You need | PostgreSQL gives you |
| --- | --- |
| Rich JSON queries | `jsonb` columns with GIN indexes; Laravel's `whereJsonContains` uses them |
| Safe migrations | DDL runs inside transactions: a failing migration rolls back cleanly |
| Strict data | No silent truncation or invalid dates |
| Advanced indexes | Partial, expression and full-text indexes |
| Extensions | pgvector (AI embeddings), PostGIS (maps), pg_trgm (fuzzy search) |

## Before you start {#before}

- A Cipi server ([install guide](/guides/deploy-laravel-ubuntu-vps)) and SSH access as `cipi`.
- A Laravel app in a Git repository. Nothing in your code needs to change unless you used MySQL-only SQL (see [differences](#differences)).

## 1. Install PostgreSQL {#install}

```bash
$ sudo cipi db install pgsql
$ sudo cipi db engines
```

Cipi installs `postgresql` and `postgresql-contrib`, makes it listen on `localhost` only, sets a random superuser password in the vault and pins the package so unattended upgrades never restart it. MariaDB keeps running next to it.

<cipi-term name="db"></cipi-term>

Want every new app on PostgreSQL by default?

```bash
$ sudo cipi db default pgsql
```

## 2. Create a Laravel app on PostgreSQL {#create}

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --branch=main --engine=pgsql
```

```flow
Linux user | shop
Database | shop, owned by user shop
.env | DB_CONNECTION=pgsql, port 5432
First deploy | php artisan migrate --force
```

Cipi creates the database with `UTF8` encoding and gives the app user ownership of it and of the `public` schema, so migrations can create, alter and drop anything inside it, and nothing outside it.

Check the result:

```bash
$ sudo cipi app env shop --get=DB_CONNECTION
pgsql
$ sudo cipi db list
```

## 3. Extra databases {#extra}

An analytics database for the same app, or a database for a tool:

```bash
$ sudo cipi db create --name=analytics --engine=pgsql --app=shop
```

Add a second connection in `config/database.php` and the credentials Cipi prints to the app's `.env` (`sudo cipi app env shop`).

## 4. Connect from your laptop {#connect}

The database port is never exposed. TablePlus, DBeaver, DataGrip and Postico all support an SSH tunnel:

| Field | Value |
| --- | --- |
| SSH host / user | Server IP, `cipi` (your SSH key) |
| Database host / port | `127.0.0.1`, `5432` |
| Database, user, password | From `sudo cipi app env shop --show` |

Or from a terminal:

```bash
$ ssh -L 5433:127.0.0.1:5432 cipi@203.0.113.10
# in another terminal
$ psql "postgresql://shop:PASSWORD@127.0.0.1:5433/shop"
```

## 5. Backups and restores {#backups}

```bash
$ sudo cipi db backup shop                     # one-off pg_dump, gzipped
$ sudo cipi backup profile add hourly-db --scope=db --databases=shop --every=1h --keep=48 --dest=s3 --encrypt
$ sudo cipi db restore shop /var/log/cipi/backups/shop_20261123_101500.sql.gz
```

PostgreSQL restores run **in one transaction**: if the file is truncated or a statement fails, nothing changes and your data stays as it was. Full setup in the [backup guide](/guides/backup-vps-s3).

## 6. Upgrades {#upgrades}

```bash
$ sudo cipi db upgrade pgsql
```

Minor releases (security and bug fixes) install with a brief restart. Plan it outside peak hours, or schedule it with [stack upgrades](/docs/stack-upgrades).

The same databases, backups and password rotation in the [web panel](/web-panel):

<cipi-clips name="databases"></cipi-clips>

## MySQL habits that change {#differences}

| MySQL / MariaDB | PostgreSQL |
| --- | --- |
| `LIKE` is case-insensitive | `LIKE` is case-sensitive: use `ILIKE` or `whereLike(..., caseSensitive: false)` |
| `GROUP BY` lets you select any column | Every selected column must be grouped or aggregated |
| Backticks `` `name` `` | Double quotes `"name"` (Laravel handles this for you) |
| `0000-00-00` dates accepted | Rejected: use `NULL` |
| Auto-increment | `bigserial` / identity, same `$table->id()` |
| `FIELD()`, `IF()` | `CASE WHEN … END` |

Raw SQL (`DB::raw`, `whereRaw`) is where problems hide: grep for it before switching.

## Move an existing app from MySQL {#migrate}

There's no in-place switch. You create a PostgreSQL app and move the data once:

```flow
Test locally | run the suite on pgsql
New app | --engine=pgsql, same repo
Copy data | pgloader or an export job
Check | counts, a few pages
Switch DNS | or swap the domain
```

1. Run your test suite against PostgreSQL locally (`DB_CONNECTION=pgsql` in `.env.testing`) and fix raw queries.
2. Create `shop-pg` with `--engine=pgsql` and deploy: migrations build the schema.
3. Copy the data. [pgloader](https://pgloader.io) reads MySQL and writes PostgreSQL directly; install it on the server (`sudo apt install pgloader`) and run it against both local databases with `--with "data only"` so it fills the tables your migrations created.
4. Reset sequences (pgloader does it; for a hand-made import run `SELECT setval(...)` per table).
5. Compare row counts, click through the app, then move the domain (`sudo cipi app edit shop-pg --domain=shop.example.com` after removing it from the old app).

Do a dry run with a copy first, ideally an [anonymized one](/guides/anonymized-database-dumps).

## pgvector and other extensions {#extensions}

App users own their database but aren't superusers, so they can't create most extensions themselves. As `cipi`:

```bash
$ psql --version                                # e.g. 16 on Ubuntu 24.04
$ sudo apt install postgresql-16-pgvector        # postgresql-<major>-pgvector
$ sudo -u postgres psql -d shop -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

After that, migrations can use the `vector` column type.

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `could not find driver` | Rare: Cipi installs `php-pgsql` with every PHP version. Check `php -m` as the app user and reinstall the version if it's missing |
| `permission denied to create extension` | Create it as `postgres` (see above) |
| `column must appear in the GROUP BY clause` | Add the column to `groupBy()` or aggregate it |
| Search stopped matching uppercase | `LIKE` is case-sensitive: use `ILIKE` |
| Duplicate key on insert after an import | Sequences weren't reset |
| `--engine=pgsql` refused | PostgreSQL isn't installed yet: `sudo cipi db install pgsql` |
