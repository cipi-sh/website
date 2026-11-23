@section cli-app-node

Node apps build and serve modern front-ends with the same lifecycle as Laravel apps: releases, rollback, webhook, SSL, basic auth, redirects, proxies and the deploy audit.

```bash
# Vite SPA: build, serve dist/ with an index.html fallback
$ cipi app create --user=web --domain=web.example.com \
    --repository=git@github.com:you/web.git --node=spa --framework=vite
# Pre-rendered site (Astro, Nuxt generate, Next export)
$ cipi app create --user=docs --domain=docs.example.com \
    --repository=git@github.com:you/docs.git --node=static --output=dist
# Node server with blue/green deploys
$ cipi app create --user=shop --domain=shop.example.com \
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

Two Supervisor programs (`shop-node-blue`, `shop-node-green`) each own a local port. If the new release crashes or never answers, it is stopped, the old slot keeps serving and the deploy fails before anything goes live. Rollback and `cipi node restart` switch the same way.

> [!security] The switch runs as root through a narrow rule: ports, start command, Node version and health path come from a root-owned file, not from the app. `.env` is read as data, never executed; `HOST` is forced to `127.0.0.1` and the start command runs without a shell.

## Manage {#manage}

```bash
$ cipi node status shop                 # mode, commands, slots
$ cipi node restart shop                # zero downtime
$ cipi node logs shop --lines=100
$ cipi app edit shop --start="node .output/server/index.mjs" --health-path=/health
$ cipi app edit web --node=static --output=dist
```

The same settings can live in your repository in the [`node:` section of cipi.yml](/docs/yml). Push-to-deploy works without a Laravel agent: Cipi ships a hardened webhook receiver that verifies GitHub/Bitbucket signatures and GitLab/Azure tokens.

> [!note] Node apps get no database by default; add one with [cipi db](/docs/databases). `cipi sync` and `cipi app clone` do not handle Node apps yet.
