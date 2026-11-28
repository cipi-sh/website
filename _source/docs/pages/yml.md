@section cli-yml

`cipi.yml` describes, in your repository, how the server should run the app: aliases, PHP settings, databases, workers, scheduler, health check, backups, routes, deploy options, crons. Server configuration gets reviewed, versioned and deployed like code.

<cipi-term name="yml"></cipi-term>

```flow
Commit cipi.yml | next to your code
> Put `cipi.yml` at the root of the repository, next to `composer.json`, and commit it like code.
Deploy | the file ships with the release
> Deploy as usual: the file arrives on the server inside the release.
Plan | see exactly what would change
> `sudo cipi yml plan myapp` lists every change it would make and every blocker. Nothing changes yet.
Apply | all or nothing, never half
> `sudo cipi yml apply myapp` makes all the changes, or none if any fails. With `sudo cipi yml auto myapp on`, this happens after every deploy.
```

## Commands {#commands}

| Command | Does |
| --- | --- |
| `sudo cipi yml generate myapp [--save]` | Write the app's current setup as a ready-to-commit file |
| `sudo cipi yml example myapp` | A commented template that validates as is |
| `sudo cipi yml validate myapp` | Parse and check; change nothing |
| `sudo cipi yml plan myapp [--json]` | Show every change that would be made |
| `sudo cipi yml apply myapp [--yes]` | Apply it |
| `sudo cipi yml auto myapp on\|off\|status` | Apply automatically after every successful deploy |
| `sudo cipi yml post-deploy myapp` | Run the `deploy.post` steps now |

Start from what you have: `sudo cipi yml generate myapp > cipi.yml`, commit, and `plan` reports nothing to do. Validate locally or in CI with [Cipi Agent](/docs/agent-yml): `php artisan cipi:yml validate`.

The file is read from the live release (`current/` or, for custom apps, `htdocs/`), then `shared/`. Every vhost refuses to serve it.

## The file {#file}

```yaml
version: 1

app:
  php: "8.6"                       # must be installed
  aliases: ["www.myapp.com", "*.myapp.com"]   # replaces the current list
  ini: { upload_max_filesize: 50M, memory_limit: 512M }
  limits: { memory_limit: 512M, fpm_max_children: 10 }

databases:                         # extra databases: myapp or myapp_*
  - name: myapp_reporting
  - name: myapp_analytics
    engine: pgsql

workers:
  horizon: false                   # true replaces the queues below
  reverb: false
  queues:
    - { queue: default, processes: 2 }
    - { queue: emails, processes: 1, tries: 5, timeout: 300 }

schedule: true
search: false                      # Meilisearch for Scout

health:
  url: "https://myapp.com/up"      # must be one of the app's domains
  expect: 200
  rollback_on_unhealthy: true

deploy:
  branch: main
  keep_releases: 5
  predeploy_snapshot: true
  node_build: "npm ci && npm run build"
  build_timeout: 2700              # seconds the front-end build may run (60-3600; 1800 unless set)
  step_timeout: 600                # seconds every other command may run (60-1800; 300 unless set)
  post:
    - artisan cache:clear

ssl: { force_https: true }
env: { required: [STRIPE_KEY, MAIL_HOST] }   # names only, never values

crons:
  - { every: 30m, run: artisan queue:prune-batches }

backup:
  profiles:                        # names: myapp or myapp-*
    - { name: myapp-db, scope: db, every: 30m, keep: 48, destinations: [local] }
    - { name: myapp-nightly, scope: all, cron: "0 2 * * *", keep_days: 14, destinations: [s3], encrypt: true }
    - { name: myapp-files, scope: files, every: 6h, keep: 8, destinations: [s3], exclude_paths: [storage/app/uploads] }
```

