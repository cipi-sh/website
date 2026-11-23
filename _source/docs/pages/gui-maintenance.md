@section gui-update

## Update {#update}

The panel is the `cipi/gui` Composer package, so updating is Composer plus migrations.

| Command | What it does | When |
| --- | --- | --- |
| `cipi gui update` | `composer update cipi/gui`, migrations, theme refresh | Routine updates |
| `cipi gui upgrade` | Rebuilds the app code from scratch | Major releases, or a drifted install |
| `cipi gui refresh-theme` | Recompiles the theme only | After a theme tweak |

> [!tip] Keep the panel and each server's API current together (`cipi gui update`, `cipi api update`) so forms and lists match what servers offer.

@section gui-operations

## Operations {#operations}

| Command | What it does |
| --- | --- |
| `cipi gui status` | Installed or not, domain, health of its services |
| `cipi gui fix-permissions` | Repairs the FPM `open_basedir` and runtime permissions; run it on permission or autoload errors after an update |
| `cipi gui reset-user` | Rewrites an admin's e-mail, name and password and clears their 2FA (alias `reset-password`) |

Locked out by [SSO-only](/docs/gui-sso)? `cipi gui sso only off` brings password sign-in back first.

@section gui-remove

## Remove {#remove}

```bash
$ cipi gui remove           # alias: uninstall
$ cipi gui remove --force   # no confirmation
```

Removes the vhost, FPM pool, scheduler, app, config and the panel's certificate (one still used by an app is kept). Servers and apps are untouched: the panel is only an API client. A panel on the Cloudflare tunnel must come off it first (`cipi zt hostname remove --gui`). The API on each server stays; remove it with [`cipi api remove`](/docs/api) if nothing else uses it.
