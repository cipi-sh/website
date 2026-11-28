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

`wait()` throws `JobFailedException` (payload on `$e->job`) when a job fails, and `TimeoutException` when the job is still running at the end of the wait: two hours for a deploy and for a transfer (`sync()->push()`) — as long as the panel lets one run, since a front-end build alone may take [30 minutes](/docs/deploying#time-limits), up to an hour where the app asks for it — and 300 s for every other job, unless you pass `timeoutSeconds`. The timeout ends the wait, not the job: `wait()` on the same id picks it up again.

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
$cipi->cache()->purge('blog', ['/hello-world/', '/category/news/*'])['data']['purged'];   // only those pages
$cipi->cache()->clear('blog')['data']['cleared'];        // pages deleted
$cipi->cache()->disable('blog');
```

`cache()` is the [page cache](/docs/page-cache) of an app: Nginx keeps the page PHP made and answers the next visitors without running PHP — not OPcache, which is always on. Cipi empties it after every deploy; call `purge()` with the pages that changed — a path, a prefix ending in `*`, a URL on a domain of the app, 500 at most — or `clear()` for all of them. Inside the app itself, the [WordPress plugin](/docs/page-cache#wordpress) and the [`cipi/cache` package](/docs/page-cache#php) purge without a token. `exclude()` sets the [paths of its own](/docs/page-cache#exclude) an app keeps out — `*` is anything — and `enable()` takes the same list as `exclude:`.

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

An SFTP server — a VPS with a backup user, a Hetzner Storage Box, a NAS — is added from here; Cipi makes its key on the server and returns the public half:

```php
$box = $cipi->backups()->addSftpDestination('box', 'u123456.your-storagebox.de', 'u123456', port: 23, path: 'cipi')['data'];
$box['public_key'];                                      // install it on the remote, then:
$cipi->backups()->testDestinations('box');              // a file written and removed there
$cipi->backups()->updateProfile('nightly', ['destinations' => ['local', 'box']]);
$cipi->backups()->updateSftpDestination('box', ['new_key' => true]);
$cipi->backups()->destinationKey('box');
$cipi->backups()->removeDestination('box');             // no profile may use it; its archives stay
```

Setting backups up — this server only, the default bucket or an SFTP server — more S3 buckets, the encryption key and the retention (cipi/api 1.49+, Cipi 5.19.0+; an SFTP setup 5.19.1+):

```php
$cipi->backups()->configureS3('acme-backups', 'AKIA…', $secret, endpoint: 'https://fsn1.your-objectstorage.com');
$setup = $cipi->backups()->configureSftp('u123456.your-storagebox.de', 'u123456', port: 23, path: 'cipi');
$setup['destination']['public_key'];                     // install it on the remote, then testDestinations('sftp')
$cipi->backups()->configureLocalOnly();                  // this server only

$cipi->backups()->addS3Destination('offsite', 'acme-offsite', 'AKIA…', $secret, 'auto', 'https://<account-id>.r2.cloudflarestorage.com');
$cipi->backups()->updateS3Destination('offsite', ['region' => 'eu-west-1']);   // a key or a secret left out stays
$cipi->backups()->encryptionKey()['data']['key'];       // keep it off the server; logged and notified there
$cipi->backups()->rotateKey();
$cipi->wait($cipi->backups()->prune(dryRun: true));     // what the retention would delete — a job
```

Every bucket is reached with its keys before it is saved: a wrong key is a `ValidationException` and changes nothing. A secret key goes to the server's CLI on its standard input — never on a command line, never in a job — and no answer carries a credential back. Downloading a run stays on the server. See [Backups from the panel](/docs/backups#panel) and [SFTP destinations](/docs/backups#sftp).

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

```php
$cipi->sync()->key();                                    // this server's sync key: what a target trusts
$cipi->sync()->ready('203.0.113.77');                    // key accepted there, Cipi answering
$cipi->wait($cipi->sync()->push('203.0.113.77', ['shop'], withDb: true));

$cipi->updates()->policy()['data'];                      // verify, delay_hours, signers, pending, held
$cipi->updates()->setPolicy(delayHours: 12);
$cipi->updates()->setPolicy(verify: true, fingerprint: 'SHA256:…');
```

`sync()` [moves apps to another server](/docs/sync): this server is the source, `push()` is a job (`sync-push`), and the target trusts the source's key first — `key()` here, `trust($key)` there (`untrust()` takes it back); `check()` says why the way isn't open. There's no passphrase to handle. Ability `sync-manage`, as strong as `ssh-manage`. `updates()` is [how the server updates Cipi](/docs/self-update): only signed releases (not available at the moment), a delay — both off by default; starting an update isn't in the API. Abilities `updates-view`, `updates-manage`.

`octane()` is [the PHP of an Octane app](/docs/octane#octane-php), `valkey()` is [Valkey per app](/docs/valkey#manage) — no password is ever returned — and the notification settings are [how notifications are written](/docs/notifications#written).

Monitor, the Cloudflare side of Zero Trust and disk usage are read-only, as on the API; the [mesh network](#zero-trust) is managed. [Optional packages](/docs/packages) are listed, installed and removed (`packages()->list()`, `install()`, `remove()`): the catalog is closed and lives on the server.

## Zero Trust {#zero-trust}

```php
$zt = $cipi->zeroTrust()->status()['data'];   // both sides: the Cloudflare tunnel and the mesh
$zt['enabled'];                               // the tunnel — says nothing of the mesh
$zt['mesh'];                                  // 'tailscale', 'netbird' or null
$zt['mesh_ip'];                               // the server's address on the network

$mesh = $cipi->zeroTrust()->mesh();           // details.mesh, or null while the server is on none
$mesh['lock']['ssh'];                         // port 22 closed to the world
$mesh['panel']['blocked']['lock_http'];       // null, or why the server would refuse it from here
```

The [mesh network](/docs/mesh-network) — Tailscale or NetBird — is managed too, with a token that has `zt-manage`. Synchronous; each call answers Zero Trust after the change (`data`) and what the CLI said (`message`):

```php
use Cipi\Sdk\Resources\ZeroTrust;

$cipi = new Cipi($url, $token, ['timeout' => 240]);   // a join installs the client and signs in

$cipi->zeroTrust()->joinMesh(ZeroTrust::TAILSCALE, $authKey, ['hostname' => 'web1', 'tags' => ['cipi']]);
$cipi->zeroTrust()->joinMesh(ZeroTrust::NETBIRD, $setupKey, ['control_url' => 'https://netbird.example.com']);
$cipi->zeroTrust()->lockMesh('ssh');          // 22 on the mesh only
$cipi->zeroTrust()->lockMesh('http');         // 80/443 on the mesh only
$cipi->zeroTrust()->unlockMesh('ssh');
$cipi->zeroTrust()->tailscaleSsh(true);
$cipi->zeroTrust()->leaveMesh();
```

Options of `joinMesh()`: `hostname`, `control_url`, `direct`, `accept_dns`, `accept_routes`, and for Tailscale `tags`, `ssh`, `reauth`. The key is sent once and is neither stored nor returned; without one, a client already connected on the server is adopted.

The server [refuses what would lock people out](/docs/mesh-network#panel-guards): a `ValidationException` whose message is the reason — nobody has signed in over the mesh yet, the node key can expire, your call reaches the API on the address the lock would close. Nothing is retried. The tunnel itself is changed with `cipi zt` on the server.

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
