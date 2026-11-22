@section cipi-sync

Move, copy or replicate whole apps between Cipi servers: configuration, deploy keys, workers, crontab, and optionally database and storage. Archives are **encrypted with AES-256** and a passphrase, so credentials are safe at rest and in transit. Migrating providers becomes one command.

<cipi-term name="sync"></cipi-term>

```flow
Export | encrypted archive
Transfer | rsync over SSH
Import | apps created or updated
DNS + SSL | switch when ready
```

## Commands {#commands}

| Command | Does |
| --- | --- |
| `cipi sync export [apps] [--with-db] [--with-storage]` | Write an encrypted archive |
| `cipi sync import <archive> [apps] [--update] [--deploy]` | Create (or update) apps from it |
| `cipi sync push [apps] --host=IP [--with-db] [--with-storage] [--import]` | Export + transfer + import in one go |
| `cipi sync list <archive>` | Inspect an archive without importing |
| `cipi sync pubkey` / `cipi sync trust` | Key-based trust between two servers |

Add `--passphrase="$(cat /etc/cipi/.sync_passphrase)"` for scripts (store it with `chmod 400`).

## What travels {#contents}

| Item | Included |
| --- | --- |
| `.env`, `auth.json`, `deploy.php` | Always |
| Deploy key, SSH config, known hosts | Always: the same key keeps working on GitHub |
| Workers, crontab, PHP version, limits, cipi.yml auto-apply | Always |
| Database dump | `--with-db` |
| `shared/storage` | `--with-storage` |
| Certificates | Never: run `cipi ssl install` after the DNS switch |

## Import: new vs existing apps {#import}

| | New app | Existing app (`--update`) |
| --- | --- | --- |
| User, directories, vhost, pool, workers | Created | Regenerated |
| Database credentials | **New** random password, written to `.env` | Target keeps its own |
| Rest of `.env` (`APP_KEY`, mail…) | From the archive | From the archive |
| Database data | Imported | Tables replaced |
| PHP version | As source (must be installed) | Migrated if it changed |

Pre-flight checks block an import that would clash with an existing app or domain. New passwords are printed once at the end.

## Recipes {#recipes}

**Migrate a whole server** (e.g. AWS → Hetzner):

```bash
# on the new server: cipi sync trust (paste the key from: cipi sync pubkey on the old one)
$ cipi sync push --host=NEW_IP --with-db --with-storage --import
# on the new server, after pointing DNS:
$ cipi ssl install shop && cipi ssl install blog
```

**Warm standby every 6 hours** (data-loss window = interval):

```bash
0 */6 * * * /usr/local/bin/cipi sync push --host=STANDBY_IP --with-db --with-storage --import --passphrase="$(cat /etc/cipi/.sync_passphrase)" >> /var/log/cipi/sync.log 2>&1
```

If the primary fails: point DNS at the standby, `cipi ssl install` each app, done.

**Portable nightly archive:**

```bash
0 3 * * * /usr/local/bin/cipi sync export --with-db --with-storage --output=/root/backups/cipi-$(date +\%F).tar.gz.enc --passphrase="$(cat /etc/cipi/.sync_passphrase)"
```

> [!note] Database sync is a full replace and storage a full extract (files deleted on the source remain on the target). Node apps are not synced yet. For point-in-time history use [Backups](/docs/backups).
