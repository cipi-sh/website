---
title: Zero-downtime Laravel deploys with safe migrations
description: How atomic releases work, how to write migrations that never break the live release, and how to take a database snapshot and roll back automatically when something goes wrong.
category: laravel
order: 7
published: 2026-08-05
updated: 2026-11-23
howto: yes
keywords: laravel zero downtime deployment, laravel migrations production, laravel rollback deploy, deployer laravel
related:
  - laravel-ci-cd-git-workflow
  - backup-vps-s3
  - laravel-preview-environments
faq:
  - Does rollback undo migrations? | No. `--rollback` restores code. To undo data changes, restore the pre-deploy snapshot with `cipi db restore`.
  - What does "zero downtime" mean exactly? | The new release is built and migrated next to the live one, then a single symlink swap makes it live. Requests never hit a half-built release.
  - Can I rename a column safely? | In two deploys: add the new column and write to both, backfill, switch reads, then drop the old one in a later deploy.
  - What about long migrations on big tables? | Adding an index or a column with a default can lock a big table. On MariaDB use `ALGORITHM=INSTANT`/`INPLACE` where possible; on PostgreSQL create indexes `CONCURRENTLY` (outside a transaction).
  - Should I use maintenance mode? | Rarely. With expand-then-contract migrations the old release keeps working during the deploy, so there's nothing to hide.
docs:
  - how-deploys-work
  - safe-deploy
  - health-checks
  - deploy-audit
---
Zero downtime is two problems: switching code without a gap, and changing the database without breaking the code that's still live. Cipi solves the first. This guide shows how to handle the second.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Atomic release** | The new code goes live in one instant switch |
| **Expand / contract** | First add (columns, tables) so old and new code both work; remove later |
| **Snapshot** | A database dump taken right before migrations |
| **Auto-rollback** | Cipi restores the previous release if the health check fails |

## How a release goes live

```flow
Clone | new folder in releases/
> The code is cloned into a brand new folder under `releases/`. Visitors still use the old one.
Build | composer, npm, link .env and storage
> Dependencies and assets are built there; `.env` and `storage` are linked from `shared/`.
Migrate | against the live database
> Migrations run against the **live** database while the **old** code is still serving. That's why migrations must not break the old code.
Swap | one atomic symlink
> `current` switches to the new folder in one atomic step.
Restart | workers, Octane, FPM reload
> Workers and Octane restart, PHP-FPM reloads: everything runs the new code.
```

The old release keeps serving until the swap. The previous five releases stay on disk for an instant `sudo cipi deploy shop --rollback`.

## The catch: migrations run before the swap

For a few seconds the **old code runs against the new schema**. Migrations must be backward compatible with the release that's still live.

| Change | Safe way |
| --- | --- |
| Add a column | Nullable or with a default. Safe in one deploy |
| Rename a column | Add the new column, write to both, backfill, switch reads, drop the old one in a later deploy |
| Drop a column | First deploy code that no longer uses it, then drop it in the next deploy |
| Add an index on a big table | Use the engine's online method (`ALGORITHM=INPLACE` on MariaDB, `CREATE INDEX CONCURRENTLY` on PostgreSQL) |
| Make a column NOT NULL | Backfill first, constrain later |

This "expand, then contract" rhythm is what lets you deploy many times a day.

## Take a snapshot first

```bash
$ sudo cipi deploy shop --snapshot             # dump first, continue if the dump fails
$ sudo cipi deploy shop --snapshot-required    # abort the deploy if the dump fails
$ sudo cipi app edit shop --predeploy-snapshot # every deploy, whatever triggered it
```

Dumps land in `/var/log/cipi/backups/`. To undo a bad migration:

```bash
$ sudo cipi db restore shop /var/log/cipi/backups/shop_20261123_143012.sql.gz
$ sudo cipi deploy shop --rollback
```

## Roll back automatically

```yaml
# cipi.yml
health:
  url: "https://shop.example.com/up"
  expect: 200
  rollback_on_unhealthy: true
deploy:
  predeploy_snapshot: true
```

After every deploy Cipi calls the health URL. If the new release doesn't answer as expected, the previous release goes back live and you get notified.

## Know who deployed what

Every deploy, from any trigger, is recorded in a hash-chained [audit trail](/docs/deploy-audit):

```bash
$ sudo cipi deploy shop --audit
$ sudo cipi deploy shop --history
```

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Old release errors during deploy | A migration removed something it uses: split into expand and contract |
| Deploy stuck on a migration | A table lock: check running queries, use online DDL |
| Rolled back code, data still new | Expected: restore the snapshot if needed |
| No snapshot was taken | `--snapshot` continues if the dump fails; use `--snapshot-required` |
