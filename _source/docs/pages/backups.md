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
Upload | local, S3, SFTP
> The archive goes to each destination of the profile: the server's disk, an S3 bucket, an SFTP server (a VPS, a Hetzner Storage Box), or several of them.
Prune & watch | retention, staleness alert
> Old runs beyond `--keep`/`--keep-days` are deleted. If a profile stops producing backups, you get a staleness alert.
```

## 1. Set up: where backups go {#setup}

`cipi backup configure` asks first where the archives go, then makes the nightly profile — every app, every database — that sends them there:

```bash
$ cipi backup configure
  Where do the backups go?
    1) local      This server only — a folder here; lost if the server is lost
    2) s3         An S3 bucket — AWS, Hetzner, Cloudflare R2, DigitalOcean, Backblaze, Scaleway, MinIO…
    3) sftp       An SFTP server — a VPS with a backup user, a Hetzner Storage Box, a NAS
```

| Choice | What it sets up | In profiles |
| --- | --- | --- |
| **An S3 bucket** | The default bucket: name, access key, secret key (not shown as you type), region, endpoint. The bucket is **reached with the keys before anything is saved** — a wrong key changes nothing | `s3` |
| **An SFTP server** | A destination with a key Cipi makes for it, printed with how to install it on the remote — then tested, if you say so. [Details below](#sftp) | `sftp` |
| **This server only** | A folder here (`/var/backups/cipi`). Such a copy is lost with the server: add a bucket or an SFTP server later | `local` |

The same without questions, for a script — and what [the panel](#panel) runs:

```bash
$ printf '%s\n' "$SECRET" | cipi backup configure --type=s3 --bucket=acme-backups --key=AKIA… \
    --secret-stdin --endpoint=https://fsn1.your-objectstorage.com [--region=fsn1]
$ cipi backup configure --type=sftp --host=u123456.your-storagebox.de --port=23 --user=u123456 --path=cipi [--name=sftp]
$ cipi backup configure --type=local          # or --local-only
```

Run it again to change it: what is not given keeps its value (`--region=` alone changes the region; `--endpoint=none` goes back to AWS). An existing profile is never changed by it: add the new destination to its `--dest`. `--json` answers `{configured, type, destination}` — for an SFTP server with the public key to install. `--local-dir=` and `--tmpdir=` move the local folder and the folder archives are built in, at the server's shell only.

## 2. Destinations {#destinations}

`local` and `s3` (the default bucket) are always there; more destinations get a name of their own — another S3 bucket, or an SFTP server. A profile can send each run to several at once.

```bash
$ cipi backup destination add offsite --bucket=acme-offsite --key=AKIA… --secret-stdin \
    --region=auto --endpoint=https://<account-id>.r2.cloudflarestorage.com < secret.txt
$ cipi backup destination add box --type=sftp --host=… --user=… --port=23   # an SFTP server — below
$ cipi backup destination list                    # every destination, and the profiles that use it
$ cipi backup destination show offsite            # its settings — never a secret
$ cipi backup destination edit offsite --region=eu-west-1   # only what is given changes
$ cipi backup destination test [offsite]          # reach each one with its own credentials
$ cipi backup destination remove offsite          # no profile may use it; the archives stay there
$ cipi backup status [--json]                     # destinations, profiles, last run, overdue, uncovered
```

| Provider | Endpoint | Region |
| --- | --- | --- |
| AWS S3 | leave empty | the bucket's (`eu-central-1`…) |
| Hetzner Object Storage | `https://<location>.your-objectstorage.com` | `fsn1`, `nbg1`, `hel1` |
| Cloudflare R2 | `https://<account-id>.r2.cloudflarestorage.com` | `auto` |
| DigitalOcean Spaces | `https://<region>.digitaloceanspaces.com` | the Space's (`fra1`…) |
| Backblaze B2 | `https://s3.<region>.backblazeb2.com` | `eu-central-003`… |
| Scaleway | `https://s3.<region>.scw.cloud` | `fr-par`, `nl-ams`, `pl-waw` |
| MinIO, Wasabi, others | `https://your-host` | as the service says |

**The secret key.** `--secret-stdin` reads it from the first line of standard input, so it is not in `ps`, the shell's history or a log; `--secret=` still works at the server's shell. A key or a secret is printable characters with no space and no quote — the default bucket's are written to `/root/.aws/credentials`. Give Cipi a key limited to its bucket. Every bucket is reached with its keys before it is saved.

