---
title: Laravel queues and Horizon in production
description: Run queue workers or Horizon under Supervisor on your own server, scale them per queue, restart them safely on deploy and keep them in cipi.yml.
category: laravel
order: 5
published: 2026-04-15
updated: 2026-11-23
howto: yes
keywords: laravel horizon production, laravel queue worker supervisor, laravel queue vps
related:
  - laravel-reverb-websockets
  - laravel-octane-frankenphp
  - manage-apps-with-cipi-yml
faq:
  - Workers or Horizon? | Plain workers are enough for a few queues. Horizon adds a dashboard, metrics and auto-balancing, and needs queues on Redis (Valkey).
  - Do workers run old code after a deploy? | No. Cipi stops them before the release swap and restarts them on the new code.
---
Every Laravel app on Cipi starts with one worker on the `default` queue, under Supervisor. This guide adds queues, scales them, and switches to Horizon when you want a dashboard.

<cipi-term name="workers"></cipi-term>

## 1. Add and scale queues

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
| `--timeout` | Seconds before a job is killed | 60 |

Dispatch to a queue as usual: `SendInvoice::dispatch($order)->onQueue('emails')`.

## 2. Switch to Horizon

Horizon needs the queues on Redis. Each app has [Valkey](/docs/valkey), a drop-in Redis, ready:

```bash
$ composer require laravel/horizon && php artisan horizon:install   # commit, deploy
$ sudo cipi app env shop --set=QUEUE_CONNECTION=redis
$ sudo cipi worker horizon enable shop
```

Horizon replaces the app's `queue:work` workers. Configure supervisors per queue in `config/horizon.php`. Protect the dashboard with the `viewHorizon` gate.

When a deploy finds Horizon installed and queues on Redis with no worker, it enables Horizon for you; it never overrides a choice you made.

## 3. Deploys don't break jobs

```flow
Stop workers | before the swap
Swap release | atomic
Restart workers | on the new code
```

Workers never run old code against a migrated database. Long jobs: set `--timeout` above the job's duration so a deploy doesn't kill them mid-run.

## 4. In cipi.yml

```yaml
workers:
  horizon: false
  queues:
    - { queue: default, processes: 2 }
    - { queue: emails, processes: 3, tries: 5, timeout: 300 }
```

Or `horizon: true` to hand everything to Horizon. [More on cipi.yml](/guides/manage-apps-with-cipi-yml).
