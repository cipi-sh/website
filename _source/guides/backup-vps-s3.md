---
title: Back up Laravel apps and databases to S3, and restore them
description: Encrypted, scheduled backups of every app and database to AWS S3 or any S3-compatible storage (Hetzner, DigitalOcean Spaces, Backblaze B2, Wasabi, MinIO), with retention, verification and a tested restore.
category: ops
order: 1
published: 2026-03-02
updated: 2026-11-24
howto: yes
keywords: laravel backup s3, vps backup s3 compatible, mariadb backup s3, encrypted backup laravel
related:
  - migrate-server-cipi-sync
  - laravel-zero-downtime-migrations
  - server-monitoring-alerts
faq:
  - Which storage works? | Any S3-compatible bucket: AWS S3, Hetzner Object Storage, DigitalOcean Spaces, Backblaze B2, Wasabi, Cloudflare R2, MinIO or [Johnny](https://johnny.web.ap.it/) on another VPS.
  - Are backups encrypted? | With `encrypt: true` (or `--encrypt`) archives are encrypted on the server before upload. Keep the key safe: `cipi backup key show`.
  - What isn't in a backup? | Certificates (re-issued in a minute) and the releases folder (rebuilt by a deploy). Code is in Git; backups hold databases and `shared/` (`.env`, uploads), minus any `--exclude-paths` you set.
  - Which bucket provider? | Any S3-compatible one: AWS S3, Hetzner, Backblaze B2, Wasabi, Cloudflare R2, Scaleway, DigitalOcean Spaces. Pick one in another region or provider than the server.
  - Where is the encryption key? | `cipi backup key show` prints it. Store it in your password manager: without it, encrypted archives can't be opened.
  - How long does a restore take? | Minutes for a typical app. Test it now so you know: `cipi backup fetch` into a scratch folder, then restore a database.
  - What if a step fails? | Read the troubleshooting table above first. Then check the matching [docs](/docs/) page, open a GitHub issue, or ask in the community. Most commands print the fix when they refuse something.
docs:
  - backups
  - databases
  - vault
  - sync
---
A backup you haven't restored is a hope. This guide sets up encrypted backups to S3-compatible storage, checks them automatically and walks through a restore.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Destination** | Where archives go: the server's disk, or an S3-compatible bucket |
| **Profile** | What to back up, how often and how long to keep it |
| **Retention** | How many runs or days are kept before old ones are deleted |
| **Off-site** | In another place than the server, so one disaster can't take both |
| **3-2-1** | Three copies, two kinds of storage, one off-site |

```flow
Destination | S3-compatible bucket | #destination
Profiles | what, how often, how long | #profiles
In cipi.yml | the app declares its own | #in-cipi-yml
Verify | archives readable | #verify
Restore | one app or everything | #restore
```

<cipi-term name="backup"></cipi-term>

## 1. Add a destination {#destination}
Create a bucket and an access key limited to it, at any S3-compatible provider. Then:

```bash
$ sudo cipi backup configure                 # on the server; then "s3": bucket, keys, region, endpoint
$ sudo cipi backup destination test
```

The bucket is reached with the keys before anything is saved. `configure` sets backups up on the server and offers to add the bucket right after (or later: `cipi backup destination add s3 --bucket=… --key=… --use=default`). The same from the [web panel](/docs/backups#panel) — *Set up backups*, then *Add an S3 bucket* — or the API: the secret key goes to the server once, on the CLI's standard input, never on a command line, and neither panel nor API keeps it.

## 2. Create profiles {#profiles}
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

A very large uploads folder (hundreds of GB) is better copied with `rsync` than archived every night. Leave it out of a profile (Cipi 5.13.0+):

```bash
$ sudo cipi backup profile edit nightly --exclude-paths='storage/app/uploads,*.mp4'
$ sudo cipi backup run --profile=nightly --dry-run     # says what each app leaves out
```

Paths are relative to the app (`shop:storage/app/uploads` for one app only); the archive's `meta.json` lists what was left out, so a restore knows which folders come back from elsewhere.

## 3. Let the app declare its own backups {#in-cipi-yml}
```yaml
# cipi.yml
backup:
  profiles:
    - { name: shop-db, scope: db, every: 30m, keep: 48, destinations: [local] }
    - { name: shop-nightly, scope: all, cron: "0 2 * * *", keep_days: 14, destinations: [s3], encrypt: true }
```

Profile names must start with the app's name, so a repository can't touch another app's backups.

## 4. Verify {#verify}
```bash
$ sudo cipi backup verify           # archives present and readable
$ sudo cipi backup verify --deep    # also decrypts and checks contents
```

Failures go to your [notification channels](/guides/server-monitoring-alerts).

## 5. Restore {#restore}
```bash
$ sudo cipi backup list --profile=nightly
$ sudo cipi backup fetch nightly 2026-11-22_020000 --dest=/root/restore
$ sudo cipi db restore shop /root/restore/shop.sql.gz
```

For a whole server, restoring backups works, but moving with [`cipi sync`](/guides/migrate-server-cipi-sync) is faster when the old server is still alive.

## Before risky deploys

A local snapshot before migrations is cheap: `sudo cipi app edit shop --predeploy-snapshot`. See [safe migrations](/guides/laravel-zero-downtime-migrations).

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| `destination test` fails | Key lacks bucket permissions, wrong region or endpoint |
| Backups overdue | `cipi backup status` names the profile; check disk space and the log |
| Can't open an archive | Wrong key: use the one from `cipi backup key show` at that time |
| Restore refuses an empty dump | By design: an empty backup never wipes a database |
