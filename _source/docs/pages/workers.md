@section cli-workers

Every Laravel app starts with one Supervisor worker on the `default` queue. Add queues, scale processes, or hand everything to Horizon.

<cipi-term name="workers"></cipi-term>

```bash
$ sudo cipi worker add myapp --queue=emails --processes=3
$ sudo cipi worker add myapp --queue=exports --processes=1 --timeout=7200
$ sudo cipi worker edit myapp --queue=default --processes=3
$ sudo cipi worker list myapp
$ sudo cipi worker remove myapp emails
$ sudo cipi worker restart myapp
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
$ sudo cipi worker horizon enable myapp
$ sudo cipi worker horizon status myapp
$ sudo cipi worker horizon disable myapp
```

Horizon replaces the `queue:work` workers of that app (one or the other, not both). It needs the queues on Redis: set `QUEUE_CONNECTION=redis` with [cipi app env](/docs/environment); each app has its own [Valkey](/docs/valkey) instance ready.

When a deploy finds `laravel/horizon` installed, it helps without overriding your choices:

| The deploy finds | It does |
| --- | --- |
| Horizon, queues on Redis, no worker | Enables Horizon |
| Horizon plus existing workers | Explains how to switch; changes nothing |
| Horizon, queues not on Redis | Tells you which variable to set |

A Horizon you disabled stays disabled. `sudo cipi pending` lists apps with Horizon installed but nothing processing jobs.

## During deploys {#deploys}

```flow
Build & migrate | workers keep running
> While the new release is built and migrated, Horizon and the workers keep processing jobs on the live release. A deploy never waits for a long job.
Swap release | atomic
> The release switches in one atomic step.
Restart workers | after the job in hand
> Horizon and the queue workers get SIGTERM: each finishes the job it is running and exits, and Supervisor starts it again on the new release. Octane and Reverb are restarted; a program that was not running is started.
```

Nothing stops before the swap, so a deploy never waits for a running job. The flip side is that jobs taken before the swap run on the previous release, also after the migrations: keep migrations backward compatible for one release (add a column, deploy, then use it). Supervisor restarts a worker after any exit. Workers can also be declared in [cipi.yml](/docs/yml).

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
| Workers run old code | A long job started before the deploy finishes on the old release; the worker then restarts on the new one. Otherwise `sudo cipi worker restart myapp` |
| Horizon stuck in `STOPPING` after a deploy | An old Cipi release, whose deploys waited for running jobs: `sudo cipi self-update` |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Workers or Horizon? | Workers for a few queues on the database; Horizon for Redis queues with a dashboard. [Guide](/guides/laravel-horizon-queues). |
| How many processes? | Start with 1–2 per queue and watch wait times. |
| Do workers survive a reboot? | Yes, Supervisor starts them at boot. |
