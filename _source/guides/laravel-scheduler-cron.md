---
title: Laravel scheduler and cron jobs in production
description: How Laravel's task scheduler works on a server, explained from zero: the one cron line, how Cipi runs it per app, writing scheduled tasks that don't overlap, running them on one server only, extra cron jobs, alerts when a job fails and how to debug one that never ran.
category: laravel
order: 13
published: 2026-11-23
updated: 2026-11-23
howto: yes
keywords: laravel scheduler production, laravel cron vps, schedule:run not working, laravel withoutOverlapping, laravel cron ubuntu, laravel scheduled tasks server
docs:
  - scheduler
  - workers
  - notifications
related:
  - laravel-horizon-queues
  - notifications-alerts
  - server-monitoring-alerts
faq:
  - Do I need to add the cron line myself? | No. Every Laravel app on Cipi gets `schedule:run` every minute in its own user's crontab, with the app's PHP version.
  - My task didn't run. Where do I look? | Run `cipi app artisan shop schedule:list` to see when it's due, then check syslog for the app's cron lines and `storage/logs/laravel.log` for errors. See the debugging section.
  - What happens during a deploy? | The cron line always points at `current/`, so the next minute runs the new release. A task that was mid-run finishes on the old code.
  - Should a long task run in the scheduler? | Better as a queued job: schedule a small command that dispatches the job. Workers retry, time out cleanly and don't block the next tasks.
  - Two servers run the same app. Will tasks run twice? | Yes, unless you add `->onOneServer()`, which needs a shared cache store such as Redis or the database.
  - Which timezone does the scheduler use? | The app's `timezone` in `config/app.php` (UTC by default). Use `->timezone('Europe/Rome')` per task.
  - Can I pause scheduled tasks? | `cipi schedule off shop` removes the line; `cipi schedule on shop` puts it back. Maintenance mode also skips tasks unless they use `->evenInMaintenanceMode()`.
---
Most apps need things to happen on their own: send a daily report, clear old records, renew subscriptions. Laravel's **scheduler** lets you list those tasks in code. A single cron line runs the scheduler every minute, and it decides what's due.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **cron** | The Linux service that runs commands at fixed times |
| **crontab** | A user's list of cron jobs, one per line |
| **Scheduler** | Laravel's list of tasks in `routes/console.php`, checked once a minute |
| **`schedule:run`** | The Artisan command cron calls every minute; it runs what's due and exits |
| **Overlap** | A task still running when its next run starts |

```flow
cron, every minute | as user shop
schedule:run | reads routes/console.php
Due tasks | run or dispatch to the queue
Exit | until the next minute
```

## Before you start {#before}

- A Laravel app deployed with Cipi ([first deploy](/guides/deploy-laravel-ubuntu-vps)).
- Nothing to configure: the cron line already exists.

## 1. See what Cipi set up {#check}

```bash
$ sudo cipi schedule status shop
$ sudo crontab -u shop -l
* * * * * /usr/bin/php8.6 /home/shop/current/artisan schedule:run >> /dev/null 2>&1
```

It runs as `shop`, so tasks have the app's permissions and nothing more, with **the app's** PHP version, against `current/`, which always points at the live release.

## 2. Write your first tasks {#tasks}

In `routes/console.php`:

```php
use Illuminate\Support\Facades\Schedule;

Schedule::command('reports:daily')
    ->dailyAt('06:00')
    ->timezone('Europe/Rome')
    ->withoutOverlapping()
    ->onFailure(fn () => logger()->error('Daily report failed'));

Schedule::command('model:prune')->daily();
Schedule::job(new SyncStock)->everyFifteenMinutes();     // queued, runs on a worker
Schedule::command('backup:clean')->weekly()->sundays()->at('03:00');
```

Commit and deploy. Then list them as the server sees them:

```bash
$ sudo cipi app artisan shop schedule:list
```

| Option | Use it when |
| --- | --- |
| `->withoutOverlapping()` | A run can take longer than the interval |
| `->onOneServer()` | The app runs on more than one server (needs a shared cache) |
| `->runInBackground()` | Several long commands are due at the same minute |
| `->evenInMaintenanceMode()` | It must run during `artisan down` |
| `Schedule::job(...)` | The work is heavy: the scheduler only dispatches it |

## 3. Keep the scheduler light {#light}

`schedule:run` runs due tasks one after another. A ten-minute command at 06:00 delays every other task due at 06:00.

```flow
Scheduler | small, fast commands
Queue | heavy work, retries, timeouts
Worker | Supervisor, restarted on deploy
```

Schedule a job instead of the work itself, and give long queues their own worker ([queues guide](/guides/laravel-horizon-queues)):

```bash
$ sudo cipi worker add shop --queue=reports --processes=1 --timeout=1800
```

## 4. Get told when a task fails {#alerts}

Inside Laravel, `->onFailure()` and `->emailOutputOnFailure('ops@example.com')` (which needs working Laravel mail). On the server side, wrap a root cron job with `cipi-cron-notify` and it alerts the [channels you configured](/guides/notifications-alerts) when the command exits non-zero:

```text
# /etc/cron.d/shop-reports
0 4 * * * root /usr/local/bin/cipi-cron-notify daily-report sudo -u shop php /home/shop/current/artisan report:daily
```

For "did it run at all?", schedule a heartbeat to an external monitor:

```php
Schedule::command('reports:daily')->dailyAt('06:00')
    ->pingOnSuccess('https://hc-ping.com/your-uuid');
```

## 5. Extra cron jobs {#extra}

Prefer the scheduler: tasks stay in code, versioned and deployed. When you really need a plain cron job (a shell script, a non-PHP tool), add it to the app user's crontab:

```bash
$ sudo su - shop
$ crontab -e
# keep the schedule:run line, add yours below
*/15 * * * * /home/shop/current/scripts/sync.sh >> /home/shop/logs/sync.log 2>&1
```

| Rule | Why |
| --- | --- |
| Keep the `schedule:run` line | `cipi schedule on shop` puts it back if it goes |
| Use absolute paths | Cron has a minimal `PATH` |
| Log to a file | Otherwise output disappears |
| Root jobs in `/etc/cron.d/` | Never give an app more rights than it needs |

## 6. Pause and resume {#pause}

```bash
$ sudo cipi schedule off shop        # e.g. during a data migration
$ sudo cipi schedule on shop
```

## Debug a task that never ran {#debug}

```flow
Is it listed? | schedule:list
Is cron calling? | grep CRON syslog
Did it fail? | laravel.log
Run it by hand | artisan command
```

```bash
$ sudo cipi app artisan shop schedule:list
$ grep CRON /var/log/syslog | grep shop | tail -5
$ sudo cipi app logs shop --type=laravel          # Laravel log
$ sudo cipi app artisan shop reports:daily        # run it now, see the error
$ sudo cipi app artisan shop schedule:clear-cache # stuck overlap lock
```

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Task listed but never runs | `schedule status` says off: `cipi schedule on shop` |
| Runs at the wrong hour | Server time is UTC: set `->timezone()` per task or `timezone` in `config/app.php` |
| Skipped forever after a crash | Overlap lock left behind: `schedule:clear-cache` |
| Runs twice | Two servers without `->onOneServer()`, or a duplicate line in the crontab |
| Works by hand, fails from cron | Missing env or relative path: use absolute paths, check the log |
| Skipped while the app is down | You ran `artisan down`: add `->evenInMaintenanceMode()` only to tasks that are safe then |
