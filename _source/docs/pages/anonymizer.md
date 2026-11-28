@section agent-anonymizer

The anonymizer gives you **a copy of production that looks real but contains no real people**. Developers, QA, staging and contractors get the same tables, volumes and relations, with e-mails, names, phones, addresses and notes replaced by Faker values. MySQL, MariaDB and PostgreSQL are supported.

It lives inside your Laravel app (`cipi/agent`), runs as a queued job, and is safe by construction: the raw dump is deleted as soon as it's processed, outputs are `0600`, database passwords travel in the environment, never on a command line, and the download link expires.

```flow
Request | POST /cipi/db, cipi-cli or Artisan
> You ask for a dump in one of three ways: `cipi-cli prod db anonymize myapp --email you@example.com` from your laptop, a `POST /cipi/db` with the anonymizer token, or `php artisan cipi:anonymize` on the server.
> The HTTP request returns `{"status":"queued"}` at once: the work happens in the background.
Queue | AnonymizeDatabaseJob
> `AnonymizeDatabaseJob` goes on the app's queue and a worker runs it. No worker running means nothing happens: check with `sudo cipi worker list myapp`.
Dump | mysqldump / pg_dump
> The job reads the database with the engine's own tool (`mysqldump` for MariaDB/MySQL, `pg_dump` for PostgreSQL). It only reads: production is never changed.
Rewrite | only configured columns
> Each column listed in `anonymization.json` is replaced while the dump streams; tables in `truncate` are emptied; everything else is copied as is. The raw dump is deleted right away.
Email | signed link, 15 minutes
> A signed download link is e-mailed to the address in the request, valid for 15 minutes (`CIPI_ANONYMIZER_TTL`). The API never returns it, so the e-mail is the only way to the file.
```

| Use case | Why it fits |
| --- | --- |
| Local development | Realistic data on every laptop, no production e-mails |
| Staging and previews | Production structure and volume, PII replaced |
| QA and demos | Reproduce bugs that depend on real relations, without GDPR risk |
| Contractors | Share a SQL file instead of production access |

## Anonymizer vs backups {#agent-anonymizer-vs-api}

| | Anonymizer (`cipi/agent`) | Backups ([Cipi API](/docs/api)) |
| --- | --- | --- |
| Scope | One Laravel app's database | Any database on the server |
| Output | SQL with fake values in sensitive columns | Full compressed backup, real data |
| Auth | `CIPI_ANONYMIZER_TOKEN` (per app) | Sanctum token with `dbs-manage` |
| For | People who need realistic data | Disaster recovery, cloning |

Use both: backups for operations, anonymized dumps for humans.

## Requirements {#requirements}

| Requirement | Why |
| --- | --- |
| `cipi/agent` installed | The anonymizer is part of the agent |
| A queue worker | `POST /cipi/db` dispatches a job; without a worker nothing runs |
| `mysqldump` / `mariadb-dump` / `pg_dump` | Found on `PATH`, or set `CIPI_MYSQLDUMP` / `CIPI_PG_DUMP` |
| Laravel mail (`MAIL_*`) | The download link only travels by e-mail |
| `anonymization.json` on the server | In `~/.db/` (or `~/.cipi/`), outside the repository |

## Setup {#setup}

As the app user on the server ([SSH as the app user](/docs/app-ssh)), or remotely with `cipi-cli apps artisan myapp …`:

```bash
$ composer require cipi/agent                   # commit, push, deploy
$ php artisan cipi:service anonymize --enable
$ php artisan cipi:generate-token anonymize
$ php artisan cipi:init-anonymize --scan        # proposes a config from your schema
$ php artisan cipi:anonymize-audit              # config vs live database
```

`--scan` proposes a transformation for every column that looks like personal data (e-mails, names, phones, addresses, IPs, tokens, passwords, tax ids, card data, free text) and empties operational tables (`sessions`, `jobs`, `failed_jobs`, `password_reset_tokens`, `personal_access_tokens`, Telescope, Pulse). Foreign keys and timestamps are never touched. The file is written to `~/.db/anonymization.json` with mode `0640` and is never deployed.

The audit fails on unknown tables, columns or transformations, warns about password columns not set to `password`, and lists uncovered columns that look personal, with a suggestion. **Run it after every migration.**

