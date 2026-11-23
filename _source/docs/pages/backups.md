@section cli-backup

Backups that run on their own, go where you want, are encrypted before they leave the server, and tell you when they stop. Built on **profiles**: each one answers *what*, *how often*, *where* and *how long*.

<cipi-term name="backup"></cipi-term>

```flow
Profile runs | on its schedule
> Each backup profile has its own schedule (`--every=30m`, `--cron='0 2 * * *'`…). When it's due, the run starts on its own.
Dump + archive | per database, per app
> Each database is dumped and each app's files are archived separately, so you can restore one app without touching the others.
Integrity check | before upload
> Every archive is opened and checked before upload. A broken archive is reported, not shipped as if it were fine.
Encrypt | AES-256, on the server
> With `--encrypt`, archives are encrypted with AES-256 on the server before leaving it. The bucket only ever sees encrypted files. Keep the key from `cipi backup key show`.
Upload | local, S3, other buckets
> The archive goes to each destination of the profile: the server's disk, an S3 bucket, or several buckets.
Prune & watch | retention, staleness alert
> Old runs beyond `--keep`/`--keep-days` are deleted. If a profile stops producing backups, you get a staleness alert.
```

## 1. Destinations {#destinations}

```bash
$ cipi backup configure          # the default bucket ("s3"); leave empty for local-only
$ cipi backup destination add offsite --bucket=acme-backups --key=AKIA… --secret=… \
    --region=eu-central-1 --endpoint=https://eu-central-1.your-objectstorage.com
$ cipi backup destination test   # reach every bucket with its own credentials
$ cipi backup status [--json]    # destinations, profiles, last run, overdue, uncovered
```

| Provider | Endpoint |
| --- | --- |
| AWS S3 | leave empty |
| Cloudflare R2 | `https://<account-id>.r2.cloudflarestorage.com` |
| Hetzner Object Storage | `https://<location>.your-objectstorage.com` |
| DigitalOcean Spaces | `https://<region>.digitaloceanspaces.com` |
| Backblaze B2 | `https://s3.<region>.backblazeb2.com` |
| Scaleway | `https://s3.<region>.scw.cloud` |
| MinIO | `https://your-minio-host` |

`local` (`/var/backups/cipi`) is always available. A profile can send each run to several destinations at once.

## 2. Profiles {#profiles}

```bash
# every 30 minutes: databases only, on the server, last 48 runs
$ cipi backup profile add hourly-db --scope=db --databases='shop,tenant_*' \
    --exclude-tables='*.jobs,*.telescope_*' --every=30m --keep=48 --dest=local
# every night: files + databases, encrypted, two buckets, 14 days
$ cipi backup profile add nightly --scope=all --cron='0 2 * * *' --keep-days=14 \
    --dest=s3,offsite --encrypt
```

| Flag | Meaning |
| --- | --- |
| `--scope=all\|files\|db` | What to take |
| `--apps`, `--databases`, `--exclude-databases` | Glob patterns; tenant databases created at runtime are found too |
| `--exclude-tables` | Skip noisy tables (`*.jobs`, `*.telescope_*`) |
| `--every=30m\|6h\|1d` or `--cron='…'` | Schedule |
| `--dest=local,s3,<name>` | Where to send it |
| `--keep=N`, `--keep-days=N`, `--keep-weeks=N` | Retention |
| `--encrypt` | AES-256 before upload |

```bash
$ cipi backup profile list | show nightly | edit nightly --keep-days=30
$ cipi backup profile disable hourly-db | enable hourly-db
$ cipi backup profile remove hourly-db [--purge]   # --purge also deletes its runs
```

Apps can declare their own profiles in [cipi.yml](/docs/yml) (named `<app>` or `<app>-*`); server-wide profiles stay yours.

## 3. Encryption {#encryption}

The bucket provider never sees readable data. The manifest stays readable so runs can be listed.

```bash
$ cipi backup key show       # store it off-server, now
$ cipi backup key rotate     # new key for future runs
```

> [!warning] Without the key, an encrypted backup cannot be restored by anyone. Runs taken before a rotation still need the old key.

## 4. Run, verify, restore {#restore}

```bash
$ cipi backup run [--profile=nightly] [--dry-run] [--detach]
$ cipi backup list [--profile=nightly]
$ cipi backup verify [--deep]               # does the newest run open?
$ cipi backup fetch nightly 2026-11-02_020000 --dest=/root/restore
$ cipi db restore myapp /root/restore/databases/mariadb/myapp.sql.gz
$ tar -xzf /root/restore/apps/myapp/files.tar.gz -C /tmp/restore-files
```

| Honesty check | Effect |
| --- | --- |
| Archive integrity tested before upload | A dump cut short by a full disk never replaces a good backup |
| Staleness watchdog (hourly) | `backup_stale` when a profile hasn't succeeded in twice its interval |
| Empty fetch / nothing to verify | Reported as an error, never as success |
| Prune errors | Logged and alerted, never swallowed |

## Layout {#layout}

```tree
<destination>/cipi/<profile>/<YYYY-MM-DD_HHMMSS>/
├── manifest.json
├── apps/myapp/files.tar.gz        # + meta.json
└── databases/mariadb/myapp.sql.gz
```

Files and databases are stored separately, so a database restores without unpacking an app. Staging uses `/var/tmp` (disk), not a small RAM-backed `/tmp`. Meilisearch indexes are not backed up: `scout:import` rebuilds them from the database.
