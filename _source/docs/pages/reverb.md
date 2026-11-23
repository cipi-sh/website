@section cli-app-reverb

Laravel Reverb is Laravel's own WebSocket server. Cipi runs it behind the app's own domain and certificate: no extra port to open, no second certificate, no credentials to invent.

<cipi-term name="reverb"></cipi-term>

```bash
$ cipi app reverb enable myapp
$ cipi app reverb status myapp
$ cipi app reverb disable myapp
```

## What enable sets up {#setup}

```flow
Browser | wss://myapp.com/app/{key}
> The browser opens a WebSocket to `wss://myapp.com/app/{key}`: same domain as the app, standard port 443.
Nginx | same domain, same certificate
> Nginx recognizes the WebSocket paths and proxies them, using the app's own certificate. No extra port to open.
Reverb on 127.0.0.1 | port 9000–9099
> Reverb runs on `127.0.0.1`, on a port Cipi picks between 9000 and 9099, not exposed to the internet.
Supervisor | myapp-reverb, as the app user
> Supervisor runs Reverb as the app's user and restarts it if needed.
```

| Piece | Detail |
| --- | --- |
| Port | A free local port; Reverb never listens publicly |
| Process | `artisan reverb:start` under Supervisor; log in `~/logs/reverb.log` |
| Nginx | Proxies only `/app/{key}` (handshake) and `/apps/{id}/…` (broadcast API) |
| `.env` | `REVERB_*` credentials generated once and never rotated, plus `VITE_REVERB_*` for the front-end |
| Limits | 65 535 open files for Supervisor and Nginx, so thousands of clients can stay connected |

Running `enable` again is safe: it keeps port and credentials, re-derives host and scheme, and fills in missing keys. Laravel apps only.

## End to end {#end-to-end}

```bash
# in your project, then commit
$ composer require laravel/reverb && php artisan install:broadcasting
# on the server
$ cipi app reverb enable myapp
$ cipi ssl install myapp        # wss:// instead of ws://
$ cipi deploy myapp             # Vite bakes VITE_REVERB_* into the bundle
```

The stock `resources/js/echo.js` reads exactly the variables Cipi writes; nothing to change. **Redeploy after a domain or certificate change** so the bundle picks up the new values.

## ws:// or wss:// {#scheme}

| The app has | Clients use |
| --- | --- |
| No certificate | `ws://` on port 80 |
| A certificate | `wss://` on port 443 |
| A wildcard domain | A concrete host (e.g. `www.example.com`); browsers can't open a socket to `*` |

## Status and troubleshooting {#status}

```bash
$ cipi app reverb status myapp
 Reverb: enabled 127.0.0.1:9000
 myapp-reverb RUNNING pid 21847, uptime 3 days
 Clients dial: wss://myapp.com:443/app/3f9c1ab27de40518b6c4
 Open files: 65535 (supervisor)
```

| Warning | Fix |
| --- | --- |
| `Missing in .env: …` | Run `cipi app reverb enable myapp` again |
| Certificate present but scheme `http` | `enable` again, then deploy |
| Default open-file limit | `systemctl restart supervisor` (restarts all workers) or enable with `--restart-supervisor` |

> [!warning] `/app` and `/apps` belong to the WebSocket protocol. An app with its own `/app` or `/apps` routes should run Reverb on a separate subdomain.

## Disable, clone, cipi.yml {#lifecycle}

`disable` removes the process and the proxy rule and restores the previous broadcast driver (or `log`); credentials stay for a later re-enable. A [clone](/docs/manage-apps#cli-app-clone) gets its own port, credentials and host, never production's. In the repository:

```yaml
workers:
  reverb: true
```

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| Events never arrive | Broadcasts are queued: make sure a worker runs |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Full example? | [Real-time with Reverb](/guides/laravel-reverb-websockets). |
