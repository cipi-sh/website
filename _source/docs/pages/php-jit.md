@section cli-app-jit

PHP's JIT compiles hot code to machine code. It helps CPU-bound work (calculations, big collections, heavy templating) and does little for requests that mostly wait on the database. Cipi turns it on for **one app**, FPM or Octane, and checks it before and after.

## Commands {#commands}

```bash
$ cipi app jit myapp on                              # tracing mode, 128M buffer
$ cipi app jit myapp on --mode=function --buffer=256M
$ cipi app jit myapp off
$ cipi app jit myapp --json                          # current state
```

## Safety checks {#checks}

| Check | When | If it fails |
| --- | --- | --- |
| PHP can start with JIT (no Xdebug/pcov, JIT compiled in) | Before | Refused, nothing written |
| PHP-FPM active / Octane answering | After | Previous setting restored |

## Where it is set {#where}

| Runtime | Where the setting goes | Side effect |
| --- | --- | --- |
| PHP-FPM | The app's pool, plus a small server-wide file that makes JIT startable for that PHP version | Restarts that version's PHP-FPM (all its apps, briefly) |
| Octane | The app's own ini directory | Restarts only that app's Octane |

A value forced with [cipi ini](/docs/php#cli-ini) wins. `cipi app convert` resets JIT. Panel API: `GET|PUT /api/apps/{name}/jit`.

> [!tip] Measure before and after on your real workload; keep JIT only where it pays.

> [!note] JIT and OPcache make PHP run faster. For pages that are the same for every visitor there is something quicker than running PHP: not running it — the [page cache](/docs/page-cache).
