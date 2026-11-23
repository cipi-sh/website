---
title: Back up Laravel apps and databases to S3, and restore them
description: Encrypted, scheduled backups of every app and database to AWS S3 or any S3-compatible storage (Hetzner, DigitalOcean Spaces, Backblaze B2, Wasabi, MinIO), with retention, verification and a tested restore.
category: ops
order: 1
published: 2026-03-02
updated: 2026-11-23
howto: yes
keywords: laravel backup s3, vps backup s3 compatible, mariadb backup s3, encrypted backup laravel
related:
  - migrate-server-cipi-sync
  - laravel-zero-downtime-migrations
  - server-monitoring-alerts
faq:
  - Which storage works? | Any S3-compatible bucket: AWS S3, Hetzner Object Storage, DigitalOcean Spaces, Backblaze B2, Wasabi, Cloudflare R2, MinIO or [Johnny](https://johnny.web.ap.it/) on another VPS.
  - Are backups encrypted? | With `encrypt: true` (or `--encrypt`) archives are encrypted on the server before upload. Keep the key safe: `cipi backup key show`.
  - What isn't in a backup? | Certificates (re-issued in a minute) and the releases folder (rebuilt by a deploy). Code is in Git; backups hold databases and `shared/` (`.env`, uploads).
---
A backup you haven't restored is a hope. This guide sets up encrypted backups to S3-compatible storage, checks them automatically and walks through a restore.

```flow
Destination | S3-compatible bucket
Profiles | what, how often, how long
Run | scheduled, encrypted
Verify | archives readable
Restore | one app or everything
```

## 1. Add a destination

Create a bucket and an access key limited to it, at any S3-compatible provider. Then:

```bash
$ sudo cipi backup configure                 # interactive: endpoint, bucket, keys
$ sudo cipi backup destination test
```

Secret keys are entered on the server and never travel through the panel or the API.

## 2. Create profiles

```bash
$ sudo cipi backup profile add nightly --scope=all --cron='0 2 * * *' --keep-days=14 \
    --dest=s3 --encrypt
$ sudo cipi backup profile add hourly-db --scope=db --databases='shop,tenant_*' \
    --exclude-tables='*.jobs,*.telescope_*' --every=30m --keep=48 --dest=local
$ sudo cipi backup status
```

| Scope | Contains |
| --- | --- |
| `db` | Database dumps |
| `files` | Each app's `shared/` (`.env`, `storage`, uploads) |
| `all` | Both |

`cipi backup status` flags apps and databases that **no enabled profile covers**, so a new app can't silently go unprotected.

## 3. Let the app declare its own backups

```yaml
# cipi.yml
backup:
  profiles:
    - { name: shop-db, scope: db, every: 30m, keep: 48, destinations: [local] }
    - { name: shop-nightly, scope: all, cron: "0 2 * * *", keep_days: 14, destinations: [s3], encrypt: true }
```

Profile names must start with the app's name, so a repository can't touch another app's backups.

## 4. Verify

```bash
$ sudo cipi backup verify           # archives present and readable
$ sudo cipi backup verify --deep    # also decrypts and checks contents
```

Failures go to your [notification channels](/guides/server-monitoring-alerts).

## 5. Restore

```bash
$ sudo cipi backup list --profile=nightly
$ sudo cipi backup fetch nightly 2026-11-22_020000 --dest=/root/restore
$ sudo cipi db restore shop /root/restore/shop.sql.gz
```

For a whole server, restoring backups works, but moving with [`cipi sync`](/guides/migrate-server-cipi-sync) is faster when the old server is still alive.

## Before risky deploys

A local snapshot before migrations is cheap: `sudo cipi app edit shop --predeploy-snapshot`. See [safe migrations](/guides/laravel-zero-downtime-migrations).