**Notified.** Every change of where archives go — `configure`, a destination added, changed or removed, the encryption key rotated — sends the `backup_config` notification (Security), with who did it: the owner of the server hears of it, also when it comes from the panel.

### SFTP: a VPS, a Storage Box, a NAS {#sftp}

A server reached over SSH is a destination like a bucket: a cheap VPS with a user for backups, a [Hetzner Storage Box](https://www.hetzner.com/storage/storage-box/), a NAS at the office. Only SFTP is asked of it — no shell, no software of Cipi's.

```bash
$ cipi backup destination add box --type=sftp --host=u123456.your-storagebox.de \
    --user=u123456 --port=23 --path=cipi
$ ssh-copy-id -p 23 -s -i /etc/cipi/backup-keys/box.pub u123456@u123456.your-storagebox.de   # a Storage Box: its password, once
$ cipi backup destination test box
$ cipi backup profile edit nightly --dest=local,box
```

| | |
| --- | --- |
| **The key** | Cipi makes an SSH key (ed25519) for each SFTP destination, kept on the server in `/etc/cipi/backup-keys`, readable by root only. It signs in with it, never with a password: no password of the remote is stored, anywhere |
| **The remote accepts it** | A server of yours: append the public key to `~<user>/.ssh/authorized_keys` there. A Storage Box: `ssh-copy-id -p 23 -s …` as above, which asks the box's password once. `cipi backup destination key box` prints it again (`--raw` for the key alone) |
| **The host key** | Learned at the first connection and checked at every other one (`/etc/cipi/backup-keys/known_hosts`): a server that changes key afterwards is refused, not trusted |
| **`--path`** | The folder for the backups, created if missing — relative to the user's login folder, or absolute with a leading `/`. Empty: the login folder |
| **`--port`** | 22 by default; 23 for a Storage Box |
| **`--test`** | On `add` and `edit`: write a small file there and remove it, as `destination test` does |
| **`--new-key`** | On `edit`: a new key; install its public half on the remote again |
| **Remove** | `cipi backup destination remove box` deletes its key here; the archives stay on the remote, and the public key in its `authorized_keys` until you take it out |

Everything else is the same as for a bucket: retention prunes the old runs there, `backup list`, `fetch` and `verify` read them back, the archives are encrypted first with `--encrypt`. Several servers can share a Storage Box: each one writes under `cipi/<profile>/` of its own `--path`, so give each its own folder (`--path=cipi/web1`).

> [!tip] On a Hetzner Storage Box, turn on **SSH support** in its settings (port 23), and give each server a sub-account of its own with its own folder: a compromised server then reaches only its own backups. On a VPS of yours, a user that can only use SFTP in its folder (`ForceCommand internal-sftp` with `ChrootDirectory`) does the same.

How to choose, and a step-by-step for a Storage Box: [Backups to a Hetzner Storage Box over SFTP](/guides/sftp-backups-hetzner-storage-box).

## 3. Profiles {#profiles}

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
| `--exclude-paths` | Leave folders or files out of the app archives (`storage/app/uploads`, `*.mp4`) — [below](#exclude-paths) |
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

### Leave big folders out {#exclude-paths}

A terabyte of uploads is better kept with `rsync` (or on object storage) than archived every night. A profile can leave paths out of the app archives:

```bash
$ cipi backup profile edit nightly --exclude-paths='storage/app/uploads,*.mp4'
$ cipi backup run --profile=nightly --dry-run    # what each app leaves out
$ cipi backup profile edit nightly --exclude-paths=    # everything again
```

| Rule | Detail |
| --- | --- |
| Relative to the app | `storage/app/uploads` leaves out `shared/storage/app/uploads`; `wp-content/uploads` a custom app's `htdocs/wp-content/uploads` |
| Patterns | tar wildcards, which also match across `/`: `*.mp4` is every video, `storage/app/*/cache` any such folder |
| Some apps only | `<apps>:<pattern>`, with an app name or a glob: `shop:…`, `api-*:…` |
| Refused | Absolute paths (they would match nothing) and the whole app (`*`, `shared`, `htdocs`) |
| Recorded | Each archive's `meta.json` lists `excluded_paths`, so a restore knows what comes back from elsewhere |

Also as `exclude_paths` in a profile of [cipi.yml](/docs/yml), in the [web panel](/docs/gui) and over the [API](/docs/api#endpoints-databases). Which folders to leave out, `cipi.yml` examples for Laravel and WordPress, and how to keep excluded folders safe: [Exclude files and folders from backups](/guides/exclude-files-from-backups).

## 4. Encryption {#encryption}

The bucket provider never sees readable data. The manifest stays readable so runs can be listed.

```bash
$ cipi backup key show       # store it off-server, now (logged and notified)
$ cipi backup key rotate     # new key for future runs; the old one is kept next to it
```

> [!warning] Without the key, an encrypted backup cannot be restored by anyone. Runs taken before a rotation still need the old key.

## 5. Run, verify, restore {#restore}

```bash
$ cipi backup run [--profile=nightly] [--dry-run] [--detach]
$ cipi backup list [--profile=nightly]
$ cipi backup verify [--deep]               # does the newest run open?
$ cipi backup prune [--profile=nightly] [--dry-run]   # apply the retention now
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

## From the panel {#panel}

Everything above but downloading a run is in the [web panel](/docs/gui), on a server's **Backups** tab, and over the [API](/docs/api#endpoints-databases), the [PHP SDK](/docs/php-sdk) and [cipi-cli](/docs/cli-client):

| | |
| --- | --- |
| **Set up** | A server without backups offers *Use an S3 bucket*, *Use an SFTP server* and *On this server only* — `cipi backup configure` with flags |
| **S3 buckets** | *Add an S3 bucket*: a provider fills in the endpoint and the region; *Test*, *Edit* (an empty key or secret keeps the one the server has), *Remove*. The default bucket is edited the same way |
| **SFTP servers** | *Add an SFTP server* (a Storage Box preset), its key shown with how to install it — [above](#sftp) |
| **Encryption key** | *Show the key* (asked first; logged and notified on the server), *Rotate* |
| **Retention** | *Preview the retention*, *Apply the retention* |
| **Profiles and runs** | The matrix of what each profile takes; create, edit, pause, run, verify |

**A secret key never rides a command line.** The panel sends it to the API once; the API writes it to the CLI's standard input (`--secret-stdin`) in a synchronous call — never in a job, never stored, never answered back — and the form clears it. From the panel the CLI refuses `--secret=`, and refuses to move the local or temp folder (root creates the local one and makes it 0700: a path from the panel could be any directory). `cipi backup fetch` is not in the panel's sudoers: a run is downloaded and decrypted at the server's shell.

> [!warning] A token with `backups-manage` can point backups at a bucket or a server of its choosing, and read the encryption key. Give it to whom you would give the backups; every such change is notified (`backup_config`).

## Layout {#layout}

```tree
<destination>/cipi/<profile>/<YYYY-MM-DD_HHMMSS>/
├── manifest.json
├── apps/myapp/files.tar.gz        # + meta.json (excluded_paths, if any)
└── databases/mariadb/myapp.sql.gz
```

Files and databases are stored separately, so a database restores without unpacking an app. Staging uses `/var/tmp` (disk), not a small RAM-backed `/tmp`. Meilisearch indexes are not backed up: `scout:import` rebuilds them from the database.

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| `destination test` fails | Wrong endpoint, region or key permissions on the bucket |
| SFTP: `Permission denied (publickey)` | The remote doesn't accept the key yet: `cipi backup destination key <name>` and add it there |
| SFTP: `Host key verification failed` | The remote's host key changed since the first connection. If you know why (a reinstalled server), remove its line from `/etc/cipi/backup-keys/known_hosts` |
| Profile overdue | `cipi backup status` names it; check disk space and the run log |
| Can't open an encrypted archive | You need the backup key from `cipi backup key show` (store it off-server) |
| Archives too big, runs too slow | Leave large uploads or media out with [`--exclude-paths`](#exclude-paths) and sync them with `rsync` |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Where should backups go? | Off-site: another provider or region — an S3-compatible bucket, or an [SFTP server](#sftp) such as a Storage Box. Your own: [Johnny](/guides/johnny-s3-storage). |
| Can the panel add a destination? | An SFTP one, yes — the **Backups** tab makes the key and shows the public half to install. An S3 bucket is added here, on the server: it takes a secret key, which doesn't go through the panel. |
| How often? | Databases every 30–60 minutes for busy apps, everything nightly. [Backup guide](/guides/backup-vps-s3). |
| Have I tested a restore? | Do it now with `cipi backup fetch` into a scratch folder: a backup you haven't restored is a hope. |
