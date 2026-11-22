@section cli-app-artisan

Run commands as the app user, with the app's PHP version and restrictions, exactly as a deploy would. No need to switch users.

```bash
$ cipi app artisan myapp migrate:status
$ cipi app artisan myapp queue:retry all
$ cipi app artisan myapp cache:clear
$ cipi app tinker myapp
```

@section cli-app-run

## Other commands: `cipi app run` {#run}

A safe, non-interactive runner used by the CLI, the API and the panel's "App commands".

```bash
$ cipi app run myapp composer install --no-dev
$ cipi app run myapp npm ci
$ cipi app run myapp ls -la shared
$ cipi app run --commands          # what is allowed
```

| Allowed | Blocked |
| --- | --- |
| `composer`, `npm`, `npx`, `yarn`, `pnpm`, `php`, `node`, `git`, `ls`, `cat`, `head`, `tail`, `find`, archive and file tools | Shells, editors, pagers, REPLs (`bash`, `vim`, `less`, `tinker`), and interactive flags (`tail -f`, `php -a`) |

REST: `POST /api/apps/{name}/run` (ability `apps-run`). MCP: `AppRun`.

@section cli-app-logs

## Logs {#logs}

```bash
$ cipi app logs myapp                  # everything
$ cipi app logs myapp --type=laravel   # storage/logs/laravel.log
$ cipi app logs myapp --type=nginx     # access and errors
$ cipi app logs myapp --type=php       # PHP-FPM errors
$ cipi app logs myapp --type=worker    # queue workers
$ cipi app logs myapp --type=deploy    # every deploy, timestamped
```

Laravel writes a single `laravel.log` (`LOG_CHANNEL=single`); logrotate rotates it daily, compresses it and keeps a year, like every other app log. See [Log retention](/docs/log-retention).
