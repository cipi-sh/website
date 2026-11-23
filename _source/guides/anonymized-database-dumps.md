---
title: Anonymize a Laravel database with Cipi Agent, step by step
description: Give developers, QA, staging and AI assistants a realistic copy of production with every personal field replaced, explained from zero: install the agent, scan the schema, review the rules, request a dump from your laptop, import it, and keep it GDPR-safe.
category: agent
order: 4
published: 2026-10-07
updated: 2026-11-23
howto: yes
keywords: laravel anonymize database, gdpr test data laravel, mysql anonymized dump, postgresql anonymize dump, production data for developers, faker anonymization
docs:
  - anonymizer
  - agent-install
  - agent-config
  - cli-client
related:
  - cipi-mcp-ai-agents
  - cipi-yml-staging-production
  - laravel-security-checklist
faq:
  - Does the anonymizer touch the production database? | No. It reads it with `mysqldump` or `pg_dump`, rewrites the dump as a stream, deletes the raw dump immediately and keeps only the anonymized file.
  - Will relations and foreign keys still work? | Yes. Ids and foreign keys are never changed. With `consistent` the same original e-mail becomes the same fake e-mail in every table, so joins on e-mail still match.
  - Can someone reverse the fake values? | Not from the fake values alone: they come from Faker, seeded by your private `seed`. Without the seed and the original data there's nothing to map back. Keep the seed out of the repository.
  - What about personal data inside JSON columns? | Columns you don't list are copied unchanged. Use `redact`, `null` or `fixed:{}` on JSON columns that may hold personal data, and run the audit after every migration.
  - How big can the database be? | The work runs in a queue job, not in the web request, so the request returns at once. Large databases take minutes; the e-mail arrives when the file is ready. Add `"gzip": true` to get a smaller `.sql.gz`.
  - Which databases? | MySQL, MariaDB and PostgreSQL.
  - Can my AI assistant use it? | Yes. The agent's MCP server has an `anonymizer` tool to audit, scan or start a dump. Giving an assistant anonymized data instead of production is the safest way to let it experiment.
  - Is this enough for GDPR? | It's a strong technical measure (data minimisation and pseudonymisation), not legal advice. Document which columns you transform in your records of processing, and keep the config reviewed.
---
Debugging with seed data misses the bugs real data causes. Copying production to laptops spreads personal data where it's least protected. The **anonymizer** in [Cipi Agent](/guides/cipi-agent-laravel-mcp) gives you the middle ground: production's structure, volume and relations, with every name, e-mail, phone, address and note replaced by realistic fake values.

## What you'll build

```flow
You ask | cipi-cli, HTTP or Artisan
Queue job | in your Laravel app
Dump | mysqldump / pg_dump
Rewrite | only the columns you listed
Signed link | by e-mail, valid 15 minutes
Your laptop | import into a local DB
```

| Term | Meaning |
| --- | --- |
| **Anonymization** | Replacing personal values with fake ones, so the data no longer identifies people |
| **Transformation** | The rule for one column: `fakeEmail`, `fakeName`, `mask:3,2`, `null`… |
| **Consistent** | The same original value always becomes the same fake value, across tables and runs |
| **Seed** | A private value that makes `consistent` reproducible and not guessable |
| **Truncate** | Keep the table, drop its rows (sessions, tokens, jobs) |

## Before you start {#before}

