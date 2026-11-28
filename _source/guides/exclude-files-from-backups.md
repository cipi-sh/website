---
title: Exclude files and folders from backups
description: Keep huge uploads, videos, caches and logs out of Cipi's backup archives with --exclude-paths or exclude_paths in cipi.yml, preview what is left out with a dry run, and keep the excluded folders safe another way.
category: ops
order: 1
published: 2026-11-24
updated: 2026-11-24
howto: yes
keywords: exclude folder from backup laravel, backup exclude uploads, cipi backup exclude-paths, cipi.yml backup exclude, laravel storage backup s3
related:
  - backup-vps-s3
  - cipi-yml-recipes
  - johnny-s3-storage
faq:
  - Which Cipi version do I need? | 5.13.0 or later on the server (`sudo cipi self-update`). The web panel needs cipi/api 1.43 and cipi/gui 4.5 to show the field.
  - Can I exclude a database or a table too? | Yes, with other flags: `--exclude-databases` leaves whole databases out, `--exclude-tables` skips tables such as `*.jobs` or `*.telescope_*`. `--exclude-paths` is only for files.
  - Is `.env` safe from an exclusion? | Only if no pattern matches it. Don't write patterns like `.env*` or `*.env`: without `.env` (and its `APP_KEY`) a restored app can't read its own encrypted data.
  - Does `--exclude-paths` add to the list or replace it? | It replaces it. Pass every pattern you want each time, or `--exclude-paths=` to empty it.
  - Can I use the `shop:` prefix in cipi.yml? | No. A cipi.yml belongs to one app, so its patterns apply to that app only and the prefix is refused. Use it on the command line, for server-wide profiles.
  - Will a restore warn me about what's missing? | Each app archive has a `meta.json` with `excluded_paths`. Read it after `cipi backup fetch` to know which folders come back from elsewhere.
  - Are Meilisearch indexes and releases backed up? | No, and they don't need to be: indexes are rebuilt with `scout:import`, releases by the next deploy. Code is in Git.
docs:
  - backups
  - yml
  - cli-client
  - disk
---
A nightly backup should take minutes, not hours. When one app keeps hundreds of gigabytes of uploads or videos, archiving them every night makes runs slow, buckets expensive and restores painful. Since Cipi 5.13 a backup profile can **leave paths out** of the app archives, from the CLI, from `cipi.yml`, from your laptop or from the panel.

<cipi-term name="backup-exclude"></cipi-term>

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **App archive** | `files.tar.gz` per app per run. A Laravel app's `shared/` folder (`.env`, `storage/`, uploads); a custom app's `htdocs/` |
| **Profile** | What to back up, how often, where and for how long. Exclusions belong to a profile |
| **Exclude pattern** | A path relative to the app, or a wildcard: `storage/app/uploads`, `*.mp4` |
| **Per-app pattern** | `shop:storage/app/uploads`: only for the apps named (or matched by a glob) before the colon |
| **`meta.json`** | Travels with each archive and lists `excluded_paths`, so a restore knows what is missing |

```flow
Find | what's heavy | #find
Patterns | what matches | #choose
CLI | --exclude-paths | #cli
Dry run | see it first | #dry-run
cipi.yml | per app | #in-cipi-yml
Keep safe | rsync, S3 | #keep-safe
Restore | and check | #restore
```

## 1. Find what makes the archives heavy {#find}

```bash
$ sudo cipi disk                                   # apps, largest first
$ sudo du -sh /home/shop/shared/storage/app/* | sort -h | tail
$ sudo cipi backup list --profile=nightly          # the runs a profile has kept
```

`cipi disk` shows files and database per app; `du` tells you which folder inside `shared/` is the big one. Usual suspects:

| Folder | Typical content | Exclude? |
| --- | --- | --- |
| `storage/app/uploads`, `storage/app/public` | User uploads, media library | Yes, **if** they're copied elsewhere ([step 7](#keep-safe)) |
| `*.mp4`, `*.mov`, `*.zip` | Videos, exports, archives | Yes, if they're kept elsewhere or can be produced again |
| `storage/framework/cache` | File cache | Yes: rebuilt on demand |
| `storage/logs` | `laravel.log` | Usually yes: logs are rotated on the server and better shipped to a log service |
| `storage/app/livewire-tmp` | Livewire temporary uploads | Yes |
| `storage/debugbar`, `storage/clockwork` | Debug data | Yes |
| `wp-content/cache`, `wp-content/ai1wm-backups`, `wp-content/updraft` | WordPress caches and *plugins' own* backups | Yes |
| `.env` | Configuration and `APP_KEY` | **Never** |

## 2. Write patterns that match what you mean {#choose}

Patterns are matched against the names **inside the archive**, which start with `shared/` (Laravel and Node apps) or `htdocs/` (custom apps). You write them relative to the app; Cipi takes care of the rest.