## Configuration {#agent-anonymizer-config}

Lookup order: `CIPI_ANONYMIZER_CONFIG`, then `~/.db/anonymization.json`, then `~/.cipi/anonymization.json`.

```json
{
  "transformations": {
    "users": {
      "name": "fakeName",
      "email": { "type": "fakeEmail", "unique": true, "consistent": true },
      "password": "password",
      "remember_token": "null",
      "phone": "mask:3,2"
    },
    "orders": {
      "customer_email": { "type": "fakeEmail", "consistent": true },
      "card_last_four": "numerify:####",
      "internal_notes": "fakeParagraph"
    }
  },
  "truncate": ["sessions", "jobs", "failed_jobs", "password_reset_tokens"],
  "options": { "faker_locale": "en_US", "consistent": true, "seed": "change-me" }
}
```

Keys under `transformations` are tables, nested keys are columns. **Columns not listed are copied unchanged**, which is how ids, enums and business fields survive. `NULL` stays `NULL` (except with `fixed`).

| Flag | Effect |
| --- | --- |
| `consistent` | Same original, same fake value, across tables and runs with the same `seed`: `users.email` still joins `orders.customer_email` |
| `unique` | No duplicates in the column; default for `fakeEmail`, `fakeSafeEmail`, `fakeUserName`, `fakeUuid`, `fakeToken`, `fakeIban` |
| `truncate` | Keeps the table, drops its rows |
| `password` | Every row gets the hash of `options.password` (computed once), so developers can log in |

### Transformations {#transformations}

`php artisan cipi:anonymize --transformations` prints the catalogue.

| Transformation | Output |
| --- | --- |
| `fakeName`, `fakeFirstName`, `fakeLastName`, `fakeUserName` | Names |
| `fakeEmail`, `fakeSafeEmail` | E-mail (`fakeSafeEmail` uses example.com) |
| `fakeCompany`, `fakeJobTitle` | Company, job title |
| `fakeAddress`, `fakeStreetAddress`, `fakeCity`, `fakeState`, `fakePostcode`, `fakeCountry`, `fakeCountryCode` | Postal data |
| `fakePhoneNumber` | Phone |
| `fakeDate`, `fakeDateTime` | `Y-m-d`, `Y-m-d H:i:s` |
| `fakeUrl`, `fakeDomain` | URL, domain |
| `fakeParagraph`, `fakeSentence`, `fakeText[:len]`, `fakeWord` | Free text |
| `fakeIban[:CC]`, `fakeCreditCardNumber` | Banking data in test ranges |
| `fakeIpv4`, `fakeIpv6`, `fakeMacAddress`, `fakeUserAgent` | Network identifiers |
| `fakeUuid`, `fakeToken[:len]`, `fakeIdentifier` | UUID, hex token, tax-id-like value |
| `fakeLatitude`, `fakeLongitude`, `fakeNumber[:digits]`, `fakeBoolean` | Numbers |
| `numerify:###`, `lexify:???`, `bothify:?#` | Patterns (`#` digit, `?` letter) |
| `password` | Hash of `options.password` |
| `null`, `empty`, `fixed:value`, `redact` | `NULL`, `''`, a constant, `[REDACTED]` |
| `hash[:len]`, `mask:first,last`, `keep` | Seeded SHA-256, partial mask (`j*******om`), unchanged |

### Options {#options}

| Option | Default | Meaning |
| --- | --- | --- |
| `hash_algorithm` | `auto` | App Hash driver, or `bcrypt`, `argon2id`, `argon2i`, `argon2d` |
| `password` | `password` | Plaintext behind every `password` column |
| `faker_locale` | `en_US` | e.g. `it_IT`, `de_DE` |
| `consistent` | `false` | Default for all columns |
| `seed` | `null` | Keep it private; change it for a different dataset |
| `gzip` | `false` | `.sql.gz` output |
| `connection` | `null` | Another `config/database.php` connection |
| `dump_args` | `[]` | Extra dump flags, one per entry |

> [!warning] Anonymization is **opt-in per column**. PII in a JSON column, a blob or a column you forgot is copied verbatim. Watch `metadata`, `settings` and audit tables.

