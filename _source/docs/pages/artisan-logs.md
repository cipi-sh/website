@section cli-app-artisan

Run commands as the app user, with the app's PHP version and restrictions, exactly as a deploy would. No need to switch users.

```bash
$ sudo cipi app artisan myapp migrate:status
$ sudo cipi app artisan myapp queue:retry all
$ sudo cipi app artisan myapp cache:clear
$ sudo cipi app tinker myapp
```

@section cli-app-run

## Other commands: `sudo cipi app run` {#run}

A safe, non-interactive runner used by the CLI, the API and the panel's "App commands".

```bash
$ sudo cipi app run myapp composer install --no-dev
$ sudo cipi app run myapp npm ci
$ sudo cipi app run myapp ls -la shared
$ sudo cipi app run --commands     # what is allowed
```

| Allowed | Blocked |
| --- | --- |
| `composer`, `npm`, `npx`, `yarn`, `pnpm`, `php`, `node`, `git`, `ls`, `cat`, `head`, `tail`, `find`, archive and file tools | Shells, editors, pagers, REPLs (`bash`, `vim`, `less`, `tinker`), and interactive flags (`tail -f`, `php -a`) |

REST: `POST /api/apps/{name}/run` (ability `apps-run`). MCP: `AppRun`.

@section cli-app-logs

## Logs {#logs}

```bash
$ sudo cipi app logs myapp             # everything
$ sudo cipi app logs myapp --type=laravel  # storage/logs/laravel.log
$ sudo cipi app logs myapp --type=nginx  # access and errors
$ sudo cipi app logs myapp --type=php  # PHP-FPM errors
$ sudo cipi app logs myapp --type=worker  # queue workers
$ sudo cipi app logs myapp --type=deploy  # every deploy, timestamped
```

Laravel writes a single `laravel.log` (`LOG_CHANNEL=single`); logrotate rotates it daily, compresses it and keeps a year, like every other app log. See [Log retention](/docs/log-retention).
