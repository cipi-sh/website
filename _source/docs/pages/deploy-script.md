@section cli-deploy-config

Most apps never touch the deploy recipe: the options below cover the common needs and are kept safely across updates. For anything else, add your own Deployer tasks.

## Deploy options {#options}

```bash
$ cipi app deploy-config myapp                                  # show
$ cipi app deploy-config myapp --keep-releases=10
$ cipi app deploy-config myapp --no-migrate --no-optimize
$ cipi app deploy-config myapp --horizon-terminate --queue-restart
$ cipi app deploy-config myapp --extra-artisan=view:clear,event:cache
$ cipi app deploy-config myapp --node-build='npm ci && npm run build'
$ cipi app deploy-config myapp --predeploy-snapshot
$ cipi app deploy-config myapp --build-timeout=2700 --step-timeout=600
```

| Option | Effect | Default |
| --- | --- | --- |
| `--keep-releases` | Releases kept for rollback | 5 |
| `--migrate` / `--no-migrate` | `migrate --force` | on |
| `--optimize` / `--no-optimize` | `artisan optimize` | on |
| `--storage-link` | `storage:link` | on |
| `--queue-restart`, `--horizon-terminate` | Reload workers / Horizon | on |
| `--extra-artisan` | More Artisan commands after migrations | none |
| `--node-build` | Front-end build before the swap (npm, yarn, pnpm, bun) | none |
| `--predeploy-snapshot` | Database dump before migrations | off |
| `--build-timeout` | Seconds the front-end build may run, 60 to 3600 ([time limits](/docs/deploying#time-limits)) | 1800 |
| `--step-timeout` | Seconds every other command of the deploy may run, 60 to 1800 | 300 |

Saving regenerates `deploy.php` from Cipi's template. Also via REST (`GET|PUT /api/apps/{name}/deploy-config`), MCP and the panel's Deploy tab. The same settings can live in [cipi.yml](/docs/yml).

**A [Node app](/docs/node-apps)** has a recipe too, without the artisan hooks: it takes `--keep-releases`, `--build-timeout`, `--step-timeout` and `--predeploy-snapshot` (its build command is `cipi app edit myapp --build="…"`). A custom app deploys with a `git pull` and has no recipe to configure.

@section cli-deploy-script

## Custom Deployer tasks {#custom}

The recipe is `/home/myapp/.deployer/deploy.php`. Add tasks **at the bottom**, below the Cipi-managed blocks:

```php
// ── Custom tasks (keep below Cipi-managed blocks) ──
task('app:warm', function () {
    run('{{bin/php}} {{release_path}}/artisan app:warm-cache');
});
after('artisan:migrate', 'app:warm');
```

| Hook point | Use for |
| --- | --- |
| `after('deploy:shared', …)` | Builds that need `.env` (e.g. Vite reads `VITE_*`) |
| `after('artisan:migrate', …)` | Seeders, cache warm-up |
| `before('deploy:symlink', …)` | Last checks before going live |
| `after('deploy:symlink', …)` | Notifications, cache purges — e.g. [emptying the page cache](/docs/page-cache#recipe) from a recipe of your own (a deploy run by Cipi empties it by itself) |

The default order: prepare → vendors → shared → (build) → migrate → optimize → storage link → **symlink** → restart workers → cleanup.

**A task of your own has the time of every step but the build** — 5 minutes per command unless the app's [`--step-timeout`](/docs/deploying#change-limits) says otherwise. Give one long command its own limit, in seconds, without changing the others:

```php
task('app:import', function () {
    run('{{bin/php}} {{release_path}}/artisan app:import-catalog', timeout: 1200);
});
```

**Each step runs once.** A Laravel deploy runs `artisan:storage:link`, `artisan:optimize` and `artisan:migrate` one time each — the deploy log shows one `artisan:migrate` and one `artisan:optimize` — and a step turned off with `--no-migrate` or `--no-optimize` is really skipped. A log that shows them twice comes from a recipe written by an old release: `cipi self-update` rewrites the recipe of every app. A recipe you edited by hand is left alone and named, with the command that regenerates it.

> [!warning] Changing PHP or branch with `cipi app edit` regenerates `deploy.php`. Keep custom tasks in one clearly marked block at the bottom and back it up, or prefer `deploy-config` and [cipi.yml](/docs/yml), which are never lost.

Test every change with a normal deploy; `cipi deploy myapp --rollback` is always one command away, and the log is in `cipi app logs myapp --type=deploy`.