- A Laravel app (12 or 13) deployed with Cipi, on MySQL, MariaDB or PostgreSQL.
- A queue worker running (Cipi creates one with every Laravel app).
- Working Laravel mail (`MAIL_*` in the app's `.env`): the download link is sent by e-mail.

## 1. Install the agent and turn the anonymizer on {#enable}

On your laptop:

```bash
$ composer require cipi/agent
$ git commit -am "Add Cipi Agent" && git push       # deploys
```

On the server, as the app user (or remotely with `cipi-cli apps artisan shop …`):

```bash
$ ssh shop@203.0.113.10
$ cd ~/current
$ php artisan cipi:service anonymize --enable
$ php artisan cipi:generate-token anonymize
```

The service answers **404** until it's enabled, and every feature of the agent has its own token.

## 2. Let it propose the rules {#scan}

```bash
$ php artisan cipi:init-anonymize --scan
```

The agent reads your schema and proposes a transformation for each column that looks personal, plus tables to empty. It writes `~/.db/anonymization.json`, **outside the repository** (mode `0640`): the file maps your schema and never ships with your code.

## 3. Review the rules {#rules}

Open the file and check it. A typical result:

```json
{
  "transformations": {
    "users": {
      "name": "fakeName",
      "email": { "type": "fakeEmail", "consistent": true },
      "password": "password",
      "remember_token": "null",
      "phone": "mask:3,2",
      "date_of_birth": "fakeDate"
    },
    "orders": {
      "customer_email": { "type": "fakeEmail", "consistent": true },
      "shipping_address": "fakeAddress",
      "notes": "fakeParagraph",
      "ip_address": "fakeIpv4"
    },
    "invoices": { "vat_number": "fakeIdentifier" }
  },
  "truncate": ["sessions", "jobs", "failed_jobs", "password_reset_tokens", "personal_access_tokens"],
  "options": { "faker_locale": "it_IT", "consistent": true, "seed": "a-private-random-string" }
}
```

| Rule | Effect |
| --- | --- |
| `fakeName`, `fakeEmail`, `fakeAddress`, `fakePhoneNumber` | Realistic values in the chosen locale |
| `consistent: true` | `users.email` and `orders.customer_email` stay joinable |
| `password` | Every password becomes the hash of `options.password` (default `password`), so developers can log in as any user |
| `mask:3,2` | Keeps the first 3 and last 2 characters: `+39*******56` |
| `null`, `redact`, `fixed:value` | Remove or replace entirely |
| `truncate` | Empties tables with tokens and sessions |
| Columns not listed | **Copied unchanged**: ids, prices, statuses, timestamps |

Then check the rules against the real database (`php artisan cipi:anonymize --check` does the same plus validation, without dumping):

```bash
$ php artisan cipi:anonymize-audit
```

The audit fails on tables or columns that don't exist and lists personal-looking columns you haven't covered, with a suggestion. **Run it after every migration** that adds a column.

## 4. Request a dump from your laptop {#request}

With [cipi-cli](/docs/cli-client) and an API token (abilities `apps-view` and `apps-env`), no SSH and no token in your shell history:

```bash
$ cipi-cli prod db anonymize shop --email you@example.com
→ Requesting anonymized dump of 'shop' via https://shop.example.com/cipi/db
✓ Anonymization job queued for 'shop'
```

Within minutes you get an e-mail with a link valid for 15 minutes.

| Other ways to request | When |
| --- | --- |
| `POST https://shop.example.com/cipi/db` with the anonymizer token | From a script or CI |
| `php artisan cipi:anonymize` on the server | No e-mail; writes the file to `storage/cipi/` |
| The MCP `anonymizer` tool | From Claude, Cursor or VS Code |

## 5. Import it locally {#import}

```bash
$ cipi-cli db anonymize download "<signed url from the e-mail>" -o shop.sql
$ mysql -u root -e "CREATE DATABASE shop_local"
$ mysql -u root shop_local < shop.sql
# PostgreSQL:
$ createdb shop_local && psql shop_local < shop.sql
```

Or stream it straight in: `cipi-cli db anonymize download "<url>" -o - | mysql -u root shop_local`.

## 6. Check it {#check}

```bash
$ grep -c "real.customer@gmail.com" shop.sql        # must print 0
$ mysql shop_local -e "SELECT name, email FROM users LIMIT 5"
```

## Keep it safe {#safe}

| Practice | Why |
| --- | --- |
| Private `seed`, never committed | Fakes can't be mapped back to people |
| Audit after every migration | New personal columns are copied verbatim until listed |
| Rotate the token when people leave | `php artisan cipi:generate-token anonymize` |
| Disable when unused | `php artisan cipi:service anonymize --disable` (endpoints answer 404) |
| Tell people the shared password | Every user's password is `options.password` |
| Document the rules | For your records of processing and DPA |

## Common uses {#uses}

| Use | How |
| --- | --- |
| Staging with realistic data | Restore the dump into the staging app ([staging guide](/guides/cipi-yml-staging-production)) |
| Reproduce a customer's bug | Find the user id first with `POST /cipi/db/user` (ids survive anonymization), then look it up in the dump |
| AI assistants | Let them query the anonymized copy, not production ([MCP guide](/guides/cipi-mcp-ai-agents)) |
| Contractors | Share a file instead of production access |

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `queued` but no e-mail | Laravel mail isn't working: test with `php artisan tinker --execute="Mail::raw('t', fn(\$m)=>\$m->to('you@example.com')->subject('t'));"`; the file may already be in `storage/cipi/` |
| 404 from `/cipi/db` | Service disabled or no config: `cipi:service anonymize --enable`, `cipi:init-anonymize` |
| 400 with a list of errors | Fix `anonymization.json`; `cipi:anonymize-audit` prints the same list |
| 410 on download | The 15-minute link expired: request a new dump |
| Job never runs | No queue worker: `sudo cipi worker list shop` |
