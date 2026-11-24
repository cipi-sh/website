@section cli-stack-upgrade

Security patches for the whole stack, without surprise restarts. Ubuntu's unattended upgrades would restart Nginx or a database whenever they run; Cipi takes those packages over and patches them at a quiet hour, one at a time, checking each one.

| Component | Patched by | When |
| --- | --- | --- |
| Ubuntu (kernel, libraries…) | unattended-upgrades | Daily |
| PHP | [cipi php upgrade](/docs/php#security) | Daily, 03:30 |
| Nginx, MariaDB (or MySQL), PostgreSQL, Valkey, Node.js, Composer, FrankenPHP | `cipi autoupdate` | Nightly, 04:20 |
| Reboot for a new kernel | `cipi reboot auto` | Off unless you turn it on |

@section cli-autoupdate

## Nightly patches: `cipi autoupdate` {#autoupdate}

```bash
$ cipi autoupdate                    # what's on, how the last run went
$ cipi autoupdate off mariadb        # patch this one yourself
$ cipi autoupdate on
$ cipi autoupdate run [name]         # now
```

| Rule | Why |
| --- | --- |
| Patch releases only (`--only-upgrade`) | No major jumps overnight |
| Your config files are kept; `nginx -t` before reload | A patch never breaks the config |
| Node runtimes checked against SHA-256; Composer rolled back if it won't start | Verified binaries only |
| One at a time, databases last; skipped during a dump or deploy | No restart in the middle of your work |
| Octane builds stay on their PHP minor, health-checked, rolled back if silent | [FrankenPHP pinning](/docs/octane#cli-frankenphp) |
| Each upgrade notified; failures alert and show in `cipi pending` | You always know |

Log: `/var/log/cipi/autoupdate.log`.

## By hand {#manual}

```bash
$ cipi nginx upgrade [--yes]
$ cipi db upgrade [mariadb|pgsql] [--yes]     # mariadb: MySQL's packages where it runs
$ cipi service upgrade valkey [--yes]
$ cipi service upgrade                 # installed vs available
```

Package patterns are pinned (a loose match can't drag PHP in), vendor repositories are re-asserted if missing, and a lock prevents two upgrades from overlapping. These are not exposed to the panel: patching a database is an operator decision.

@section cli-pending

## What needs you: `cipi pending` {#pending}

A server can be fully patched and still run last month's kernel. `cipi pending` lists what an update can't do by itself, each with the command to run:

```bash
$ cipi pending [--json]
```

| Item | Example |
| --- | --- |
| Reboot required | New kernel installed, old one running |
| Below a security release | PHP, Nginx, Composer, Node.js |
| Old binary still running | Nginx upgraded on disk, workers not yet replaced |
| Updates waiting | A component with autoupdate off, or whose last run failed |
| Unmanaged code | PHP extensions built by hand or with PECL |
| App hygiene | Horizon installed but not running; apps on the shared Valkey |

Checked every morning; mailed when the list changes, and weekly while something stays on it. `cipi status` shows it too.

## Reboots {#reboot}

```bash
$ cipi reboot                         # needed? since when? which kernel?
$ cipi reboot now [--yes]
$ cipi reboot auto on --at=04:45      # only on nights one is required
```

Automatic reboots notify, warn two minutes ahead, and wait for the next night while a package install, dump, deploy or other `cipi` command is running.
