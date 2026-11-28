@section cli-app-octane

Laravel Octane keeps your app booted in memory and serves requests with FrankenPHP. Typical result: much lower response times for the same hardware. Octane and PHP-FPM apps run side by side on one server.

<cipi-term name="octane"></cipi-term>

## Create or convert {#octane-use}

Your repository needs `laravel/octane`, installed with `php artisan octane:install --server=frankenphp`. Octane starts after the first deploy.

```bash
$ sudo cipi app create --user=myapp --domain=myapp.com \
    --repository=git@github.com:you/myapp.git --octane
$ sudo cipi app convert myapp --to=octane  # an existing FPM app
$ sudo cipi app convert myapp --to=fpm   # and back
$ sudo cipi app limits myapp --octane-workers=4
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
$ sudo cipi frankenphp                 # each app's build and PHP, patched or not
$ sudo cipi frankenphp upgrade myapp   # newest build on the same PHP minor
$ sudo cipi frankenphp upgrade --all
$ sudo cipi frankenphp php myapp 8.6   # another PHP version: Octane and the rest together
$ sudo cipi frankenphp restart myapp   # restart Octane on its build, checked
$ sudo cipi frankenphp use myapp       # pin a specific build
$ sudo cipi frankenphp fetch [version]  # download a release into the builds (the latest by default)
$ sudo cipi frankenphp import ./frankenphp  # a build you compiled (other PHP minor)
$ sudo cipi frankenphp adopt myapp     # pin the binary Octane downloaded
$ sudo cipi frankenphp prune           # remove unused builds
```

| Rule | Why it keeps you stable |
| --- | --- |
| Upgrades stay on the app's PHP minor and FrankenPHP major | No surprise PHP 8.5 → 8.6 jump |
| Octane must answer after an upgrade, or the previous build returns | A bad build never stays live |
| A deploy that needs a newer FrankenPHP stops before migrations | The live release is untouched; run `sudo cipi frankenphp upgrade` |
| Apps on different PHP minors use different builds | 8.5 and 8.6 coexist |
| Nightly patches via `sudo cipi autoupdate` (component `frankenphp`) | Security fixes without manual work |

## One app, two PHP: switch by version {#octane-php}

An Octane app runs **two PHP**. The one built into its FrankenPHP binary answers the requests; the server's `php8.5` runs everything else — `composer install` at a deploy, `artisan`, the scheduler, the queue workers. They should be the same version, and they drift when a FrankenPHP release carries a newer PHP than the app was created with. `sudo cipi pending` and `sudo cipi php` then say so:

```text
gameportal is on PHP 8.5, but Octane answers requests on PHP 8.6.0 (FrankenPHP build 1.14.0-php8.6.0-…),
while Composer, artisan, cron and the workers run PHP 8.5
  → cipi frankenphp php gameportal 8.5
```

You say **which PHP**, by its number, as for any other app — not "upgrade" and see what arrives:

```bash
$ sudo cipi frankenphp php myapp       # what answers requests, what runs the rest
$ sudo cipi frankenphp php myapp 8.5   # both on PHP 8.5
$ sudo cipi frankenphp php myapp 8.6   # or both on 8.6
$ sudo cipi app edit myapp --php=8.6   # the same thing, from the app's side
$ sudo cipi frankenphp restart myapp   # restart Octane on its build, and check it
```

```flow
Find the build | PHP 8.5 inside
> The newest FrankenPHP build on the server that carries that PHP. When there is none, the latest release is fetched from FrankenPHP's releases and checked against its digest.
Start Octane on it | must answer
> Octane restarts on the new build and has to answer on its port.
Did not answer | previous build back
> When it doesn't, the previous build comes back and nothing else has changed.
Move the rest | Composer, artisan, cron, workers
> Then the server's PHP of the app moves: the CLI, the crontab, the workers, `composer install` at the next deploy.
```

| | |
| --- | --- |
| **The PHP must be installed** | `sudo cipi php install 8.6` first: Composer, artisan and the workers need the server's `php8.6` |
| **A release carries one PHP** | FrankenPHP publishes one binary per release, with one PHP inside. When no release carries the version you ask for, Cipi says which exist, and how to [import a build](#cli-frankenphp) of your own |
| **`upgrade` never changes version** | `sudo cipi frankenphp upgrade` stays on the app's PHP minor: it is for security fixes of that PHP. Another version is `sudo cipi frankenphp php` |
| **Isolated per app** | Each Octane app has its own pinned build: moving one never touches another, and apps on 8.5 and 8.6 run side by side |

### From the panel {#octane-panel}

An Octane app has an **Octane** tab in the [web panel](/docs/gui-overview): the PHP that answers the requests next to the PHP that runs the rest, a warning when they are two versions with a button that puts them on one, **Switch PHP** among the versions installed on the server, **Restart Octane** and **Update the build**. It takes *Edit* on the app. The same through the [API](/docs/api#endpoints-octane) (`GET /api/apps/{name}/octane`, `PUT …/octane/php`, `POST …/octane/restart`), the [PHP SDK](/docs/php-sdk) (`$cipi->octane()->php('myapp', '8.6')`) and [cipi-cli](/docs/cli-client) (`cipi-cli octane php myapp 8.6`).

> [!tip] Octane serves HTTP only. Run long jobs on [queue workers or Horizon](/docs/workers) and WebSockets on [Reverb](/docs/reverb).

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| *Octane answers on PHP 8.6, the app is on 8.5* | Two PHP in one app: `sudo cipi frankenphp php myapp 8.5` (or `8.6`) — [switch by version](#octane-php) |
| 502 after converting | Octane not running: `sudo cipi worker list myapp`, logs with `--type=worker` |
| Users see others' data | A state leak in long-lived objects: see the [Octane guide](/guides/laravel-octane-frankenphp#state) |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Can I go back to PHP-FPM? | Yes: `sudo cipi app convert myapp --to=fpm`. |
| How do I change PHP version? | `sudo cipi frankenphp php myapp 8.6` — or `sudo cipi app edit myapp --php=8.6`, or the app's Octane tab in the panel. Octane and the server's PHP move together. |
| Octane and the page cache together? | Yes: [`sudo cipi cache myapp on`](/docs/page-cache) puts Nginx's cache in front of Octane for the pages that can be kept. |
| How many workers? | Start with one per CPU core: `sudo cipi app limits myapp --octane-workers=4`. |
