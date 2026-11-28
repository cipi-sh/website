@section cli-app-node

Node apps build and serve modern front-ends with the same lifecycle as Laravel apps: releases, rollback, webhook, SSL, basic auth, redirects, proxies and the deploy audit.

```bash
# Vite SPA: build, serve dist/ with an index.html fallback
$ sudo cipi app create --user=web --domain=web.example.com \
    --repository=git@github.com:you/web.git --node=spa --framework=vite
# Pre-rendered site (Astro, Nuxt generate, Next export)
$ sudo cipi app create --user=docs --domain=docs.example.com \
    --repository=git@github.com:you/docs.git --node=static --output=dist
# Node server with blue/green deploys
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --node=ssr --framework=next --node-version=24
```

## Modes {#modes}

| Mode | Nginx | Use for |
| --- | --- | --- |
| `spa` | Serves the build; unknown paths fall back to `/index.html` | Client-side routed apps |
| `static` | Serves the build; real 404s via `/404.html` | Pre-rendered sites |
| `ssr` | Proxies to a Node process on localhost, WebSockets included | Next.js, Nuxt, SvelteKit, Remix, Astro SSR |

Hashed assets (`assets/`, `_astro/`, `_nuxt/`, `_app/immutable/`) are cached as immutable; HTML is never cached.

## Options {#options}

| Flag | Meaning |
| --- | --- |
| `--framework` | Preset: `vite` (spa), `next`, `nuxt`, `sveltekit`, `astro`, `remix` (ssr). Explicit flags win |
| `--node-version` | LTS major: `22` or `24` (default: the [server default](/docs/nodejs)) |
| `--build` | Build command (default `npm run build`) |
| `--start` | SSR start command, a Node runner plus arguments, e.g. `node build` |
| `--output` | Build folder for spa/static; the deploy fails if it has no `index.html` |
| `--health-path` | SSR path that must answer below 500 before a release takes traffic (default `/`) |
| `--db=NAME` | A new database made with the app and shown as its own ([below](#database)) |

The build installs from your lockfile (`npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable`, `bun install --frozen-lockfile`) with `NODE_ENV=production`. `shared/.env` is read at build time and by SSR servers at runtime; edit it with [cipi app env](/docs/environment).

## Zero-downtime SSR: blue/green {#blue-green}

```flow
Start new release | on the idle slot
> Each Node app has two slots (blue and green). The new release starts on the slot that isn't serving traffic.
Health check | must answer < 500 in 60 s
> It must answer with a status below 500 within 60 seconds. If it crashes or never answers, it's stopped and the deploy fails: visitors never see it.
Switch upstream | nginx -t, reload
> Nginx is pointed at the new slot, tested with `nginx -t`, and reloaded gracefully.
Drain old slot | then stop it
> The old slot finishes its open requests, then stops. Rollback switches back the same way.
```

Two Supervisor programs (`shop-node-blue`, `shop-node-green`) each own a local port. If the new release crashes or never answers, it is stopped, the old slot keeps serving and the deploy fails before anything goes live. Rollback and `sudo cipi node restart` switch the same way.

> [!security] The switch runs as root through a narrow rule: ports, start command, Node version and health path come from a root-owned file, not from the app. `.env` is read as data, never executed; `HOST` is forced to `127.0.0.1` and the start command runs without a shell.

## Manage {#manage}

```bash
$ sudo cipi node status shop            # mode, commands, slots
$ sudo cipi node restart shop           # zero downtime
$ sudo cipi node logs shop --lines=100
$ sudo cipi app edit shop --start="node .output/server/index.mjs" --health-path=/health
$ sudo cipi app edit web --node=static --output=dist
```

The same settings can live in your repository in the [`node:` section of cipi.yml](/docs/yml). Push-to-deploy works without a Laravel agent: Cipi ships a hardened webhook receiver that verifies GitHub/Bitbucket signatures and GitLab/Azure tokens.

## Deploy options {#deploy-options}

A Node app has a release recipe like a Laravel app, without the artisan steps. Four of its options are yours to set:

```bash
$ sudo cipi app deploy-config shop                    # show
$ sudo cipi app deploy-config shop --keep-releases=3
$ sudo cipi app deploy-config shop --build-timeout=2700  # the install and the build: 45 minutes each
$ sudo cipi app deploy-config shop --step-timeout=600
$ sudo cipi app deploy-config shop --predeploy-snapshot  # with a linked database
```

| Option | Effect | Default |
| --- | --- | --- |
| `--keep-releases` | Releases kept for rollback (1 to 20) | 5 |
| `--build-timeout` | Seconds `node:install` and `node:build` may each run, 60 to 3600 | 1800 |
| `--step-timeout` | Seconds every other command may run, 60 to 1800 | 300 |
| `--predeploy-snapshot` | Dump every database [linked to the app](#database) before each deploy. With none linked the deploy says so and goes on | off |

The build command itself is `sudo cipi app edit shop --build="…"`. The same four live under `deploy:` in [cipi.yml](/docs/yml#cli-yml-node), in the panel's *Deploy pipeline* card, and in the API (`PUT /api/apps/{name}/deploy-config`). More on the two clocks: [how long a step may take](/docs/deploying#time-limits).

## A database with the app {#database}

A Node app has no database unless you ask for one. Ask while creating it:

```bash
$ sudo cipi app create --user=shop --domain=shop.example.com \
    --repository=git@github.com:you/shop.git --node=ssr --framework=next --db=shop
```

`--db=NAME` creates the database, a user of the same name and a password, shown once in the summary next to the app's own credentials, and links the database to the app: it is listed as the app's in `sudo cipi db list` and in the panel, and it is what `--predeploy-snapshot` dumps before each deploy. Deleting the app leaves a linked database in place. `--db` without a name uses the app's name; `--engine=pgsql` picks the engine where more than one is installed. At a terminal, without the flag, `sudo cipi app create` asks *New database for this app*: a name, or Enter for none. Put the credentials in `shared/.env` with [cipi app env](/docs/environment) (`DATABASE_URL=…`). Later, or for a second one: [cipi db create --app=shop](/docs/databases).

> [!note] `sudo cipi sync` and `sudo cipi app clone` do not handle Node apps yet: create the app on the other server, and it deploys from Git.

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| Deploy fails: no index.html | `--output` points at the wrong build folder |
| SSR release never goes live | It must answer the health path within 60 s; check `--start` and the logs |
| Deploy stops at `node:install` or `node:build`: `exceeded the timeout of 300 seconds` | The recipe was written by an old release: `sudo cipi self-update` gives the install and the build [their own clock](/docs/deploying#time-limits), 30 minutes each |
| The install or the build is stopped at 30 minutes | Look at [why it is slow](/docs/deploying#flaky-build), then give it more: `sudo cipi app deploy-config shop --build-timeout=3600` |
| The build is slow, or passes some days and not others | It is short of memory, or the server is busy: [what to check](/docs/deploying#flaky-build) |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Which frameworks? | Vite SPAs, static builds, Next, Nuxt, SvelteKit, Astro, Remix. |
| With a Laravel API? | [API + Next.js/Nuxt guide](/guides/laravel-api-nextjs-nuxt). |
