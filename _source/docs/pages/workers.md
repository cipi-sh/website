@section cli-workers

Every Laravel app starts with one Supervisor worker on the `default` queue. Add queues, scale processes, or hand everything to Horizon.

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
| `--timeout` | Seconds before a job is killed | 60 |

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
Swap release | atomic
Restart workers | on the new code
```

Workers never run old code against a new database. Supervisor restarts a worker only after an unexpected exit. Workers can also be declared in [cipi.yml](/docs/yml).

## As the app user {#cipi-worker}

App users manage their own workers without root, through a narrow helper:

```bash
$ sudo cipi-worker status myapp
$ sudo cipi-worker restart myapp
```
