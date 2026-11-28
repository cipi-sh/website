---
title: Run Laravel on MySQL instead of MariaDB
description: Replace MariaDB with MySQL 8.4 on port 3306 with one command, before the first app. What changes, what stays the same, what to check in your code, and how to move a server that already runs apps.
category: laravel
order: 12
published: 2026-11-24
updated: 2026-11-24
howto: yes
keywords: laravel mysql vps, mysql instead of mariadb, switch mariadb to mysql ubuntu, mysql 8.4 laravel, cipi db switch mysql
related:
  - laravel-postgresql
  - migrate-server-cipi-sync
  - backup-vps-s3
faq:
  - Can I switch a server that already has apps? | Not in place. `sudo cipi db switch` only runs on a server with no databases on port 3306, because there is no safe in-place conversion between the two. Use a new server, switch it before the first app, then move the apps with `sudo cipi sync` ([step 6](#existing)).
  - Do I need to change `DB_CONNECTION`? | No. Laravel's `mysql` driver talks to both servers, and Cipi writes `DB_CONNECTION=mysql` on MariaDB and on MySQL alike.
  - Which MySQL version do I get? | The one in the Ubuntu archive: 8.4 LTS on Ubuntu 26.04, 8.0 on 24.04. Prefer 26.04 for a new MySQL server: Oracle ended support for 8.0 on April 30, 2026.
  - Can MariaDB and MySQL run side by side? | No. Port 3306 runs one of them. PostgreSQL can run next to either (`sudo cipi db install pgsql`).
  - Why is the engine still called `mariadb`? | So nothing that stores or exchanges it changes shape: `apps.json`, `cipi.yml`, backups and the API keep the same id. It means "the server on port 3306", whichever it is.
  - Can I do it from the web panel or the API? | No. Replacing a database server is an operator decision, so it stays on the command line. The panel shows *MySQL* where it runs.
  - How do I go back? | On a server with no databases: `sudo cipi db switch mariadb`. On a server in use: the old server you moved from is your way back, which is why you keep it for a while.
docs:
  - databases
  - sync
  - backups
  - design-decisions
---
MariaDB is Cipi's default and fits most Laravel apps without friction. Some teams need **MySQL itself**: a vendor that only certifies MySQL, parity with a managed MySQL in another environment, or a team standard. Since Cipi 5.13 one command puts MySQL on port 3306 instead, on a server that has no databases yet.

<cipi-term name="db-switch"></cipi-term>

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Port 3306** | Where Laravel's `mysql` driver connects. On a Cipi server it runs MariaDB *or* MySQL, never both |
| **Engine `mariadb`** | Cipi's name for "the server on port 3306". It keeps that name after a switch, so `--engine=mariadb`, `cipi.yml`, backups and the API don't change |
| **Switch** | MariaDB's packages removed, MySQL installed with the same root password and Cipi's tuning |
| **Empty server** | No database, no app and nothing in Cipi's registry on port 3306. The only place a switch runs |
| **Move** | A server already in use moves its apps to a new, switched server with `sudo cipi sync` |

```flow
Decide | MySQL, MariaDB or PostgreSQL | #decide
New server | Ubuntu 26.04, Cipi 5.13.1+ | #server
Switch | before the first app | #switch
Check | engines, client, tuning | #check
Create apps | as usual | #apps
Existing server | new box + cipi sync | #existing
Way back | while it's empty | #back
```

## 1. Decide: MySQL, MariaDB or PostgreSQL {#decide}

The two servers grew from the same code and speak the same protocol, so most Laravel apps can't tell them apart. The differences show up in edge features and in operations.

| Stay on MariaDB if | Switch to MySQL if | Look at PostgreSQL if |
| --- | --- | --- |
| You have no specific reason to change: it's the default, tuned and tested on every Cipi server | A vendor, an auditor or a contract asks for MySQL by name | You need JSONB, rich indexes (GIN, GiST, partial), `pgvector` or PostGIS |
| Your app uses `RETURNING`, sequences, or the native `uuid` / `inet6` column types | Another environment runs managed MySQL (RDS, Aurora MySQL, Laravel MySQL) and you want the same engine everywhere | You want one engine for the app, analytics and BI tools |
| You want features such as the thread pool in the free community server (MySQL keeps its thread pool for the Enterprise edition) | Your team runs MySQL tooling (MySQL Shell, Percona Toolkit) and knows its behaviour | You're starting a new product and can choose freely ([guide](/guides/laravel-postgresql)) |

### Differences that matter for a Laravel app {#differences}

| Topic | MariaDB | MySQL 8.4 | What to do |
| --- | --- | --- | --- |
| `json` columns | An alias of `LONGTEXT` with a `json_valid()` check | A binary JSON type | Nothing for casts and `where('meta->key', …)`: both work. See [moving data](#json) |
| UUID and IP types | Native `uuid` and `inet6` types | Not available | Laravel's `uuid()` on the `mysql` driver is `char(36)` on both. Only raw SQL or the `mariadb` driver uses the native types |
| `INSERT … RETURNING`, sequences | Supported | Not supported | Search the code for raw `RETURNING` and `NEXTVAL` before moving |
| Default `utf8mb4` collation | UCA 14 (`utf8mb4_uca1400_ai_ci`) | `utf8mb4_0900_ai_ci` | Laravel's `config/database.php` sets `utf8mb4_unicode_ci`, which both have. Cipi maps the server defaults on restore |
| Default authentication | `mysql_native_password` | `caching_sha2_password` | Nothing: PHP's `mysqlnd` supports both |
| Queue `SKIP LOCKED` | Yes | Yes | The database queue driver works on both |

## 2. Start from a new server {#server}

A switch never converts data, so it belongs at the very beginning of a server's life.

| Choose | Because |
| --- | --- |
| **Ubuntu 26.04** | Its archive ships **MySQL 8.4 LTS**. On 24.04 you get 8.0, which Oracle stopped supporting on April 30, 2026; Ubuntu still publishes security updates for it, but a new server should start on the current LTS line |
| **Cipi 5.13.1 or later** | 5.13.0 could stop silently right after "Checking the MySQL packages…" (nothing was changed). `sudo cipi self-update` if in doubt |
| **A fresh VPS** | Same sizing as for MariaDB: 2 GB of RAM is comfortable for a few apps. Cipi sizes MySQL's buffer pool from the RAM |

Install Cipi as usual ([VPS, SSH and DNS basics](/guides/vps-ssh-dns-basics)):

```bash
$ wget -O - https://cipi.sh/setup.sh | bash
```

## 3. Switch before the first app {#switch}

Log in as the `cipi` user and look at what runs on port 3306:

```bash
$ sudo cipi db engines
$ sudo cipi db switch mysql
```

The command asks before it touches anything, then goes through these steps:

```flow
Checks | nothing changes if one fails
> Cipi verifies that the server has no databases on port 3306, that apt offers a `mysql-server` package, and — with a simulation — that removing MariaDB would remove nothing but its own packages and client libraries (a Perl driver or a monitoring agent that depends on them stops the switch). It also waits if a dump, such as a backup, is running.
Stop MariaDB | data kept aside
> MariaDB is stopped and its data directory is moved to `/var/lib/mysql.mariadb-<time>`, not deleted. Its configuration is renamed, not removed.
Remove MariaDB | packages purged
> MariaDB's packages are purged (`libmariadb3` stays for anything that links it) and the MariaDB.org apt repository is removed, so it can't offer its own `mysql-common` next to MySQL.
Install MySQL | same root password
> MySQL is installed from the Ubuntu archive with the same root password, `caching_sha2_password`, and Cipi's tuning in `/etc/mysql/mysql.conf.d/99-cipi.cnf` (buffer pool sized by RAM, redo log capacity, X protocol on localhost only). Like MariaDB, it is kept out of unattended upgrades.
Rollback on failure | MariaDB comes back
> If the removal or the install fails, Cipi puts MariaDB back with its data directory and tells you what failed.
Record + notify | db_switch
> The choice is recorded, the action logged, and a `db_switch` notification goes to your channels.
```

In a provisioning script there is no terminal to confirm on, so the switch refuses to run without `--yes`:

```bash
$ wget -O - https://cipi.sh/setup.sh | SSH_PUBKEY="ssh-ed25519 AAAA… ops" bash
$ sudo cipi db switch mysql --yes
```

> [!warning] The switch is refused, on purpose, on a server that already has a database, an app or a registry entry on port 3306. The message lists what it found. Don't delete apps to get past it: use [step 6](#existing).

## 4. Check the result {#check}

```bash
$ sudo cipi db engines           # "Port 3306 runs MySQL (engine id: mariadb)"
$ sudo cipi db engines --json    # "server": "mysql" for the engine "mariadb"
$ mysql --version
$ sudo cat /etc/mysql/mysql.conf.d/99-cipi.cnf
```

| Where | You should see |
| --- | --- |
| `sudo cipi db engines` | `mariadb  installed  3306  *`, then *Port 3306 runs MySQL* |
| `sudo cipi service list` | The MySQL unit, watched by the [monitor](/docs/monitor) |
| Web panel | *MySQL* on the server's databases tab |
| `/var/lib/mysql.mariadb-<time>` | The old (empty) MariaDB data directory. Remove it once you're happy: `sudo rm -rf /var/lib/mysql.mariadb-*` |

## 5. Create apps as usual {#apps}

Nothing in the app workflow changes. The default engine is still `mariadb`, which now means MySQL:

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:acme/shop.git --branch=main --php=8.5
```

| Thing | Value on a MySQL server |
| --- | --- |
| `.env` | `DB_CONNECTION=mysql`, `DB_HOST=127.0.0.1`, `DB_PORT=3306`, its own user and password |
| TablePlus / DBeaver URL | `mysql+ssh://…` (printed at creation and by `sudo cipi credentials`) |
| `cipi.yml` databases | `engine: mariadb`, or leave it out |
| Backups, `sudo cipi db backup/restore`, `sudo cipi db password` | Same commands; the MySQL client does the work |
| Patching | `sudo cipi db upgrade` and the nightly [autoupdate](/docs/stack-upgrades) follow MySQL's packages |
| Port | Localhost only. Connect over SSH; never open 3306 to the internet |

Run the test suite against MySQL in CI too, so you find engine differences before production does:

```yaml
# .github/workflows/tests.yml (excerpt)
services:
  mysql:
    image: mysql:8.4
    env: { MYSQL_DATABASE: testing, MYSQL_ROOT_PASSWORD: secret }
    ports: ["3306:3306"]
    options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=5
# then run the tests with DB_CONNECTION=mysql DB_HOST=127.0.0.1 DB_DATABASE=testing DB_USERNAME=root DB_PASSWORD=secret
```

## 6. Move a server that already runs apps {#existing}

The data is never converted in place: a dump can't carry everything (MariaDB's `uuid`/`inet6` types, sequences, SQL only one server understands), and what it drops would surface later, in your apps. So a server in use moves the way any app moves on Cipi: to a new server.

```flow
Test in CI | your app on MySQL 8.4
> Run the test suite against MySQL (the workflow above) and fix what fails. Search for raw `RETURNING`, `NEXTVAL`, `uuid`/`inet6` columns and MariaDB-only functions.
New server | 26.04, switched first
> Create a new VPS with Ubuntu 26.04, install Cipi, run `sudo cipi db switch mysql` and install the PHP versions your apps use (`sudo cipi php install 8.4`).
Trust | old → new
> On the new server: `sudo cipi sync trust`, pasting the key printed by `sudo cipi sync pubkey` on the old one.
Push | apps, data, storage
> On the old server: `sudo cipi sync push --host=NEW_IP --with-db --with-storage --import`. Dumps are adapted on the way in (see below).
Test | with your hosts file
> Point your domain at the new IP in `/etc/hosts` on your laptop only, and test logins, orders, queues and e-mails.
Cut over | DNS, then SSL
> Final sync, switch DNS, then `sudo cipi ssl install <app>` for each app. Keep the old server stopped but intact for a week: it's your way back.
```

```bash
# new server
$ sudo cipi db switch mysql
$ sudo cipi php install 8.4
$ sudo cipi sync trust                    # paste the key from the old server
# old server
$ sudo cipi sync pubkey
$ sudo cipi sync push --host=203.0.113.20 --with-db --with-storage --import
# new server, after DNS points to it
$ sudo cipi ssl install shop
```

### What happens to the dumps on the way in {#dumps}

| In the dump | Restored into MySQL as |
| --- | --- |
| MariaDB's sandbox line (`/*M!999999\- enable the sandbox mode */`), which the MySQL client refuses | Dropped |
| UCA 14 collations (`utf8mb4_uca1400_*`) | The matching MySQL `0900` collations |
| Rows of data | Untouched |

The same filter works in the other direction: a MySQL dump restored into MariaDB gets its `0900` collations mapped to UCA 14. It applies to `sudo cipi db restore`, `sudo cipi sync` and restores from [backups](/guides/backup-vps-s3).

### JSON columns after the move {#json}

A column created as `json` on MariaDB is a `LONGTEXT` with a check, and a dump carries it that way: on MySQL it stays a text column. Laravel's `json`/`array` casts and JSON `where` clauses keep working. If you want MySQL's binary JSON type, convert the column in a migration after the move, on a quiet moment and with a fresh backup:

```php
Schema::table('orders', function (Blueprint $table) {
    $table->json('meta')->nullable()->change();
});
```

## 7. The way back {#back}

| Situation | How |
| --- | --- |
| Switched, no database created yet | `sudo cipi db switch mariadb`: same checks, same steps, the other way round |
| Apps already on MySQL | Move them to a MariaDB server with `sudo cipi sync`, as in step 6 |
| Moved from an old server last week | Point DNS back at the old server you kept. Data written since the move has to be copied back |

## Troubleshooting {#troubleshooting}

| Message | Fix |
| --- | --- |
| *MariaDB → MySQL runs only on a server with no databases on port 3306* | The server is in use. Move the apps to a new, switched server ([step 6](#existing)) |
| *Replacing the database server is never implicit* | No terminal to confirm on: add `--yes` |
| *No mysql-server package available from apt* | Run `sudo apt-get update` and check `apt-cache policy mysql-server`: a source list is missing or broken. Nothing was changed |
| *Removing MariaDB would also remove: …* | Another package depends on MariaDB's client libraries. Remove it first, or stay on MariaDB. Nothing was changed |
| *A database dump is running* | A backup is in progress. Try again when `sudo cipi backup status` shows it finished |
| Stops after "Checking the MySQL packages…" with no message | Cipi 5.13.0: `sudo cipi self-update` to 5.13.1 or later and run it again |
| `sudo cipi db install mysql` doesn't switch | By design: `install` never replaces a server. Use `sudo cipi db switch mysql` |
| App says `Access denied` after a move | `sudo cipi db password <app>` sets a new password in the database and `.env` together |
