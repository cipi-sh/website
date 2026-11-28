@section cli-redirect

Move pages or whole sites without losing visitors or search ranking, and route a path to another service. Rules live in Cipi's state and survive every vhost change.

## Redirect a whole app {#app-redirect}

Every name the app answers to (primary, aliases, www) goes to the target in **one hop**.

```bash
$ sudo cipi redirect set oldsite --to=https://new.com       # 301, path and query kept
$ sudo cipi redirect set oldsite --to=https://new.com --302 --no-path
$ sudo cipi redirect disable oldsite  # serve the app again, keep the target
$ sudo cipi redirect enable oldsite
$ sudo cipi redirect unset oldsite
```

Status codes: `--301` (default), `--302`, `--307`, `--308`. The old name's certificate keeps renewing, so HTTPS visitors get a valid redirect too.

## Redirect paths {#path-redirects}

```bash
$ sudo cipi redirect add myapp /old-pricing /pricing
$ sudo cipi redirect add myapp /blog/ https://blog.example.com/
$ sudo cipi redirect add myapp /docs/ https://docs.example.com --308 --no-path
$ sudo cipi redirect list myapp
$ sudo cipi redirect remove myapp /old-pricing
```

| `from` | Matches | Example |
| --- | --- | --- |
| `/old` (no trailing slash) | Exactly that path; query kept | `/old?x=1` → `/new?x=1` |
| `/blog/` (trailing slash) | The prefix; the rest is appended | `/blog/x?y` → `https://blog.example.com/x?y` |
| with `--no-path` | Everything to the target as is | `/blog/x` → `https://blog.example.com/` |

Path redirects and proxies keep working while an app redirect is on, so a moved site can keep `/api/` in place.

@section cli-proxy

## Proxy a path to another service {#proxy}

Hand `/api/`, `/events/` or `/docs/` to a Node or Go service, a legacy app or another origin.

```bash
$ sudo cipi proxy add myapp /api/ http://127.0.0.1:3000 --strip-prefix
$ sudo cipi proxy add myapp /events/ http://127.0.0.1:4000 --no-buffering --timeout=3600
$ sudo cipi proxy add myapp /docs/ https://docs-origin.example.com --preserve-host
$ sudo cipi proxy list myapp
$ sudo cipi proxy remove myapp /api/
```

| Option | Effect |
| --- | --- |
| (none) | URI unchanged: `/api/users` → `upstream/api/users` |
| `--strip-prefix` | `/api/users` → `upstream/users`, with `X-Forwarded-Prefix` |
| `--preserve-host` | Send the visitor's `Host` |
| `--timeout=N` | Upstream timeout in seconds |
| `--no-buffering` | For Server-Sent Events, long polling, streaming |

Every proxy carries WebSocket upgrade and `X-Real-IP` / `X-Forwarded-*` headers; basic auth, when on, covers it too.

## Safety rails {#safety}

| Guard | Protects against |
| --- | --- |
| Strict charset for paths and URLs | Injecting Nginx directives |
| Reserved paths (`/`, ACME, `/robots.txt`, `/cipi/webhook`, Reverb's `/app`) | Breaking certificates, webhooks or WebSockets |
| Loop and overlap detection | Redirect loops; a redirect and a proxy on the same prefix |
| Loopback guard | Proxying to Cipi's own ports (SSH, databases, Valkey, Octane, Reverb) without `--force`; the panel and cipi.yml can never force |
| `nginx -t` before reload | A bad rule: config and state are restored, exit code 1 |

Changes fire `redirect_change` / `proxy_change` [notifications](/docs/notifications). Also available in the panel, the API and [cipi.yml](/docs/yml#cli-yml-routes).