| Section | Same as | Notes |
| --- | --- | --- |
| `app.php`, `app.ini` | [cipi php / ini](/docs/php) | Per-app; server-wide ini stays with `sudo cipi ini` |
| `app.aliases` | [cipi alias](/docs/domains) | Authoritative: a removed alias is removed |
| `app.limits` | [cipi app limits](/docs/limits) | Out-of-range values block the plan instead of being clamped |
| `databases` | [cipi db](/docs/databases) | Credentials go to `shared/cipi-databases.env`, never to the repo |
| `workers`, `schedule` | [Queues](/docs/workers), [Reverb](/docs/reverb), [Scheduler](/docs/scheduler) | Laravel apps only |
| `search` | [cipi search](/docs/search) | Needs `sudo cipi search install` by root first |
| `health` | [Health checks](/docs/health-checks) | Probed every 5 minutes and after every deploy |
| `deploy` | [deploy-config](/docs/deploy-script) | `branch` takes effect from the next deploy. `build_timeout` and `step_timeout` are [how long a step may take](/docs/deploying#time-limits), in seconds: a number outside the range blocks the plan |
| `ssl.force_https` | `sudo cipi ssl force` | Can only be turned on from the file |
| `env.required` | | A missing variable blocks the plan |
| `crons` | | Allowlisted runners only; your other cron lines are untouched |
| `backup.profiles` | [cipi backup](/docs/backups) | The file owns the profiles it created; [`exclude_paths`](/docs/backups#exclude-paths) is validated like `--exclude-paths` |

## Routes: www, basic auth, redirects, proxies {#cli-yml-routes}

```yaml
app:
  aliases: ["www.myapp.com"]
  www: to-root                     # to-root | from-root | none
  basic_auth:
    users:
      - admin                      # keeps the password set on the server
      - { name: preview, password_hash: "$2y$12$…" }   # bcrypt or SHA-512 only
redirect: { to: "https://new.example.com", code: 301, keep_path: true }
redirects:
  - { from: /old-page, to: /new-page }
  - { from: /blog/, to: "https://blog.myapp.com/", code: 308 }
proxies:
  - { prefix: /api/, upstream: "http://127.0.0.1:3000", strip_prefix: true }
```

Routes apply as one change: one vhost rewrite, one `nginx -t`, reverted as a whole if Nginx refuses it. **No passwords in the repository**: users are names or strong hashes.

## Staging and production from one repository {#cli-yml-env}

Each app has an environment label (`production` by default; set with `--env` on create, clone or edit). An app reads `cipi-<env>.yml` first and falls back to `cipi.yml`.

| File | Read by | Typically |
| --- | --- | --- |
| `cipi-staging.yml` | apps with `--env=staging` | `deploy: { branch: develop }` |
| `cipi.yml` (or `cipi-production.yml`) | production apps | `deploy: { branch: main }` |

```bash
$ sudo cipi app clone shop --domain=staging.shop.com --name=shop-stg --env=staging
$ sudo cipi yml plan shop-stg  # deploy branch: main → develop (from the next deploy)
```

The **server** decides which file an app reads, never the file itself: a commit cannot point production at the staging file. An invalid `cipi-<env>.yml` does not fall back silently; the error names it.

## Node apps: `node:` {#cli-yml-node}

```yaml
node:
  framework: next                  # next nuxt sveltekit astro remix vite
  mode: ssr                        # spa | static | ssr
  version: 22
  start: npx next start -H 127.0.0.1
```

Applied by the deploy itself, from the release being deployed, so the commit that changes the build is built with it. Requires `sudo cipi yml auto myapp on`.

Under `deploy:`, a Node app takes `branch`, `keep_releases`, `build_timeout`, `step_timeout`, `predeploy_snapshot` and `post`. The artisan hooks (`migrate`, `optimize`, `storage_link`, `queue_restart`, `horizon_terminate`, `extra_artisan`) and `node_build` are for Laravel apps: in a Node app's file they block the plan, with a line that says which (its build is `node.build`).

## Post-deploy steps: `deploy.post` {#cli-yml-deploy-post}

Commands run from the live release after every successful deploy, webhook included. They need no auto-apply.

```yaml
deploy:
  post:
    - artisan scout:import --force
    - composer dump-autoload -o
    - node scripts/warm-cache.mjs
    - { run: artisan, command: view:cache }
  post_on_failure: warn            # or abort: cipi deploy fails too
```

| Allowed runners | Refused |
| --- | --- |
| `artisan`, `composer`, `npm`, `npx`, `yarn`, `pnpm`, `php`/`node` + a script inside the release | shells, pipes, `;`, `..`, `artisan tinker`, unknown commands |

Order of a deploy: build → swap → `sudo cipi yml apply` (if auto) → `deploy.post` → health check → notification.

## Auto-apply {#auto}

Nothing on the server changes from the file until you run `sudo cipi yml auto myapp on`. Then every successful deploy (CLI, panel, API or webhook) reconciles. A release without the file is a no-op; an invalid or blocked file is reported (`yml_fail`) and **never partially applied**, and the deploy itself still succeeds.

## Why it is safe to accept over Git {#cli-yml-more}

Anyone who can push controls the file, so it is fail-closed:

| Guard | Effect |
| --- | --- |
| Configure only | It can never create, rename or delete an app |
| Namespaced | Databases and backup profiles must belong to the app |
| Own domains only | The health check can't aim the server at internal addresses |
| No shell | Only allowlisted runners; unknown keys are errors |
| Small YAML subset | Anchors, aliases, tags, merges and block scalars are refused |
| Strict proxies | Cipi's own ports, link-local and cloud-metadata addresses are refused |
| Server-only settings | Disk limit and which environment file is read can't be changed from the file |

> [!warning] With auto-apply on, push access to the repository means control over this app's configuration. Treat write access accordingly.
