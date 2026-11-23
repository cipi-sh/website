---
title: GDPR-safe production data for developers with the Cipi anonymizer
description: Give developers, QA and AI assistants a realistic copy of your Laravel database with names, e-mails, phones and notes replaced by fake values, consistent across tables and delivered by an expiring link.
category: agent
order: 4
published: 2026-10-07
updated: 2026-11-23
howto: yes
keywords: laravel anonymize database, gdpr test data laravel, mysql anonymized dump, production data for developers
related:
  - cipi-mcp-ai-agents
  - cipi-agent-laravel-mcp
  - laravel-security-checklist
faq:
  - Does it change production? | No. It dumps the database, rewrites the dump as a stream, deletes the raw dump and gives you only the anonymized file.
  - Will foreign keys still work? | Yes. Ids and foreign keys are never touched, and `consistent` makes the same e-mail become the same fake e-mail in every table.
  - Which databases? | MySQL, MariaDB and PostgreSQL.
---
Debugging with fake seed data misses the bugs that real data causes. Copying production to laptops is a GDPR problem. The anonymizer in [Cipi Agent](/guides/cipi-agent-laravel-mcp) gives you the middle ground: production's structure and volume, with every personal field replaced.

```flow
Enable | in the app | #enable
Rules | what gets replaced | #rules
Request | from your laptop | #request
Check | no real data left | #check
```

## 1. Enable it in the app {#enable}
```bash
$ composer require cipi/agent                    # commit, deploy
$ php artisan cipi:service anonymize --enable    # as the app user
$ php artisan cipi:generate-token anonymize
$ php artisan cipi:init-anonymize --scan
```

`--scan` reads your schema and proposes a transformation for every column that looks personal (e-mails, names, phones, addresses, IPs, tokens, passwords, tax ids, card data, free text) and empties tables like `sessions`, `jobs` and `password_reset_tokens`. The file goes to `~/.db/anonymization.json`, **outside the repository**.

## 2. Review the rules {#rules}
```json
{
  "transformations": {
    "users": {
      "name": "fakeName",
      "email": { "type": "fakeEmail", "consistent": true },
      "password": "password",
      "phone": "mask:3,2"
    },
    "orders": {
      "customer_email": { "type": "fakeEmail", "consistent": true },
      "internal_notes": "fakeParagraph"
    }
  },
  "truncate": ["sessions", "jobs", "failed_jobs", "password_reset_tokens"],
  "options": { "faker_locale": "it_IT", "consistent": true, "seed": "keep-this-private" }
}
```

Every password becomes the hash of `options.password` (default `password`), so developers can log in. Then audit against the live schema:

```bash
$ php artisan cipi:anonymize-audit
```

It fails on unknown tables or columns and lists personal-looking columns you didn't cover. **Run it after every migration.**

## 3. Get a dump from your laptop {#request}
```bash
$ cipi-cli prod db anonymize shop --email dev@example.com
✓ Anonymization job queued for 'shop'
$ cipi-cli db anonymize download "<signed url from the e-mail>" -o - | mysql -u root shop_local
```

No SSH, no token in your shell history: [cipi-cli](/docs/cli-client) reads it through the API. The link expires after 15 minutes.

## 4. Check it {#check}
```bash
$ grep -c "real.customer@gmail.com" shop.sql     # must be 0
```

## Good practice

| Do | Why |
| --- | --- |
| Use `consistent` with a private `seed` | Data stays joinable; fakes can't be reversed |
| Never commit `anonymization.json` | It maps your schema |
| Rotate the token when people leave | `cipi:generate-token anonymize` |
| Give AI assistants the dump, not production | Same bugs, no personal data |

Full reference: [Database anonymizer](/docs/anonymizer).
