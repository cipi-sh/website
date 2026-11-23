@section cli-disk

The [monitor](/docs/monitor) tells you the disk is filling up; `cipi disk` tells you **who** is filling it.

## Commands {#commands}

```bash
$ cipi disk              # filesystems, then every app, largest first
$ cipi disk db           # every database of every engine
$ cipi disk --json       # for scripts (also: cipi disk db --json)
```

## Reading the report {#report}

```text
 Server disk
 MOUNT  SIZE       USED      FREE      USE
 /      100.00 GB  40.00 GB  60.00 GB  40%

 Apps (3) — % of the 100.00 GB on /
 APP    FILES    DATABASE  TOTAL    DISK  LIMIT
 shop   2.00 GB  1.00 GB   3.00 GB  3.0%  10 GB (30%)
 blog   0.50 GB  120.4 MB  0.62 GB  0.6%  —
 All apps                  3.62 GB  3.6%
 Everything else          36.38 GB 36.4%
```

| Column | Measures |
| --- | --- |
| FILES | The app's home: releases, storage, logs |
| DATABASE | Its database (and the one `.env` points to, if different) |
| TOTAL / DISK | Files + database, and its share of the disk |
| LIMIT | The [soft disk limit](/docs/limits#disk) and how much is used |
| Everything else | System, packages, local backups, databases that belong to no app |

`cipi disk db` lists MariaDB and PostgreSQL databases, Valkey key counts and memory, and Meilisearch indexes with document counts, each engine with its total on disk. From your laptop: `cipi-cli disk`; in the panel: Server → Disk.

> [!note] Limits are soft by design: they alert, they never take a site down. Hard quotas couldn't cover the database and would break the app at the worst moment.

## Free up space {#free}

| Usually | Do |
| --- | --- |
| Old releases | Keep fewer: `cipi app deploy-config myapp --keep-releases=3` |
| Local backups | Send them off-site and lower `--keep` ([backups](/docs/backups)) |
| Logs | Rotated automatically ([log retention](/docs/log-retention)); check `storage/logs` for apps writing huge logs |
| Databases | `cipi disk db`: prune old rows (Telescope, activity logs) |
