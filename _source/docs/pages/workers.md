@section cli-workers

Every Laravel app starts with one Supervisor worker on the `default` queue. Add queues, scale processes, or hand everything to Horizon.

<cipi-term name="workers"></cipi-term>

```bash
$ cipi worker add myapp --queue=emails --processes=3
$ cipi worker add myapp --queue=exports --processes=1 --timeout=7200
$ cipi worker edit myapp --queue=default --processes=3
$ cipi worker list myapp
$ cipi worker remove myapp emails
$ cipi worker restart myapp
```

| Flag | Meaning | Default |
| --- | --- | --- |
| `--queue` | Queue to consume | `default` |
| `--processes` | Parallel processes | 1 |
| `--tries` | Attempts before `failed_jobs` | 3 |
| `--timeout` | Seconds a process lives before it's recycled (`--max-time`), and how long a stop waits for the running job | 3600 |

Plain workers consume the `database` connection; Redis (Valkey) queues run under Horizon. A single job's time limit is its own `$timeout` property (Laravel's default is 60 seconds).

## Horizon {#horizon}

```bash
$ cipi worker horizon enable myapp
$ cipi worker horizon status myapp
$ cipi worker horizon disable myapp
```

Horizon replaces the `queue:work` workers of that app (one or the other, not both). It needs the queues on Redis: set `QUEUE_CONNECTION=redis` with [cipi app env](/docs/environment); each app has its own [Valkey](/docs/valkey) instance ready.

When a deploy finds `laravel/horizon` installed, it helps without overriding your choices:

| The deploy finds | It does |
| --- | --- |
| Horizon, queues on Redis, no worker | Enables Horizon |
| Horizon plus existing workers | Explains how to switch; changes nothing |
| Horizon, queues not on Redis | Tells you which variable to set |

A Horizon you disabled stays disabled. `cipi pending` lists apps with Horizon installed but nothing processing jobs.

## During deploys {#deploys}

```flow
Stop workers | before the symlink swap
> Before the new release goes live, workers stop. Each finishes the job it's running (up to its `--timeout`).
Swap release | atomic
> The release switches in one atomic step.
Restart workers | on the new code
> Workers start again and only ever see the new code with the new database schema.
```

Workers never run old code against a new database. Supervisor restarts a worker only after an unexpected exit. Workers can also be declared in [cipi.yml](/docs/yml).

## As the app user {#cipi-worker}

App users manage their own workers without root, through a narrow helper:

```bash
$ sudo cipi-worker status myapp
$ sudo cipi-worker restart myapp
```

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| Jobs never run | No worker on that queue, or `QUEUE_CONNECTION=redis` without Horizon |
| Job killed after 60 s | Set `public $timeout` on the job and raise `retry_after` |
| Workers run old code | `cipi worker restart myapp` (deploys do it automatically) |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Workers or Horizon? | Workers for a few queues on the database; Horizon for Redis queues with a dashboard. [Guide](/guides/laravel-horizon-queues). |
| How many processes? | Start with 1–2 per queue and watch wait times. |
| Do workers survive a reboot? | Yes, Supervisor starts them at boot. |