## Delivery by e-mail {#agent-anonymizer-email}

The API never returns the download URL: **the e-mail is the only channel**, and it goes only to the `email` in the request (no CC, no fallback). Success sends a signed link valid for `CIPI_ANONYMIZER_TTL` minutes (default 15); failure sends the error and the job id.

It uses your app's Laravel mail (`MAIL_*`), not the server's `sudo cipi smtp`. Test it before the first export:

```bash
$ php artisan tinker --execute="Mail::raw('test', fn (\$m) => \$m->to('you@example.com')->subject('Mail test'));"
```

> [!warning] `{"status":"queued"}` only means the job was queued. If nothing arrives, check `storage/logs/laravel.log` and `php artisan queue:failed`. The file may already be in `storage/cipi/`.

## HTTP API {#agent-anonymizer-curl}

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/cipi/db` | Bearer token | Validate the config, queue a job (`{"email", "gzip"}`) |
| `POST` | `/cipi/db/user` | Bearer token | Find `users.id` from a production e-mail (ids survive anonymization) |
| `GET` | `/cipi/db/{token}` | Signed URL | Download; expires after the TTL |

```bash
$ curl -sS -X POST "$APP_URL/cipi/db" \
    -H "Authorization: Bearer $CIPI_ANONYMIZER_TOKEN" \
    -H "Accept: application/json" -H "Content-Type: application/json" \
    -d '{"email": "developer@example.com"}'
{"status":"queued","email":"developer@example.com","link_valid_minutes":15}

$ curl -sS -L -o anonymized.sql "<signed url from the e-mail>"
```

| HTTP | Meaning | Fix |
| --- | --- | --- |
| 403 | Bad or missing token | `cipi:generate-token anonymize` |
| 404 | Service disabled or no config | `cipi:service anonymize --enable`, `cipi:init-anonymize` |
| 400 | Invalid `anonymization.json` (all errors listed) | Fix it; `cipi:anonymize-audit` prints the same list |
| 422 | Missing `email` | Send `{"email": "…"}` |
| 410 | Download link expired | Request a new dump |
| 500 | DB error or dump tool missing | Laravel logs, `CIPI_MYSQLDUMP` / `CIPI_PG_DUMP` |

## From your laptop {#agent-anonymizer-cli}

`cipi-cli` drives the same flow through the [Cipi API](/docs/cli-client): you name the app, it reads `APP_URL`, `CIPI_ROUTE_PREFIX` and the anonymizer token from the app's `.env`, and calls the agent. No SSH, no token in your shell history.

```bash
$ cipi-cli prod db anonymize myapp --email dev@example.com
→ Requesting anonymized dump of 'myapp' via https://myapp.example.com/cipi/db
✓ Anonymization job queued for 'myapp'

$ cipi-cli db anonymize download "<signed url>" -o myapp.sql
✓ Saved myapp.sql (24.5 MB)

$ cipi-cli db anonymize download "<signed url>" -o - | mysql -u root myapp_local
```

Every failure names its fix (service disabled, token missing, custom or Node app, redirect to another host: pass `--url`). The API token needs `apps-view` and `apps-env`, plus `apps-artisan` for remote setup.

## On the server, without HTTP {#artisan}

```bash
$ php artisan cipi:anonymize                    # → storage/cipi/anonymized_<timestamp>.sql
$ php artisan cipi:anonymize --gzip
$ php artisan cipi:anonymize <config> <output.sql>
$ php artisan cipi:anonymize --check            # validate + audit, no dump
```

Writes the file directly (no e-mail), reports rows transformed per table, tables emptied and warnings, and exits non-zero on failure. Good for cron and scripts.

## Security checklist {#security}

- Keep `CIPI_ANONYMIZER_TOKEN` in a secrets manager; rotate it after team changes; disable the service when unused.
- Tell recipients the shared password, and never use a real one in `options.password`.
- Use `consistent: true` with a private `seed`.
- Run `cipi:anonymize-audit` after every migration.
- Any API token with `apps-env` can read the anonymizer token: scope tokens.
- Verify a dump: grep for a known production e-mail. It must not appear.
- Never commit `anonymization.json`: it maps your schema.