| Rule | Example | Leaves out |
| --- | --- | --- |
| Relative to the app | `storage/app/uploads` | `shared/storage/app/uploads` and everything in it |
| Custom apps too | `wp-content/uploads` | `htdocs/wp-content/uploads` |
| Matched after any `/` | `storage/logs` | Any `…/storage/logs`, at any depth |
| Wildcards cross `/` | `*.mp4` | Every `.mp4`, in every folder |
| Wildcards inside a path | `storage/app/*/cache` | `storage/app/tenant1/cache`, `storage/app/tenant2/cache`… |
| Some apps only (CLI) | `shop:storage/app/uploads`, `api-*:*.csv` | Only in `shop`; only in apps whose name starts with `api-` |
| Refused | `/home/shop/shared/…`, `*`, `shared`, `htdocs` | Absolute paths match nothing; the last three would leave the whole app out |

> [!warning] Short, generic names catch more than you think. `cache` leaves out **every** folder called `cache`, including one your users upload into. Prefer the full path: `storage/framework/cache`. Patterns are case-sensitive.

Allowed characters: letters, digits, `.`, `_`, `-`, `/`, `@`, `+`, spaces, `*`, `?` and `[ ]`. At most 255 characters per pattern.

## 3. Exclude in a server-wide profile {#cli}

Server profiles are yours, the operator's. Set exclusions when you create a profile or edit it later:

```bash
$ sudo cipi backup profile add nightly --scope=all --cron='0 2 * * *' --keep-days=14 \
    --dest=s3 --encrypt --exclude-paths='storage/framework/cache,storage/logs'
$ sudo cipi backup profile edit nightly \
    --exclude-paths='storage/framework/cache,storage/logs,shop:storage/app/uploads,*.mp4'
$ sudo cipi backup profile show nightly
```

> [!tip] `--exclude-paths` **replaces** the list. To add one pattern, pass the old ones again; to take everything again, empty it: `--exclude-paths=`.

A common layout keeps databases frequent and complete, and files lighter:

```bash
# every 30 minutes, databases only: nothing to exclude
$ sudo cipi backup profile add db-30m --scope=db --every=30m --keep=48 --dest=local,s3 --encrypt \
    --exclude-tables='*.jobs,*.failed_jobs,*.telescope_*'
# nightly files, without the heavy media kept elsewhere
$ sudo cipi backup profile add files-nightly --scope=files --cron='30 2 * * *' --keep-days=30 \
    --dest=s3 --encrypt --exclude-paths='storage/app/uploads,storage/framework/cache,storage/logs,*.mp4'
# weekly full copy, uploads included, kept longer
$ sudo cipi backup profile add weekly-full --scope=all --cron='0 4 * * 0' --keep-weeks=8 --dest=offsite --encrypt
```

The weekly full copy is the safety net: even if your uploads sync breaks silently, there is a recent archive with everything.

## 4. Check with a dry run {#dry-run}

Before the next scheduled run, ask the profile what it would do:

```bash
$ sudo cipi backup run --profile=nightly --dry-run
```

```text
Backup profile 'nightly' (all, 2026-11-24_101500)
  Would archive files for 3 app(s):
    shop (shared; leaving out storage/framework/cache,storage/logs,storage/app/uploads,*.mp4)
    blog (htdocs; leaving out storage/framework/cache,storage/logs,*.mp4)
    api (shared; leaving out storage/framework/cache,storage/logs,*.mp4)
  Would dump 3 database(s):
    shop (mariadb)
    blog (mariadb)
    api (pgsql)
  Destinations: s3 (encrypted)
```

The real run prints the same "leaving out" list for each app, in the terminal and in the backup log. Then confirm that nothing is left unprotected:

```bash
$ sudo cipi backup run --profile=nightly
$ sudo cipi backup status        # also flags apps and databases no profile covers
$ sudo cipi backup verify --deep
```

## 5. Let the app declare its exclusions in cipi.yml {#in-cipi-yml}

An app can own its backup profiles in [`cipi.yml`](/cipi-yml), next to its workers and schedule. `exclude_paths` is a list:

```yaml
# cipi.yml (app "shop")
backup:
  profiles:
    # frequent, cheap: databases only
    - name: shop-db
      scope: db
      every: 30m
      keep: 48
      exclude_tables: ["*.jobs", "*.failed_jobs", "*.telescope_*"]
      destinations: [local, s3]
      encrypt: true

    # nightly: .env and storage, without what is kept elsewhere
    - name: shop-nightly
      scope: all
      cron: "0 2 * * *"
      keep_days: 14
      exclude_paths: ["storage/app/uploads", "storage/framework/cache", "storage/logs", "*.mp4"]
      destinations: [s3]
      encrypt: true
```

A WordPress site deployed as a custom app writes paths relative to `htdocs/`:

```yaml
# cipi.yml (custom app "blog")
backup:
  profiles:
    - name: blog-nightly
      scope: all
      cron: "15 2 * * *"
      keep_days: 30
      exclude_paths: ["wp-content/cache", "wp-content/ai1wm-backups", "wp-content/updraft", "*.log"]
      destinations: [s3]
      encrypt: true
```

