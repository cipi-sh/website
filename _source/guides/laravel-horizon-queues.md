---
title: Laravel queues and Horizon in production
description: Queues explained from zero, then everything for production on your own server: what a worker is, adding and scaling queues under Supervisor, timeouts and retries, switching to Horizon on Valkey, protecting the dashboard, deploys that never run old code, failed jobs, alerts and cipi.yml.
category: laravel
order: 5
published: 2026-04-15
updated: 2026-11-23
howto: yes
keywords: laravel horizon production, laravel queue worker supervisor, laravel queue vps, laravel horizon nginx, queue:work timeout retry_after, laravel failed jobs production
docs:
  - workers
  - valkey
  - environment
  - yml
related:
  - laravel-valkey-cache-sessions
  - laravel-scheduler-cron
  - laravel-reverb-websockets
  - notifications-alerts
faq:
  - Workers or Horizon? | Plain workers are enough for a few queues. Horizon adds a dashboard, metrics, auto-balancing between queues and tagged job search, and needs the queues on Redis (Valkey). One or the other per app, not both.
  - Do workers run old code after a deploy? | No. Cipi stops them before the release swap and restarts them on the new code, so no job runs old code against a migrated database.
  - My job takes 20 minutes and gets killed. | Laravel kills a job after 60 seconds unless the job says otherwise: set `public $timeout = 1500;` on it, give its worker a `--timeout` at least as long, and set `retry_after` in `config/queue.php` higher, or it may be picked up twice.
  - Where do failed jobs go? | The `failed_jobs` table. List them with `cipi app artisan shop queue:failed`, retry with `queue:retry all`. Horizon shows them in the dashboard.
  - How many processes should I run? | Start with 1–2 per queue and watch the wait time. Each process uses about the memory of one request (often 50–150 MB). Horizon can scale between a min and max for you.
  - Who can open /horizon in production? | Nobody until you allow them in the `viewHorizon` gate. Add your team's e-mails, or put the whole app behind basic auth or Zero Trust.
  - Do queued jobs survive a server restart? | Yes. Jobs live in the database or in Valkey (saved to disk), and Supervisor starts the workers again at boot.
---
A **queue** lets your app answer the visitor immediately and do slow work (e-mails, PDFs, imports, webhooks) a moment later, in the background. A **worker** is a long-running process that takes jobs from the queue and runs them. This guide sets both up for production, then switches to **Horizon** when you want a dashboard.

## Key ideas, in plain words {#ideas}

