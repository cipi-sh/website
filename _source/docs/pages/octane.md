@section cli-app-octane

Laravel Octane keeps your app booted in memory and serves requests with FrankenPHP. Typical result: much lower response times for the same hardware. Octane and PHP-FPM apps run side by side on one server.

<cipi-term name="octane"></cipi-term>

## Create or convert {#octane-use}

Your repository needs `laravel/octane`, installed with `php artisan octane:install --server=frankenphp`. Octane starts after the first deploy.

```bash
$ cipi app create --user=myapp --domain=myapp.com \
    --repository=git@github.com:you/myapp.git --octane
$ cipi app convert myapp --to=octane     # an existing FPM app
$ cipi app convert myapp --to=fpm        # and back
$ cipi app limits myapp --octane-workers=4
```

## What Cipi sets up {#octane-setup}

```flow
Nginx | static files, proxy to Octane
> Nginx terminates HTTPS and serves files in `public/` directly (CSS, JS, images). Everything else goes to Octane.
Octane on 127.0.0.1 | port 8100–8999
> Octane listens on `127.0.0.1` on a port Cipi picks between 8100 and 8999. It's never reachable from the internet directly.
FrankenPHP build | pinned per app
> Each Octane app uses its own FrankenPHP binary, pinned so a deploy never changes the PHP version by surprise.
Supervisor | keeps it running, reloads on deploy
> Supervisor keeps Octane running, restarts it if it crashes, and reloads it on every deploy.
```

| Piece | Setting |
| --- | --- |
| Nginx | `proxy_pass` to the app's local port; static files from `current/public`; no PHP-FPM pool |
| Process | Supervisor program `myapp-octane`, next to the queue workers |
| Deploys | The pinned FrankenPHP binary is linked into each release, then Octane reloads |
| `.env` | `OCTANE_SERVER=frankenphp`, `OCTANE_HTTPS=true` |

Converting rewrites the vhost, process, deploy recipe and `.env`, and keeps the certificate. It turns [JIT](/docs/php-jit) off; enable it again if you use it.

## FrankenPHP builds, pinned per app {#cli-frankenphp}

The PHP an Octane app runs is the one compiled into its FrankenPHP binary. Cipi keeps those binaries in `/opt/cipi-frankenphp/builds/` (read-only to apps) and **pins one per app**. A deploy never downloads a new binary, so PHP changes only when you decide.

```bash
$ cipi frankenphp                      # each app's build and PHP, patched or not
$ cipi frankenphp upgrade myapp        # newest build on the same PHP minor
$ cipi frankenphp upgrade --all
$ cipi frankenphp use myapp            # pin a specific build
$ cipi frankenphp import ./frankenphp  # a build you compiled (other PHP minor)
$ cipi frankenphp adopt myapp          # pin the binary Octane downloaded
$ cipi frankenphp prune                # remove unused builds
```

| Rule | Why it keeps you stable |
| --- | --- |
| Upgrades stay on the app's PHP minor and FrankenPHP major | No surprise PHP 8.5 → 8.6 jump |
| Octane must answer after an upgrade, or the previous build returns | A bad build never stays live |
| A deploy that needs a newer FrankenPHP stops before migrations | The live release is untouched; run `cipi frankenphp upgrade` |
| Apps on different PHP minors use different builds | 8.5 and 8.6 coexist |
| Nightly patches via `cipi autoupdate` (component `frankenphp`) | Security fixes without manual work |

To move an app to a new PHP minor: `cipi app edit myapp --php=8.6`, then `cipi frankenphp upgrade myapp`.

> [!tip] Octane serves HTTP only. Run long jobs on [queue workers or Horizon](/docs/workers) and WebSockets on [Reverb](/docs/reverb).

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| 502 after converting | Octane not running: `cipi worker list myapp`, logs with `--type=worker` |
| Users see others' data | A state leak in long-lived objects: see the [Octane guide](/guides/laravel-octane-frankenphp#state) |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Can I go back to PHP-FPM? | Yes: `cipi app convert myapp --to=fpm`. |
| How many workers? | Start with one per CPU core: `cipi app limits myapp --octane-workers=4`. |
