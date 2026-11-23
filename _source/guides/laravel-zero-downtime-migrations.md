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
---
Zero downtime is two problems: switching code without a gap, and changing the database without breaking the code that's still live. Cipi solves the first. This guide shows how to handle the second.

## How a release goes live

```flow
Clone | new folder in releases/
Build | composer, npm, link .env and storage
Migrate | against the live database
Swap | one atomic symlink
Restart | workers, Octane, FPM reload
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
