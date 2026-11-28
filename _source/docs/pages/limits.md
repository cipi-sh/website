@section cli-app-limits

Cap what one app can use, so a busy or misbehaving app cannot starve the others.

```bash
$ sudo cipi app limits myapp                              # show
$ sudo cipi app limits myapp --fpm-max-children=20 --memory-limit=256M
$ sudo cipi app limits myapp --octane-workers=4 --worker-procs=3
$ sudo cipi app limits myapp --disk=10                     # soft limit, GB
$ sudo cipi app limits myapp --disk=none
```

| Flag | Controls |
| --- | --- |
| `--fpm-max-children` | Maximum PHP-FPM processes (FPM apps) |
| `--memory-limit` | PHP `memory_limit` |
| `--octane-workers` | Octane workers (Octane apps) |
| `--worker-procs` | Queue worker processes |
| `--disk` | Soft disk limit for files + database, in GB, or `none` |

## Soft disk limit {#disk}

No app has one unless you set it. It never blocks the app: it drives the [monitor](/docs/monitor).

| Usage | Result |
| --- | --- |
| Below 90% | Nothing |
| 90% of the limit | Warning |
| Over the limit | Critical alert, repeated every 4 hours |
| Back under | Recovery notice |

`sudo cipi disk` shows usage next to the limit. The limit is kept outside `cipi.yml` on purpose: **a repository cannot raise the space its server grants it**. Also via REST (`GET|PUT /api/apps/{name}/limits`) and the panel.

@section cli-app-suspend

## Suspend an app {#suspend}

Take an app offline without deleting anything: for unpaid invoices, maintenance or a staging site you want dark.

```bash
$ sudo cipi app suspend myapp
$ sudo cipi app unsuspend myapp
```

| While suspended | |
| --- | --- |
| Every request | A static **503** page; PHP never runs |
| HTTPS | Covered too |
| Certificate renewals | Keep working |
| Vhost changes (aliases, PHP, SSL) | Respect the suspension |
| `sudo cipi app list`, `sudo cipi domains` | Mark the app as suspended |

Also from the REST API (`POST /api/apps/{name}/suspend`), cipi-cli and the [WHMCS module](/docs/whmcs).

> [!tip] Need a private preview instead of a closed site? Use [basic auth](/docs/basic-auth): the app runs, behind a password.
