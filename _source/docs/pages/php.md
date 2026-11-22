@section cli-php

Run several PHP versions side by side, give each app its own, and keep all of them patched. Cipi installs from packages.sury.org (fastest with security releases), then the ondrej PPA, then Ubuntu.

<cipi-term name="php"></cipi-term>

## Versions {#versions}

```bash
$ cipi php list                # versions, patch level, security state, default
$ cipi php install 8.4         # add a version (8.3–8.6)
$ cipi php switch 8.6          # server default (CLI, panel pools)
$ cipi php remove 8.1          # refused while it's the default or an app uses it
$ cipi app edit myapp --php=8.6  # move one app, zero downtime
```

| Version | Status on Cipi |
| --- | --- |
| 8.6 | Default on new servers once the repository has every extension Cipi needs |
| 8.3, 8.4, 8.5 | Installable and assignable |
| 7.4–8.2 (old servers) | Listed, restartable, removable; never offered to an app |

Each app's deploys, Composer, cron and workers always use **the app's** PHP, never the server default.

@section php-86

## A new PHP minor {#php-86}

When a new minor comes out, the extension packages (`redis`, `memcached`, `imagick`) follow a few days later. Cipi handles the gap:

| Situation | Cipi |
| --- | --- |
| PHP packaged, some extensions not yet | Installs it, records what's missing, adds each extension as soon as it's published (nightly) |
| Only a release candidate available | Installs it and labels it **prerelease** |
| Assigning a version still missing extensions | Refused with the list of what's missing; `--force` if the app doesn't use them |
| A lock file that rejects the new PHP | The deploy fails and the live release stays: update the dependency, commit, deploy |

## Security patches {#security}

PHP is excluded from Ubuntu's unattended upgrades: Cipi patches it itself **every night at 03:30**, restarts only the affected PHP-FPM services and reports the result.

```bash
$ cipi php upgrade      # patch now and print the patch level
```

| State | Meaning |
| --- | --- |
| `patched` | At or past the latest security release Cipi knows |
| `VULNERABLE` | A fix exists but isn't installed yet (exit code 1; the nightly job alerts until fixed) |
| `distro` | Ubuntu build: fixes backported without a version bump |
| `END OF LIFE` | No more fixes from PHP: move apps off it |
| `prerelease` | Release candidate, not compared |

[Octane](/docs/octane) apps run the PHP inside their FrankenPHP binary, which apt never touches; `cipi php upgrade` lists them too and `cipi frankenphp upgrade` fixes them.

## Hardening {#hardening}

Every pool Cipi writes (apps, webhook receivers, panel) locks down settings that recent PHP advisories used as attack paths, and Octane apps load the same rules:

```ini
php_admin_flag[session.upload_progress.enabled] = off
php_admin_flag[fatal_error_backtraces] = off
```

They are set as admin flags, so neither `.user.ini` nor `ini_set()` can turn them back on. Vhosts never enable `fastcgi_keep_conn`. Real-world walkthrough: [How Cipi handles PHP and nginx CVEs](/guides/php-nginx-cve-patching).

@section cli-ini

## php.ini settings: `cipi ini` {#ini}

Change PHP settings without hunting for the right file. Server-wide changes reach **PHP-FPM and CLI**, so web requests, workers, Artisan and cron agree.

```bash
$ cipi ini list [--app=shop]                  # effective values and where each comes from
$ cipi ini set upload_max_filesize=50M        # server-wide
$ cipi ini set memory_limit=512M --app=shop   # one app only (wins)
$ cipi ini unset memory_limit --app=shop
$ cipi ini reset [--app=shop]
$ cipi ini keys                               # what can and can't be set
```

| Behaviour | Why |
| --- | --- |
| Raising `upload_max_filesize` raises `post_max_size`/`memory_limit` if they'd cap it | One command, a working upload limit |
| Nginx `client_max_body_size` flagged when it would cap it | No mystery 413 errors |
| `open_basedir`, `auto_prepend_file`, `extension`… refused | They are part of app isolation |
| Every change fires the `ini_set` notification | Nothing changes on a shared server without a trace |

Per-app settings can also live in [cipi.yml](/docs/yml) as `app.ini`.