| Term | Meaning |
| --- | --- |
| **Job** | A class with a `handle()` method, dispatched with `SendInvoice::dispatch($order)` |
| **Queue** | A named line of jobs: `default`, `emails`, `exports` |
| **Connection** | Where jobs are stored: `database` (Cipi's default) or `redis` (Valkey) |
| **Worker** | `php artisan queue:work`, running forever, processing jobs |
| **Supervisor** | The Linux service that keeps workers running and restarts them if they crash |
| **Horizon** | Laravel's worker manager for Redis queues, with a dashboard |

```flow
Request | dispatch job, reply fast
> The controller calls `SendInvoice::dispatch($order)` and answers the visitor straight away.
Queue | database or Valkey
> The job is stored in the queue: the database by default, or Valkey with Horizon.
Worker | Supervisor keeps it alive
> A worker kept alive by Supervisor takes the next job.
Job runs | retries on failure
> The job runs. If it throws, it's retried according to `$tries` and `$backoff`.
failed_jobs | after the last try
> After the last failed attempt it lands in `failed_jobs`, where you can inspect and retry it.
```

## Before you start {#before}

- A Laravel app deployed with Cipi: it already has **one worker on `default`**.
- Jobs implement `ShouldQueue`. Without it they run inline, in the request.

```bash
$ sudo cipi worker list shop
```

<cipi-term name="workers"></cipi-term>

## 1. Add and scale queues {#queues}

Put slow or bursty work on its own queue, so a big export never delays password-reset e-mails:

```bash
$ sudo cipi worker add shop --queue=emails --processes=3
$ sudo cipi worker add shop --queue=exports --processes=1 --timeout=7200
$ sudo cipi worker edit shop --queue=default --processes=2
$ sudo cipi worker list shop
```

| Flag | Meaning | Default |
| --- | --- | --- |
| `--queue` | Queue to consume | `default` |
| `--processes` | Parallel processes | 1 |
| `--tries` | Attempts before a job goes to `failed_jobs` | 3 |
| `--timeout` | Seconds a worker process lives before it's recycled (`--max-time`), and how long a stop waits for the running job | 3600 |

Plain workers consume the **`database`** connection. To move queues to Valkey, use Horizon (step 4).

```php
SendInvoice::dispatch($order)->onQueue('emails');
ExportOrders::dispatch($user)->onQueue('exports');
```

## 2. Timeouts and retries, the part people get wrong {#timeouts}

```stack
$timeout on the job | the job is killed after N seconds (Laravel's default: 60)
retry_after | the queue hands the job to another worker after N seconds
--timeout of the worker | how long the process lives, and how long a stop waits for it
$tries / $backoff | per job: how many attempts, how long between
```

| Rule | Example |
| --- | --- |
| Long jobs declare their own limit | `public $timeout = 7000;` on `ExportOrders` |
| The worker waits at least that long | `cipi worker add shop --queue=exports --timeout=7200` |
| `retry_after` > the longest job | `'retry_after' => 7260` for that connection |
| Jobs that call APIs get a backoff | `public $backoff = [10, 60, 300];` |
| Limit attempts | `public $tries = 5;` or `retryUntil()` |
| Make jobs safe to run twice | Check state first: "already sent?" |

`retry_after` is set per connection in `config/queue.php`. If it's shorter than a job's runtime, the job runs twice.

## 3. Failed jobs {#failed}

```bash
$ sudo cipi app artisan shop queue:failed
$ sudo cipi app artisan shop queue:retry all
$ sudo cipi app artisan shop queue:retry 5f1c…           # one job
$ sudo cipi app artisan shop queue:prune-failed --hours=168
```

Add a `failed()` method to the job to notify yourself, or alert on the count from the scheduler.

## 4. Switch to Horizon {#horizon}

Horizon needs the queues on Redis. Each app has its own [Valkey](/guides/laravel-valkey-cache-sessions) ready.

```bash
# on your laptop
$ composer require laravel/horizon
$ php artisan horizon:install
$ git commit -am "Add Horizon" && git push
# on the server
$ sudo cipi app env shop --set=QUEUE_CONNECTION=redis
$ sudo cipi app artisan shop config:cache
$ sudo cipi worker horizon enable shop
$ sudo cipi worker horizon status shop
```

Horizon replaces the app's `queue:work` workers: one or the other. Define supervisors in `config/horizon.php`:

```php
'environments' => [
    'production' => [
        'fast' => ['connection' => 'redis', 'queue' => ['default', 'emails'],
                   'balance' => 'auto', 'minProcesses' => 1, 'maxProcesses' => 6, 'tries' => 3],
        'slow' => ['connection' => 'redis', 'queue' => ['exports'],
                   'maxProcesses' => 1, 'timeout' => 7200, 'tries' => 1],
    ],
],
```

| The deploy finds | It does |
| --- | --- |
| Horizon, queues on Redis, no worker | Enables Horizon |
| Horizon plus existing workers | Explains how to switch; changes nothing |
| Horizon, queues not on Redis | Tells you which variable to set |

## 5. Protect the dashboard {#dashboard}

`/horizon` is closed in production until you open it:

```php
// app/Providers/HorizonServiceProvider.php
protected function gate(): void
{
    Gate::define('viewHorizon', fn ($user) => in_array($user->email, [
        'you@example.com',
    ]));
}
```

For extra safety, [basic auth](/docs/basic-auth) or [Zero Trust](/guides/cloudflare-zero-trust-laravel) in front of the app.

## 6. Deploys don't break jobs {#deploys}

```flow
Stop workers | before the swap
> During a deploy, workers stop first and finish their current job.
Swap release | atomic
> The new release goes live in one atomic switch.
Restart workers | on the new code
> Workers start again on the new code.
```

Workers stop gracefully: the running job finishes first, up to the worker's `--timeout`. Jobs dispatched by the old code must still work with the new code, so don't rename a job class or change its constructor in the same deploy that removes the old one.

## 7. Get alerted {#alerts}

| Signal | How |
| --- | --- |
| Worker crashed repeatedly | Supervisor restarts it; [Cipi alerts](/guides/notifications-alerts) cover server events |
| Long waits | Horizon's `waits` config sends a notification when a queue waits too long |
| Failed jobs | `failed()` on the job, or a scheduled count check |
| Nothing processing at all | `sudo cipi pending` lists apps with Horizon installed but no worker |

## 8. In cipi.yml {#yml}

```yaml
workers:
  horizon: false
  queues:
    - { queue: default, processes: 2 }
    - { queue: emails, processes: 3, tries: 5, timeout: 300 }
    - { queue: exports, processes: 1, timeout: 7200 }
```

Or `horizon: true` to hand everything to Horizon. [More on cipi.yml](/guides/manage-apps-with-cipi-yml).

## Troubleshooting {#troubleshooting}

| Problem | Fix |
| --- | --- |
| Jobs never run | No worker on that queue (`cipi worker list shop`), job not `ShouldQueue`, or `QUEUE_CONNECTION=redis` with plain workers: they read `database`, so enable Horizon or set it back |
| Job runs twice | `retry_after` shorter than the job's runtime |
| `MaxAttemptsExceededException` / job killed at 60 s | Set `$timeout` on the job and raise `retry_after` |
| Code change ignored by jobs | Workers not restarted: `sudo cipi worker restart shop` |
| Horizon shows "Inactive" | Not enabled: `cipi worker horizon enable shop`; or `QUEUE_CONNECTION` isn't `redis` |
| `/horizon` returns 403 | The `viewHorizon` gate doesn't include your user |
| Memory grows over time | A job leaks: `--max-jobs` / `maxJobs` in Horizon restarts processes regularly |
