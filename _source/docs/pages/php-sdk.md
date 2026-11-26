@section sdk-install

`cipi/sdk` is the **PHP client for the Cipi API**. From a Laravel app, a Symfony service or a plain script, one token calls the same surface as [cipi-cli](/docs/cli-client) and the [web panel](/docs/gui): apps, deploys, `cipi.yml`, domains, databases, backups and the server. It runs on your machine over HTTPS: no SSH, no shelling out to `cipi`.

```bash
$ composer require cipi/sdk
```

PHP 8.2+ with `ext-curl` and `ext-json`; Laravel optional. Source: [github.com/cipi-sh/sdk](https://github.com/cipi-sh/sdk) (MIT). The server needs [`cipi api`](/docs/api) and a token with only the abilities this code needs.

@section sdk-client

## Client {#client}

```php
use Cipi\Sdk\Cipi;

$cipi = Cipi::connect(
    baseUrl: 'https://api.example.com',   // "/api" suffix optional
    token: getenv('CIPI_TOKEN') ?: '',
);

$apps = $cipi->apps()->list();
$job  = $cipi->deploys()->start('shop');  // 202 + job_id
$done = $cipi->wait($job);                // polls until completed or failed
```

Reads return the JSON body as an array; writes return a job you can `wait()` on. Plain `http://` is refused unless you pass `['allow_http' => true]` (for a local panel).

@section sdk-laravel

## Laravel {#laravel}

Auto-discovered on Laravel 11, 12 and 13.

```bash
$ php artisan vendor:publish --tag=cipi-config
```

```bash
CIPI_BASE_URL=https://api.example.com
CIPI_TOKEN=
CIPI_TIMEOUT=30
```

```php
use Cipi\Sdk\Laravel\Facades\Cipi;

Cipi::apps()->list();
```

Or type-hint `Cipi\Sdk\Cipi`. The container holds one server; for another, call `Cipi::connect()` with its URL and token. Symfony and others register `Cipi::connect()` in their own container.

> [!tip] Install it next to [`cipi/agent`](/docs/mcp) and the app's MCP server gains panel tools: `panel_rollback`, `panel_deploy_audit`, `panel_db_backup`, `panel_job`, `panel_status`.

@section sdk-apps

## Apps {#apps}

```php
$cipi->wait($cipi->apps()->create([
    'user'       => 'shop',
    'domain'     => 'shop.example.com',
    'repository' => 'git@github.com:acme/shop.git',
    'branch'     => 'main',
    'php'        => '8.6',
    'env'        => 'production',
    'node_build' => 'npm ci && npm run build',
]));

$cipi->apps()->update('shop', ['php' => '8.6']);
$cipi->apps()->suspend('shop');  $cipi->apps()->unsuspend('shop');
$cipi->apps()->recreateWebhook('shop', rotateSecret: true);
$cipi->wait($cipi->limits()->update('shop', ['fpm_max_children' => 10, 'disk_limit_gb' => 5]));

$cipi->basicAuth()->enable('shop', 'admin');
$cipi->wait($cipi->artisan()->run('shop', 'migrate --force'));
$cipi->wait($cipi->run()->execute('shop', 'composer install --no-dev'));
$cipi->logs()->get('shop', 'deploy');
```

Create accepts the fields of `POST /api/apps`: `user` and `domain` required, plus `repository`, `branch`, `php`, `env`, `custom`, `octane`, `engine`, `node_build`, or Node fields. Invalid values throw `ValidationException` (422).

| Field | Rule |
| --- | --- |
| `env` | `^[a-z0-9][a-z0-9_-]{0,31}$`, default `production`; picks `cipi-<env>.yml` |
| `node_build` | Starts with `npm`, `npx`, `yarn`, `pnpm`, `bun` or `node`; `&&` and `;` allowed; no pipes, redirects or substitutions; max 200 characters |
| `limits()` | FPM children, `memory_limit`, Octane workers, queue workers, `disk_limit_gb` (soft, `null` removes it) |

After create (and edits that change repository or branch) the job result carries `repository_access`:

```php
$job = $cipi->wait($cipi->apps()->create($attributes));
$access = $job['data']['result']['repository_access'] ?? null;
if ($access && $access['status'] !== 'ok') {      // ok, nobranch or denied
    // $access['error'] is git's line, $access['hint'] the server command that fixes it
}
```

@section sdk-deploy

## Deploys, jobs and cipi.yml {#deploy}

```php
$cipi->wait($cipi->deploys()->start('shop'));
$cipi->deploys()->rollback('shop');
$cipi->deploys()->unlock('shop');               // also resumes a paused commit
$cipi->deploys()->audit('shop', days: 30);
$cipi->deploys()->status('shop', tail: 50);   // running, queued, interrupted, idle; paused_commit
$cipi->deploys()->history('shop', limit: 10);
$cipi->deploys()->last();                     // last run of every app
$cipi->deployConfig()->update('shop', ['keep_releases' => 5, 'migrate' => true]);

$cipi->jobs()->wait($job, timeoutSeconds: 120, intervalSeconds: 1.0);
```

`wait()` times out after 300 s by default and throws `JobFailedException` (payload on `$e->job`) when a job fails.

```php
$plan = $cipi->yml()->status('shop')['data'];      // file, env, valid, in_sync, changes, blockers
foreach ($plan['changes'] as $change) {
    echo $change['summary'], PHP_EOL;              // e.g. "PHP 8.5 → 8.6"
}
if ($plan['blockers'] === []) {
    $job = $cipi->jobs()->wait($cipi->yml()->apply('shop'), throwOnFailure: false);
    $outcome = $job['data']['result']['outcome'];  // applied, unchanged, partial, blocked, invalid, no-file
}
$cipi->yml()->enableAuto('shop');
```

> [!warning] With auto-apply on, anyone who can commit can change the app's aliases, PHP settings, limits, workers, deploy recipe, schedule, databases and backups. Ask for confirmation before enabling it for someone. Reads need `yml-view`, writes `yml-manage`.

@section sdk-domains

## Domains and SSL {#domains}

```php
$cipi->aliases()->add('shop', 'www.shop.example.com');
$cipi->www()->forceToRoot('shop');
$cipi->redirects()->set('shop', 'https://example.com', 301, keepPath: true);
$cipi->redirects()->add('shop', '/blog/', 'https://blog.example.com', 301, true);
$cipi->proxies()->add('shop', prefix: '/api/', upstream: 'http://127.0.0.1:3000', stripPrefix: true);
$cipi->ssl()->install('shop');
$cipi->ssl()->install('shop', dns: 'cloudflare', account: 'prod', wildcard: true);
$cipi->ssl()->setDnsAccount($cloudflareToken, 'prod');   // sync, never returned
```

Redirects and proxies are tested with `nginx -t` and reverted on failure; the proxy loopback guard can't be bypassed.

```php
$cipi->nginx()->show('shop')['data']['config'];                     // the app's own directives
$cipi->nginx()->update('shop', "client_max_body_size 512M;\n");     // sync: nginx -t, then reload
$cipi->nginx()->reset('shop');
```

`nginx()` reads and replaces [an app's own Nginx directives](/docs/nginx#custom). A refused text is a `ValidationException` (422) and changes nothing; from the API [a subset of the language](/docs/nginx#custom-api) is accepted. Node apps: `node()->status($app)`, `node()->restart($app)`.

```php
$cipi->cache()->enable('blog', ttl: '1h', size: '1g');   // nginx's page cache: sync, nginx -t first
$cipi->cache()->show('blog')['data'];                    // enabled, ttl, files, bytes, clear_command, …
$cipi->cache()->exclude('blog', ['/wishlist*', '/feed']);  // its own paths never cached: the whole list, [] for none
$cipi->cache()->clear('blog')['data']['cleared'];        // pages deleted
$cipi->cache()->disable('blog');
```

`cache()` is the [page cache](/docs/page-cache) of an app: Nginx keeps the page PHP made and answers the next visitors without running PHP — not OPcache, which is always on. Cipi empties it after every deploy; call `clear()` when content changes without one. `exclude()` sets the [paths of its own](/docs/page-cache#exclude) an app keeps out — `*` is anything — and `enable()` takes the same list as `exclude:`.

@section sdk-data

## Env, databases and backups {#data}

```php
$cipi->env()->update('shop', ['APP_ENV' => 'production'], ['TELESCOPE_ENABLED']);  // merge, unset
$cipi->env()->reorder('shop', $keysInOrder);   // every key once
$cipi->authJson()->replace('shop', ['http-basic' => ['repo.example.com' => ['username' => 'token', 'password' => $secret]]]);

$cipi->wait($cipi->databases()->create('shop_reports', 'pgsql', app: 'shop'));
$cipi->databases()->backup('shop');
$cipi->databases()->password('shop');
$cipi->databases()->link('legacy', 'shop');
$cipi->databases()->engines();                // engine, status, port; server/label: MySQL where it runs
$cipi->wait($cipi->databases()->restoreLocal('shop', __DIR__.'/shop.sql.gz'));   // chunked upload
```

`restoreLocal()` streams the dump in chunks (not bound by `memory_limit`) and cancels the upload if anything is refused. The panel deletes uploads when the restore ends.

```php
$cipi->backups()->createProfile('nightly', [
    'scope' => 'all', 'every' => '1d', 'destinations' => ['s3'], 'keep_days' => 14, 'encrypt' => true,
    'exclude_paths' => ['storage/app/uploads'],
]);
$cipi->backups()->status()['data']['uncovered'];   // what no enabled profile takes
$cipi->backups()->run('nightly');                  // starts and returns, not a job
$cipi->wait($cipi->backups()->verify('nightly'));
```

Destinations and their keys are configured on the server and never returned.

@section sdk-server

## Server {#server}

```php
$cipi->server()->status();
$cipi->php()->install('8.6');
$cipi->ssh()->add($publicKey);
$cipi->services()->restart('php8.6-fpm');
$cipi->health()->update('shop', 'https://shop.example.com/up', 200);
$cipi->search()->enable('shop');
$cipi->disk()->usage();
$cipi->metrics()->series('shop', ['req', 'http_5xx'], '7d');   // ~240 points of [ts, avg, max]
$cipi->metrics()->uptime('shop', '30d');
$cipi->metrics()->setHeartbeat('https://hc-ping.com/<uuid>', every: 1);
$cipi->notifications()->add('telegram', 'oncall', ['token' => $bot, 'chat_id' => '-1001234', 'test' => true]);
$cipi->notifications()->update('oncall', ['chat_id' => '-1009999']);   // the token is kept
$cipi->notifications()->setTriggers(['deploy_success' => false]);
$cipi->wait($cipi->node()->upgrade(24, restart: true));
$cipi->wait($cipi->packages()->install('browsershot'));
$cipi->ipWhitelist()->replace(['203.0.113.10'], ensureClientIp: true);
$cipi->request('GET', '/apps/shop');               // any endpoint not wrapped yet
```

```php
$o = $cipi->octane()->show('shop')['data'];           // php, octane_php, state, available_php, fix
$cipi->wait($cipi->octane()->php('shop', '8.6'));     // Octane and the server's PHP on 8.6, by its number
$cipi->wait($cipi->octane()->restart('shop'));

$cipi->valkey()->list()['data']['shared'];            // apps still on the shared Valkey
$cipi->wait($cipi->valkey()->isolateAll());           // each its own instance
$cipi->valkey()->flushShared();                       // then: empty the shared one, change its password

$cipi->notifications()->setTimezone('Europe/Rome');   // the Time line of every notification
$cipi->notifications()->setServerName('production');  // "production (vmi12334)"
```

`octane()` is [the PHP of an Octane app](/docs/octane#octane-php), `valkey()` is [Valkey per app](/docs/valkey#manage) — no password is ever returned — and the notification settings are [how notifications are written](/docs/notifications#written).

Monitor, Zero Trust and disk usage are read-only, as on the API. [Optional packages](/docs/packages) are listed, installed and removed (`packages()->list()`, `install()`, `remove()`): the catalog is closed and lives on the server.

@section sdk-security

## Security {#security}

| Protection | Detail |
| --- | --- |
| Transport | HTTPS with verification; redirects never followed, so the token stays on your host |
| Token | Only in the `Authorization` header; whitespace or control characters rejected (no header injection); stripped from exceptions and `var_dump` |
| Retries | Reads may retry `429`/`503` with a short `Retry-After`; writes never |
| Limits | Responses over 16 MiB refused; 30 s timeout, 10 s connect |

```php
$cipi = Cipi::connect($url, $token, [
    'timeout' => 30, 'connect_timeout' => 10, 'max_retries' => 2,
    'max_response_bytes' => 16777216, 'allow_http' => false,
]);
```

One token per application, smallest ability set, kept in the environment, never committed. A missing ability is a 403, never a silent no-op.

@section sdk-errors

## Errors {#errors}

| Status | Exception |
| --- | --- |
| 401 | `AuthenticationException` |
| 403 | `AuthorizationException` (missing ability, or IP allowlist) |
| 404 | `NotFoundException` |
| 409 | `ConflictException` |
| 422 | `ValidationException` (`errors()` with Laravel's bag) |
| 429 | `RateLimitException` (`retryAfter`) |
| 5xx | `ServerException` |
| none | `TransportException`, `ConfigurationException`; from `wait()`: `JobFailedException`, `TimeoutException` |

```php
try {
    $cipi->wait($cipi->deploys()->start('shop'));
} catch (JobFailedException $e) {
    $job = $e->job;
} catch (AuthorizationException $e) {
    // token lacks deploy-manage
}
```
