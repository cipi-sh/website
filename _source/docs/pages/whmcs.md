@section whmcs

Sell Laravel and PHP hosting on your own servers. The official **WHMCS provisioning module** ([github.com/cipi-sh/whmcs](https://github.com/cipi-sh/whmcs), MIT) maps the WHMCS lifecycle to the [Cipi API](/docs/api): orders create apps, suspensions take them offline, terminations remove them. A self-contained drop-in, no Composer dependencies.

```flow
Order paid | WHMCS Create Account
> A customer pays an order in WHMCS and the product's module runs Create Account.
POST /api/apps | isolated app on Cipi
> The module calls the Cipi API (`POST /api/apps`), which creates an isolated app: user, database, PHP pool, vhost.
Auto-SSL | Let's Encrypt (optional)
> Optionally a Let's Encrypt certificate is issued once DNS points at the server.
Lifecycle | suspend, change package, terminate
> Suspend, unsuspend, change package and terminate in WHMCS call the matching Cipi API actions.
```

## Requirements {#requirements}

WHMCS 8.x, a Cipi server with [`cipi api`](/docs/api), and a token with these abilities:

| Ability | For |
| --- | --- |
| `apps-view` | Test Connection, App Info |
| `apps-create` | Create Account |
| `apps-edit` | Change Package |
| `apps-suspend` | Suspend, Unsuspend |
| `apps-delete` | Terminate |
| `deploy-manage` | Deploy, Rollback, Unlock |
| `ssl-manage` | Install SSL, Auto-SSL |

## Install {#install}

```tree
your-whmcs/
└── modules/servers/cipi/
    ├── cipi.php
    └── lib/CipiApiClient.php
```

1. Copy `modules/servers/cipi/` into your WHMCS root.
2. **System Settings → Servers → Add New Server**: type *Cipi (Laravel hosting)*, hostname = API base URL (no trailing slash), password = token, Secure = yes.
3. Create a hosting product on that server and set its module settings:

| Setting | Values | Default |
| --- | --- | --- |
| PHP Version | 8.3, 8.4, 8.5, 8.6 | server default |
| App Type | `laravel` or `custom` | `laravel` |
| Git Repository (SSH) | Required for Laravel, optional for custom | — |
| Git Branch | Branch to deploy | `main` |
| Auto SSL | Certificate right after creation | No |

| App type | Cipi equivalent | Good for |
| --- | --- | --- |
| `laravel` | `cipi app create` | Laravel apps with Deployer releases, workers, database |
| `custom` | `cipi app create --custom` | WordPress, static sites, SPAs, any PHP; Git optional (SFTP-only hosting) |

## Lifecycle {#lifecycle}

| WHMCS action | API call | Behaviour |
| --- | --- | --- |
| Test Connection | `GET /api/apps` | Token and reachability |
| Create Account | `POST /api/apps` | Provision, wait for the job, optional SSL |
| Suspend | `POST /api/apps/{name}/suspend` | 503 maintenance page, nothing deleted |
| Unsuspend | `POST /api/apps/{name}/unsuspend` | Normal vhost back |
| Change Package | `PUT /api/apps/{name}` | PHP, repository, branch |
| Terminate | `DELETE /api/apps/{name}` | Remove the app |

Admin buttons on the service page: **Install SSL**, **Deploy**, **Rollback Deploy**, **Unlock Deploy**, **App Info**. If Auto-SSL fails, the app is still created and a warning is logged. Every call is logged with `logModuleCall()` (Utilities → Logs → Module Log).

## Extend it {#extend}

The bundled `CipiApiClient` covers apps, deploys, SSL, aliases, databases and jobs, for your own hooks:

```php
require_once ROOTDIR . '/modules/servers/cipi/lib/CipiApiClient.php';
$client = new CipiApiClient('https://api.example.com', $token);
$client->addAlias('myapp', 'alias.example.com');
$client->createDatabase('myapp_extra');
$client->backupDatabase('myapp');
```

Designing the products (Laravel-ready VPS, managed app, instance per customer), plan limits from a WHMCS hook and pricing: [Cipi and WHMCS for hosting providers](/guides/hosting-providers-laravel-whmcs).

> [!note] The module adds no client-area tab. One-time secrets Cipi generates (SSH and database passwords, deploy key, webhook) aren't pushed to WHMCS: deliver them with a hook or your support workflow. For richer tooling use the [PHP SDK](/docs/php-sdk).
