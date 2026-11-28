@section gui-update

## Update {#update}

The panel is the `cipi/gui` Composer package, so updating is Composer plus migrations.

| Command | What it does | When |
| --- | --- | --- |
| `sudo cipi gui update` | `composer update cipi/gui`, migrations, theme refresh | Routine updates |
| `sudo cipi gui upgrade` | Rebuilds the app code from scratch | Major releases, or a drifted install |
| `sudo cipi gui refresh-theme` | Recompiles the theme only | After a theme tweak |

> [!tip] Keep the panel and each server's API current together (`sudo cipi gui update`, `sudo cipi api update`) so forms and lists match what servers offer.

@section gui-operations

## Operations {#operations}

| Command | What it does |
| --- | --- |
| `sudo cipi gui status` | Installed or not, domain, health of its services |
| `sudo cipi gui fix-permissions` | Repairs the FPM `open_basedir` and runtime permissions; run it on permission or autoload errors after an update |
| `sudo cipi gui reset-user` | Rewrites an admin's e-mail, name and password and clears their 2FA (alias `reset-password`); with [2FA required](/docs/gui-install#two-factor-required) they set it up again at the next sign-in. For other accounts, *Reset 2FA* in Team does it from the panel |

Locked out by [SSO-only](/docs/gui-sso)? `sudo cipi gui sso only off` brings password sign-in back first.

@section gui-remove

## Remove {#remove}

```bash
$ sudo cipi gui remove      # alias: uninstall
$ sudo cipi gui remove --force  # no confirmation
```

Removes the vhost, FPM pool, scheduler, app, config and the panel's certificate (one still used by an app is kept). Servers and apps are untouched: the panel is only an API client. A panel on the Cloudflare tunnel must come off it first (`sudo cipi zt hostname remove --gui`). The API on each server stays; remove it with [`sudo cipi api remove`](/docs/api) if nothing else uses it.