Per environment, a staging copy rarely needs the uploads at all ([staging and production](/guides/cipi-yml-staging-production)):

```yaml
# cipi-staging.yml (app "shop-stg"; this file doesn't inherit from cipi.yml)
backup:
  profiles:
    - name: shop-stg-nightly
      scope: all
      every: 1d
      keep: 3
      exclude_paths: ["storage/app", "storage/logs"]
      destinations: [local]
```

Then plan and apply, as with any `cipi.yml` change:

```bash
$ sudo cipi yml validate shop   # parse and check, change nothing
$ sudo cipi yml plan shop       # what would change
$ sudo cipi yml apply shop
$ sudo cipi yml generate shop   # the app's current setup as a file, exclude_paths included
```

| cipi.yml rule | Why |
| --- | --- |
| Profile names are `<app>` or `<app>-*` | A repository can't change another app's backups |
| No `app:` prefix in patterns | The file already belongs to one app |
| `*`, `shared`, `htdocs` and absolute paths refused | *"would leave the whole app out of its backup"* / *"invalid pattern"*: the plan stops before applying |
| At most 10 profiles per app | Keeps the schedule readable |

## 6. From your laptop, the API or the panel {#remote}

Same field, same validation, wherever you edit it:

```bash
$ cipi-cli backup profile edit nightly --exclude-paths storage/app/uploads,*.mp4
$ cipi-cli backup profile edit nightly --exclude-paths ""     # take everything again
$ cipi-cli backup status
```

| Interface | Where |
| --- | --- |
| [cipi-cli](/docs/cli-client#backup) | `backup profile add|edit --exclude-paths` |
| [REST API](/docs/api) | Backup profile fields, ability `backups-manage` |
| [Web panel](/docs/gui) | Server → Backups → profile form (cipi/gui 4.5+) |

Destinations are not part of a profile: they are set up with `cipi backup configure` and `cipi backup destination add`, or from the [panel](/docs/backups#panel).

## 7. Keep the excluded folders safe {#keep-safe}

Excluding a folder from the archive is not the same as not protecting it. Pick one of these for every excluded folder that holds data you can't recreate:

| Option | Good for | How |
| --- | --- | --- |
| **Object storage from the start** | New apps, media libraries | Store uploads on an S3 disk (`FILESYSTEM_DISK=s3`) with bucket versioning; the server keeps no copy. Your own bucket: [Johnny](/guides/johnny-s3-storage) |
| **rsync to another server** | Large folders that change a little every day | Only changes travel; see below |
| **rclone to a bucket** | Off-site copies without a second server | `rclone sync` to any S3-compatible bucket with versioning on |
| **The weekly full profile** | A safety net for all of the above | [Step 3](#cli) |

An hourly `rsync` of the uploads folder to a backup host, as root on the Cipi server:

```bash
# /etc/cron.d/shop-uploads
15 * * * * root rsync -aH --partial -e "ssh -i /root/.ssh/uploads_backup" \
  /home/shop/shared/storage/app/uploads/ backup@203.0.113.30:shop/uploads/ >> /var/log/shop-uploads-rsync.log 2>&1
```

Leave `--delete` out unless the target keeps snapshots: without it, a file deleted by mistake on the server survives on the backup host. With `rclone`, turn on versioning on the bucket and use `rclone sync … --backup-dir` for the same reason.

> [!info] Whatever you choose, test it: download one file from the copy and open it. A copy that has stopped working looks exactly like one that works until the day you need it.

## 8. Restore, knowing what is missing {#restore}

```bash
$ sudo cipi backup list --profile=nightly
$ sudo cipi backup fetch nightly 2026-11-24_020000 --dest=/root/restore
$ jq .excluded_paths /root/restore/apps/shop/meta.json
[
  "storage/app/uploads",
  "storage/framework/cache",
  "storage/logs",
  "*.mp4"
]
$ sudo cipi db restore shop /root/restore/databases/mariadb/shop.sql.gz
$ tar -xzf /root/restore/apps/shop/files.tar.gz -C /tmp/restore-files
```

Then bring the excluded folders back from where you keep them (`rsync` from the backup host, `rclone copy` from the bucket) and fix ownership with `sudo cipi app fix-permissions shop`. Caches and logs need nothing: they are written again as the app runs.

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| *Invalid --exclude-paths entry* | An absolute path, a character outside the allowed set, or a pattern that would leave the whole app out. Write it relative to the app |
| Nothing is left out | The pattern doesn't match a name in the archive. Check case and spelling, then `--dry-run` |
| Too much is left out | A short name (`cache`, `tmp`) matched folders you wanted. Use the full path |
| I added a pattern and lost the others | `--exclude-paths` replaces the list: pass all of them |
| `cipi.yml` plan refuses `shop:…` | The prefix is CLI-only; in `cipi.yml` write the bare pattern |
| `cipi yml plan` says the profile name is invalid | It must be the app's name or start with it: `shop`, `shop-nightly` |
| Archives are still big | Check the database side too: `--exclude-tables` for logs, jobs and Telescope tables |
